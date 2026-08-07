import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { consumeLesson, refundLesson } from "../payments/lessons.js";
import { createNotification } from "../notifications/notify.js";
import { recordLessonSession } from "../payroll/lesson-sessions.js";
import { assignedTeacherIds } from "../../lib/moderator.js";
import { bumpAttendanceStreak, checkAchievements } from "../gamification/xp.js";

const querySchema = z.object({
  scheduleSlotId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const markSchema = z.object({
  scheduleSlotId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(["p", "a", "l", "ae"]),
      reason: z.string().optional(),
    })
  ),
});

const teacherMarkSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(
    z.object({
      scheduleSlotId: z.string().uuid(),
      teacherId: z.string().uuid(),
      status: z.enum(["p", "a", "l"]),
    })
  ),
});

const joinSchema = z.object({
  scheduleSlotId: z.string().uuid(),
});

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dowFromDate(date: string): number {
  return (new Date(date + "T00:00:00").getDay() + 6) % 7;
}

// 'ae' = sababli yo'qlik. Dars hisoblanmaydi.
// 'p', 'a', 'l' = dars hisoblanadi (paketdan ayiriladi).
const isCounted = (s: string) => s !== "ae";

export async function attendanceRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/attendance", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] }, async (request) => {
    const { scheduleSlotId, date } = querySchema.parse(request.query);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT ar.student_id AS "studentId", ar.status, ar.reason, ar.lesson_counted AS "lessonCounted"
       FROM attendance_records ar
       JOIN schedule_slots sl ON sl.id = ar.schedule_slot_id
       WHERE ar.schedule_slot_id = $1 AND ar.date = $2 AND sl.tenant_id = $3`,
      [scheduleSlotId, date, tenantId]
    );
    return rows;
  });

  app.get(
    "/attendance/stats",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const { date } = request.query as { date?: string };
      const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

      const params: unknown[] = [tenantId, targetDate];
      let moderatorFilter = "";
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        moderatorFilter = `AND COALESCE(sl.teacher_id, g.teacher_id) = ANY($3::uuid[])`;
        params.push(ids);
      }

      const { rows } = await pool.query(
        `SELECT ar.status, COUNT(*)::int AS count
         FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         JOIN schedule_slots sl ON sl.id = ar.schedule_slot_id
         LEFT JOIN groups g ON g.id = sl.group_id
         WHERE s.tenant_id = $1 AND ar.date = $2
         ${moderatorFilter}
         GROUP BY ar.status`,
        params
      );

      const counts = { p: 0, a: 0, l: 0, ae: 0 };
      for (const r of rows) counts[r.status as keyof typeof counts] = Number(r.count);
      const total = counts.p + counts.a + counts.l + counts.ae;
      const avgPercent = total > 0 ? Math.round((counts.p / total) * 100) : 0;

      return {
        date: targetDate,
        avgPercent,
        present: counts.p,
        late: counts.l,
        absent: counts.a,
        excused: counts.ae,
        total,
      };
    }
  );

  app.get(
    "/attendance/history",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request, reply) => {
      const { tenantId, role, sub } = request.user;
      const { groupId, days } = request.query as { groupId?: string; days?: string };
      if (!groupId) return reply.code(400).send({ error: "groupId is required" });
      const numDays = Math.min(Math.max(Number(days) || 8, 1), 31);

      const groupRes = await pool.query(`SELECT id, teacher_id AS "teacherId" FROM groups WHERE id = $1 AND tenant_id = $2`, [groupId, tenantId]);
      if (groupRes.rows.length === 0) return reply.code(404).send({ error: "Group not found" });
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        if (!ids.includes(groupRes.rows[0].teacherId)) return reply.code(403).send({ error: "Forbidden" });
      }

      const studentsRes = await pool.query(
        `SELECT s.id, u.full_name AS "fullName"
         FROM group_members gm
         JOIN students s ON s.id = gm.student_id
         JOIN users u ON u.id = s.user_id
         WHERE gm.group_id = $1
         ORDER BY u.full_name`,
        [groupId]
      );

      const dates: string[] = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }

      const recordsRes = await pool.query(
        `SELECT ar.student_id AS "studentId", ar.date, ar.status
         FROM attendance_records ar
         JOIN schedule_slots ss ON ss.id = ar.schedule_slot_id
         WHERE ss.group_id = $1 AND ar.date >= $2 AND ar.date <= $3`,
        [groupId, dates[0], dates[dates.length - 1]]
      );

      const recordMap = new Map<string, Map<string, "p" | "a" | "l" | "ae">>();
      for (const r of recordsRes.rows) {
        const dateKey = new Date(r.date).toISOString().slice(0, 10);
        if (!recordMap.has(r.studentId)) recordMap.set(r.studentId, new Map());
        recordMap.get(r.studentId)!.set(dateKey, r.status);
      }

      const students = studentsRes.rows.map((s) => {
        const studentRecords = recordMap.get(s.id) ?? new Map();
        const days = dates.map((d) => studentRecords.get(d) ?? null);
        let present = 0;
        let counted = 0;
        for (const status of studentRecords.values()) {
          counted++;
          if (status === "p") present++;
        }
        const percent = counted > 0 ? Math.round((present / counted) * 100) : 0;
        return { studentId: s.id, fullName: s.fullName, days, percent };
      });

      return { dates, students };
    }
  );

  app.get("/me/attendance-history", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub } = request.user;
    const { rows } = await pool.query(
      `SELECT ar.date, ar.status
       FROM attendance_records ar
       JOIN students s ON s.id = ar.student_id
       WHERE s.user_id = $1
       ORDER BY ar.date DESC
       LIMIT 30`,
      [sub]
    );

    const totals = { p: 0, a: 0, l: 0, ae: 0 };
    for (const r of rows) totals[r.status as keyof typeof totals]++;
    const total = rows.length;
    const pct = total > 0 ? Math.round((totals.p / total) * 100) : 0;

    return { records: rows, totals, percent: pct };
  });

  app.post(
    "/attendance",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request, reply) => {
      const body = markSchema.parse(request.body);
      const userId = request.user.sub;
      const { tenantId, role } = request.user;

      if (role === "moderator") {
        const slotRes = await pool.query(
          `SELECT COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId"
           FROM schedule_slots sl LEFT JOIN groups g ON g.id = sl.group_id
           WHERE sl.id = $1 AND sl.tenant_id = $2`,
          [body.scheduleSlotId, tenantId]
        );
        const ids = await assignedTeacherIds(tenantId!, userId);
        if (!slotRes.rows[0] || !ids.includes(slotRes.rows[0].teacherId)) {
          return reply.code(403).send({ error: "Forbidden" });
        }
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const r of body.records) {
          // Bir xil student/slot/sana uchun parallel so'rovlarni serializatsiya qilamiz —
          // aks holda ikkita bir vaqtdagi chaqiruv dars kreditini ikki marta yechishi mumkin.
          await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [
            `attendance:${r.studentId}:${body.scheduleSlotId}:${body.date}`,
          ]);

          const existing = await client.query(
            `SELECT status, student_package_id AS "studentPackageId" FROM attendance_records
             WHERE student_id = $1 AND schedule_slot_id = $2 AND date = $3`,
            [r.studentId, body.scheduleSlotId, body.date]
          );
          const oldStatus = existing.rows[0]?.status as string | undefined;
          const oldPackageId = existing.rows[0]?.studentPackageId as string | null | undefined;
          const oldCounted = oldStatus ? isCounted(oldStatus) : false;
          const newCounted = isCounted(r.status);

          let newPackageId: string | null = oldCounted ? (oldPackageId ?? null) : null;

          if (!oldCounted && newCounted) {
            newPackageId = await consumeLesson(client, r.studentId);
            if (!newPackageId && tenantId) {
              // Paket yo'q — adminlarga ogohlantirish
              const studentRes = await client.query(
                `SELECT u.full_name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
                [r.studentId]
              );
              const studentName = studentRes.rows[0]?.full_name ?? "O'quvchi";
              const adminRes = await client.query(
                `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin','super_admin')`,
                [tenantId]
              );
              for (const admin of adminRes.rows) {
                await createNotification(client, {
                  tenantId,
                  userId: admin.id,
                  type: "no_package",
                  icon: "alert",
                  title: "To'lov talab qilinadi",
                  body: `${studentName} davomatga belgilandi, lekin faol paketi yo'q. To'lovni rasmiylashtiring.`,
                });
              }
            }
          } else if (oldCounted && !newCounted) {
            await refundLesson(client, r.studentId, oldPackageId);
            newPackageId = null;
          }

          await client.query(
            `INSERT INTO attendance_records
               (student_id, schedule_slot_id, date, status, reason, lesson_counted, marked_by, student_package_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (student_id, schedule_slot_id, date)
             DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason,
               lesson_counted = EXCLUDED.lesson_counted, marked_by = EXCLUDED.marked_by,
               student_package_id = EXCLUDED.student_package_id`,
            [r.studentId, body.scheduleSlotId, body.date, r.status, r.reason ?? null, newCounted, userId, newPackageId]
          );

          await bumpAttendanceStreak(client, r.studentId, body.date, r.status);
          await checkAchievements(client, r.studentId);
        }
        await recordLessonSession(client, body.scheduleSlotId, body.date);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      return { ok: true };
    }
  );

  // ── O'qituvchi davomati (faqat statistika/hisobot — payrollga ta'sir qilmaydi) ──

  app.get(
    "/attendance/teacher/stats",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const { date } = request.query as { date?: string };
      const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

      const params: unknown[] = [tenantId, targetDate];
      let moderatorFilter = "";
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        moderatorFilter = `AND teacher_id = ANY($3::uuid[])`;
        params.push(ids);
      }

      const { rows } = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM teacher_attendance
         WHERE tenant_id = $1 AND date = $2
         ${moderatorFilter}
         GROUP BY status`,
        params
      );

      const counts = { p: 0, a: 0, l: 0 };
      for (const r of rows) counts[r.status as keyof typeof counts] = Number(r.count);
      const total = counts.p + counts.a + counts.l;
      const avgPercent = total > 0 ? Math.round((counts.p / total) * 100) : 0;

      return {
        date: targetDate,
        avgPercent,
        present: counts.p,
        late: counts.l,
        absent: counts.a,
        total,
      };
    }
  );

  app.get(
    "/attendance/teacher/history",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const { days } = request.query as { days?: string };
      const numDays = Math.min(Math.max(Number(days) || 8, 1), 31);

      const dates: string[] = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const fromDate = dates[0];
      const toDate = dates[dates.length - 1];

      const slotParams: unknown[] = [tenantId, fromDate, toDate];
      let slotFilter = "";
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        slotFilter = `AND COALESCE(sl.teacher_id, g.teacher_id) = ANY($4::uuid[])`;
        slotParams.push(ids);
      }

      // Har bir haftalik (yoki bir martalik) slot alohida qator bo'ladi — bir
      // o'qituvchining bir kunda bir nechta guruhi bo'lsa, ular endi bittasi
      // ikkinchisini bekor qilib/yashirib qo'ymaydi (avvalgi xato shu edi).
      const slotsRes = await pool.query(
        `SELECT sl.id AS "scheduleSlotId", COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
                u.full_name AS "fullName", t.title, t.spec,
                sl.day_of_week AS "dayOfWeek", sl.specific_date AS "specificDate",
                g.name AS "groupName", sl.custom_name AS "customName"
         FROM schedule_slots sl
         LEFT JOIN groups g ON g.id = sl.group_id
         JOIN teachers t ON t.id = COALESCE(sl.teacher_id, g.teacher_id)
         JOIN users u ON u.id = t.user_id
         WHERE sl.tenant_id = $1
           AND (sl.specific_date IS NULL OR (sl.specific_date >= $2 AND sl.specific_date <= $3))
           ${slotFilter}
         ORDER BY u.full_name, sl.day_of_week, sl.start_time`,
        slotParams
      );

      const exceptionsRes = await pool.query(
        `SELECT schedule_slot_id AS "scheduleSlotId", date, kind
         FROM schedule_exceptions
         WHERE tenant_id = $1 AND date >= $2 AND date <= $3 AND kind IN ('cancelled', 'holiday')`,
        [tenantId, fromDate, toDate]
      );
      const holidaySet = new Set(
        exceptionsRes.rows.filter((e) => e.kind === "holiday").map((e) => new Date(e.date).toISOString().slice(0, 10))
      );
      const cancelledSet = new Set(
        exceptionsRes.rows.filter((e) => e.kind === "cancelled").map((e) => `${e.scheduleSlotId}:${new Date(e.date).toISOString().slice(0, 10)}`)
      );

      const recordsRes = await pool.query(
        `SELECT teacher_id AS "teacherId", schedule_slot_id AS "scheduleSlotId", date, status
         FROM teacher_attendance
         WHERE tenant_id = $1 AND date >= $2 AND date <= $3`,
        [tenantId, fromDate, toDate]
      );
      const recordMap = new Map<string, "p" | "a" | "l">();
      for (const r of recordsRes.rows) {
        recordMap.set(`${r.scheduleSlotId}:${new Date(r.date).toISOString().slice(0, 10)}`, r.status);
      }

      const rows = slotsRes.rows.map((slot) => {
        const dayOfWeek: number = slot.dayOfWeek;
        const specificDate: string | null = slot.specificDate ? new Date(slot.specificDate).toISOString().slice(0, 10) : null;
        const dayStatuses = dates.map((d) => {
          const occurs = specificDate ? specificDate === d : dayOfWeek === dowFromDate(d);
          if (!occurs) return null;
          if (holidaySet.has(d) || cancelledSet.has(`${slot.scheduleSlotId}:${d}`)) return null;
          return recordMap.get(`${slot.scheduleSlotId}:${d}`) ?? null;
        });
        const marked = dayStatuses.filter((s): s is "p" | "a" | "l" => s !== null);
        const present = marked.filter((s) => s === "p").length;
        const percent = marked.length > 0 ? Math.round((present / marked.length) * 100) : 0;
        return {
          teacherId: slot.teacherId, scheduleSlotId: slot.scheduleSlotId,
          fullName: slot.fullName, title: slot.title, spec: slot.spec,
          groupLabel: slot.groupName ?? slot.customName ?? "Dars",
          days: dayStatuses, percent,
        };
      });

      return { dates, rows };
    }
  );

  app.get(
    "/attendance/teacher/day-slots",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request, reply) => {
      const { tenantId, role, sub } = request.user;
      const { date } = request.query as { date?: string };
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ error: "date is required" });
      const dayOfWeek = dowFromDate(date);

      const holidayRes = await pool.query(
        `SELECT 1 FROM schedule_exceptions WHERE tenant_id = $1 AND date = $2 AND kind = 'holiday'`,
        [tenantId, date]
      );
      if (holidayRes.rows.length > 0) return { date, dayOfWeek, slots: [] };

      const { rows } = await pool.query(
        `SELECT sl.id AS "scheduleSlotId",
                COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
                COALESCE(tu2.full_name, tu.full_name) AS "teacherName",
                COALESCE(t2.title, t.title) AS "teacherTitle",
                COALESCE(t2.spec, t.spec) AS "teacherSpec",
                sl.group_id AS "groupId", g.name AS "groupName",
                sl.lesson_type AS "lessonType", sl.custom_name AS "customName",
                sl.start_time AS "startTime",
                COALESCE(gm.cnt, 0)::int AS "studentsCount",
                ta.status
         FROM schedule_slots sl
         LEFT JOIN groups g ON g.id = sl.group_id
         LEFT JOIN teachers t ON t.id = g.teacher_id
         LEFT JOIN users tu ON tu.id = t.user_id
         LEFT JOIN teachers t2 ON t2.id = sl.teacher_id
         LEFT JOIN users tu2 ON tu2.id = t2.user_id
         LEFT JOIN (SELECT group_id, count(*) AS cnt FROM group_members GROUP BY group_id) gm ON gm.group_id = sl.group_id
         LEFT JOIN teacher_attendance ta ON ta.schedule_slot_id = sl.id AND ta.date = $2
           AND ta.teacher_id = COALESCE(sl.teacher_id, g.teacher_id)
         WHERE sl.tenant_id = $1
           AND (
             (sl.specific_date IS NULL AND sl.day_of_week = $3)
             OR sl.specific_date = $2
           )
           AND NOT EXISTS (
             SELECT 1 FROM schedule_exceptions se
             WHERE se.schedule_slot_id = sl.id AND se.date = $2 AND se.kind IN ('cancelled', 'rescheduled')
           )
         ORDER BY sl.start_time`,
        [tenantId, date, dayOfWeek]
      );

      let slots = rows.filter((r) => r.teacherId != null);
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        slots = slots.filter((r) => ids.includes(r.teacherId));
      }
      return { date, dayOfWeek, slots };
    }
  );

  // O'qituvchi "kelmadi" deb belgilangan, lekin hali bekor qilinmagan/ko'chirilmagan
  // darslar — bu ro'yxat bo'sh bo'lishi kerak: har bir "kelmadi" oxir-oqibat
  // schedule_exceptions bilan hal qilinishi kutiladi (2-variant: ixtiyoriy, lekin kuzatiladi).
  app.get(
    "/attendance/teacher/unresolved-absences",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;

      const params: unknown[] = [tenantId];
      let filter = "";
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        filter = `AND ta.teacher_id = ANY($2::uuid[])`;
        params.push(ids);
      }

      const { rows } = await pool.query(
        `SELECT ta.schedule_slot_id AS "scheduleSlotId", ta.teacher_id AS "teacherId",
                to_char(ta.date, 'YYYY-MM-DD') AS "date",
                u.full_name AS "teacherName", sl.start_time AS "startTime",
                COALESCE(g.name, sl.custom_name, 'Dars') AS "groupLabel"
         FROM teacher_attendance ta
         JOIN schedule_slots sl ON sl.id = ta.schedule_slot_id
         LEFT JOIN groups g ON g.id = sl.group_id
         JOIN teachers t ON t.id = ta.teacher_id
         JOIN users u ON u.id = t.user_id
         WHERE ta.tenant_id = $1 AND ta.status = 'a'
           AND ta.date >= CURRENT_DATE - INTERVAL '30 days'
           ${filter}
           AND NOT EXISTS (
             SELECT 1 FROM schedule_exceptions se
             WHERE se.schedule_slot_id = ta.schedule_slot_id AND se.date = ta.date
               AND se.kind IN ('cancelled', 'rescheduled')
           )
         ORDER BY ta.date DESC`,
        params
      );
      return rows;
    }
  );

  app.post(
    "/attendance/teacher",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "moderator", "teacher")] },
    async (request, reply) => {
      const body = teacherMarkSchema.parse(request.body);
      const { tenantId, role } = request.user;
      const userId = request.user.sub;

      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, userId);
        if (body.records.some((r) => !ids.includes(r.teacherId))) {
          return reply.code(403).send({ error: "Forbidden" });
        }
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const r of body.records) {
          await client.query(
            `INSERT INTO teacher_attendance (tenant_id, teacher_id, schedule_slot_id, date, status, marked_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (teacher_id, schedule_slot_id, date)
             DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
            [tenantId, r.teacherId, r.scheduleSlotId, body.date, r.status, userId]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      return { ok: true };
    }
  );

  // ── Darsni boshlash (link ochish) — avtomatik davomat belgilash ──────────────
  // Mavjud (qo'lda belgilangan) yozuvni ustidan yozmaydi — faqat bo'sh joyni to'ldiradi.

  app.post("/me/attendance/join", { onRequest: [app.requireRole("student")] }, async (request) => {
    const body = joinSchema.parse(request.body);
    const { sub, tenantId } = request.user;
    const date = todayStr();

    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [sub]);
    const studentId = studentRes.rows[0]?.id;
    if (!studentId) return { ok: false };

    const slotCheck = await pool.query(
      `SELECT sl.id FROM schedule_slots sl
       LEFT JOIN group_members gm ON gm.group_id = sl.group_id AND gm.student_id = $1
       WHERE sl.id = $2 AND sl.tenant_id = $3 AND (gm.student_id IS NOT NULL OR sl.student_id = $1)`,
      [studentId, body.scheduleSlotId, tenantId]
    );
    if (!slotCheck.rows[0]) return { ok: false };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO attendance_records (student_id, schedule_slot_id, date, status, lesson_counted, marked_by, student_package_id)
         VALUES ($1, $2, $3, 'p', true, NULL, $4)
         ON CONFLICT (student_id, schedule_slot_id, date) DO NOTHING
         RETURNING id`,
        [studentId, body.scheduleSlotId, date, null]
      );
      if (inserted.rows.length > 0) {
        const consumed = await consumeLesson(client, studentId);
        await client.query(
          `UPDATE attendance_records SET student_package_id = $1 WHERE id = $2`,
          [consumed, inserted.rows[0].id]
        );
        if (!consumed && tenantId) {
          const studentNameRes = await client.query(
            `SELECT u.full_name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
            [studentId]
          );
          const studentName = studentNameRes.rows[0]?.full_name ?? "O'quvchi";
          const adminRes = await client.query(
            `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin','super_admin')`,
            [tenantId]
          );
          for (const admin of adminRes.rows) {
            await createNotification(client, {
              tenantId,
              userId: admin.id,
              type: "no_package",
              icon: "alert",
              title: "To'lov talab qilinadi",
              body: `${studentName} darsga kirdi, lekin faol paketi yo'q. To'lovni rasmiylashtiring.`,
            });
          }
        }
        await recordLessonSession(client, body.scheduleSlotId, date);
        await bumpAttendanceStreak(client, studentId, date, "p");
        await checkAchievements(client, studentId);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { ok: true };
  });

  app.post("/me/teacher-attendance/join", { onRequest: [app.requireRole("teacher")] }, async (request) => {
    const body = joinSchema.parse(request.body);
    const { sub, tenantId } = request.user;
    const date = todayStr();

    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
    const teacherId = teacherRes.rows[0]?.id;
    if (!teacherId) return { ok: false };

    const slotRes = await pool.query(
      `SELECT sl.lesson_type FROM schedule_slots sl LEFT JOIN groups g ON g.id = sl.group_id
       WHERE sl.id = $1 AND sl.tenant_id = $2 AND COALESCE(sl.teacher_id, g.teacher_id) = $3`,
      [body.scheduleSlotId, tenantId, teacherId]
    );
    if (!slotRes.rows[0]) return { ok: false };
    const lessonType = slotRes.rows[0]?.lesson_type as string | undefined;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO teacher_attendance (tenant_id, teacher_id, schedule_slot_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, 'p', NULL)
         ON CONFLICT (teacher_id, schedule_slot_id, date) DO NOTHING`,
        [tenantId, teacherId, body.scheduleSlotId, date]
      );
      // Individual/diagnostika darslarda o'quvchi bo'yicha davomat yozilmaydi (hali
      // o'quvchi emas yoki guruhga bog'lanmagan), shuning uchun payroll uchun dars
      // sessiyasi shu yerda — o'qituvchi darsga kirganda — qayd etiladi. Guruh darslari
      // esa /attendance orqali (o'quvchilar soniga qarab) hisoblanadi.
      if (lessonType && lessonType !== "guruh") {
        await recordLessonSession(client, body.scheduleSlotId, date);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { ok: true };
  });
}
