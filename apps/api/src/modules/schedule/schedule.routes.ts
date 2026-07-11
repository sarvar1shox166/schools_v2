import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { dayOfWeekOf, todayStr, toDateStr } from "../../lib/schedule-dates.js";

const createSchema = z.object({
  groupId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  lessonType: z.enum(["guruh", "individual", "diagnostika"]).default("guruh"),
  customName: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(1).max(480).default(90),
  roomId: z.string().uuid().optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  meetingPlatform: z.enum(["zoom", "meet"]).default("zoom"),
  // To'ldirilsa, bu slot faqat shu sanada bo'ladi (bir martalik — masalan diagnostika),
  // haftalik takrorlanuvchi shablon sifatida ishlamaydi.
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const updateSchema = createSchema.partial();

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["cancelled", "rescheduled"]),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().optional(),
});

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/schedule", async (request) => {
    const { tenantId, role, sub } = request.user;

    const params: unknown[] = [tenantId];
    let studentFilter = "";
    if (role === "student") {
      studentFilter = `AND g.id IN (
        SELECT gm.group_id FROM group_members gm
        JOIN students s ON s.id = gm.student_id
        WHERE s.user_id = $2
      )`;
      params.push(sub);
    }

    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
              sl.room_id AS "roomId", r.name AS "roomName",
              COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              sl.meeting_platform AS "meetingPlatform",
              sl.lesson_type AS "lessonType", sl.custom_name AS "customName",
              COALESCE(tu2.full_name, tu.full_name) AS "teacherName"
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       LEFT JOIN teachers t2 ON t2.id = sl.teacher_id
       LEFT JOIN users tu2 ON tu2.id = t2.user_id
       WHERE sl.tenant_id = $1 ${studentFilter}
         AND (sl.specific_date IS NULL OR sl.specific_date >= CURRENT_DATE)
       ORDER BY sl.day_of_week, sl.start_time`,
      params
    );
    return rows;
  });

  app.get("/schedule/today", async (request) => {
    const { tenantId, role, sub } = request.user;
    // DB convention: 0=Mon, 1=Tue, ..., 6=Sun  (JS getDay: 0=Sun, 1=Mon)
    const dayOfWeek = dayOfWeekOf(new Date());
    const today = todayStr();

    // Butun maktab uchun bayram kuni bo'lsa — bugun hech kimda dars yo'q.
    const holidayRes = await pool.query(
      `SELECT 1 FROM schedule_exceptions WHERE tenant_id = $1 AND date = $2 AND kind = 'holiday'`,
      [tenantId, today]
    );
    if (holidayRes.rows.length > 0) return [];

    const params: unknown[] = [tenantId, dayOfWeek, today];
    let filter = "";
    let extraSelect = `NULL::uuid AS "lessonId", false AS "isEnded", false AS "isStarted"`;
    let extraJoin = "";
    if (role === "teacher") {
      filter = `AND (g.teacher_id = (SELECT id FROM teachers WHERE user_id = $4) OR sl.teacher_id = (SELECT id FROM teachers WHERE user_id = $4))`;
      params.push(sub);
      extraSelect = `l.id AS "lessonId", (l.id IS NOT NULL) AS "isEnded", (ta.id IS NOT NULL) AS "isStarted"`;
      extraJoin = `
        LEFT JOIN lessons l ON l.schedule_slot_id = sl.id AND l.conducted_at = CURRENT_DATE AND l.status = 'conducted'
        LEFT JOIN teacher_attendance ta ON ta.schedule_slot_id = sl.id AND ta.date = CURRENT_DATE
          AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = $4)`;
    } else if (role === "student") {
      filter = `AND g.id IN (
        SELECT gm.group_id FROM group_members gm
        JOIN students s ON s.id = gm.student_id
        WHERE s.user_id = $4
      )`;
      params.push(sub);
    }

    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
              sl.room_id AS "roomId", r.name AS "roomName",
              COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              sl.meeting_platform AS "meetingPlatform",
              sl.lesson_type AS "lessonType", sl.custom_name AS "customName",
              COALESCE(tu2.full_name, tu.full_name) AS "teacherName",
              ${extraSelect}
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       LEFT JOIN teachers t2 ON t2.id = sl.teacher_id
       LEFT JOIN users tu2 ON tu2.id = t2.user_id
       ${extraJoin}
       WHERE sl.tenant_id = $1
         AND (
           (sl.specific_date IS NULL AND sl.day_of_week = $2)
           OR sl.specific_date = $3
         )
         AND NOT EXISTS (
           SELECT 1 FROM schedule_exceptions se
           WHERE se.schedule_slot_id = sl.id AND se.date = $3 AND se.kind IN ('cancelled', 'rescheduled')
         )
         ${filter}
       ORDER BY sl.start_time`,
      params
    );
    return rows;
  });

  app.get("/me/schedule/next", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub, tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              sl.meeting_platform AS "meetingPlatform",
              tu.full_name AS "teacherName", tu.phone AS "teacherPhone"
       FROM schedule_slots sl
       JOIN groups g ON g.id = sl.group_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE g.id IN (
         SELECT gm.group_id FROM group_members gm
         JOIN students s ON s.id = gm.student_id
         WHERE s.user_id = $1
       )
       AND (sl.specific_date IS NULL OR sl.specific_date >= CURRENT_DATE)`,
      [sub]
    );

    const exceptionsRes = await pool.query(
      `SELECT schedule_slot_id AS "scheduleSlotId", date, kind
       FROM schedule_exceptions
       WHERE tenant_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day'
         AND kind IN ('cancelled', 'rescheduled', 'holiday')`,
      [tenantId]
    );
    const excepted = new Set(
      exceptionsRes.rows
        .filter((e) => e.kind === "holiday" || e.scheduleSlotId)
        .map((e) => `${e.scheduleSlotId ?? "holiday"}:${toDateStr(new Date(e.date))}`)
    );
    const holidayDates = new Set(
      exceptionsRes.rows.filter((e) => e.kind === "holiday").map((e) => toDateStr(new Date(e.date)))
    );
    function isExcepted(slotId: string, dateStr: string): boolean {
      return holidayDates.has(dateStr) || excepted.has(`${slotId}:${dateStr}`);
    }

    const now = new Date();
    let best: { row: (typeof rows)[number]; at: Date; endsAt: Date } | null = null;
    for (const row of rows) {
      const [h, m] = String(row.startTime).split(":").map(Number);
      const durationMin = row.durationMinutes ?? 90;

      if (row.specificDate) {
        // Bir martalik dars — faqat shu sanada, hech qachon boshqa haftaga surilmaydi.
        const dateStr = toDateStr(new Date(row.specificDate));
        if (isExcepted(row.id, dateStr)) continue;
        const candidate = new Date(dateStr + "T00:00:00");
        candidate.setHours(h, m, 0, 0);
        const candidateEnd = new Date(candidate.getTime() + durationMin * 60000);
        if (candidateEnd < now) continue; // o'tib ketgan bir martalik dars — endi hisobga olinmaydi
        const effectiveAt = candidate < now ? now : candidate;
        const bestEffectiveAt = best ? (best.at < now ? now : best.at) : null;
        if (!best || effectiveAt < bestEffectiveAt!) best = { row, at: candidate, endsAt: candidateEnd };
        continue;
      }

      // DB: 0=Mon..6=Sun; JS getDay: 0=Sun..6=Sat
      const nowDow = dayOfWeekOf(now);
      let dayDiff = (row.dayOfWeek - nowDow + 7) % 7;
      let candidate = new Date(now);
      candidate.setDate(now.getDate() + dayDiff);
      candidate.setHours(h, m, 0, 0);
      let candidateEnd = new Date(candidate.getTime() + durationMin * 60000);

      // Dars tugagan yoki shu kunga istisno (bekor/bayram) qo'yilgan bo'lsa — keyingi
      // haftaga (yoki undan keyingiga) suriladi, cheksiz aylanib qolmaslik uchun 8 hafta bilan cheklaymiz.
      let guard = 0;
      while (guard < 8 && (candidateEnd < now || isExcepted(row.id, toDateStr(candidate)))) {
        candidate.setDate(candidate.getDate() + 7);
        candidateEnd = new Date(candidate.getTime() + durationMin * 60000);
        guard++;
      }
      if (guard >= 8) continue; // 8 hafta ketma-ket istisno — amalda bo'lmaydi, xavfsizlik uchun

      const effectiveAt = candidate < now ? now : candidate;
      const bestEffectiveAt = best ? (best.at < now ? now : best.at) : null;
      if (!best || effectiveAt < bestEffectiveAt!) {
        best = { row, at: candidate, endsAt: candidateEnd };
      }
    }

    if (!best) return null;
    const isLive = best.at <= now && now < best.endsAt;
    return { ...best.row, nextAt: best.at.toISOString(), endsAt: best.endsAt.toISOString(), isLive };
  });

  app.get("/me/teacher-schedule", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { sub, tenantId } = request.user;
    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
    const teacherId = teacherRes.rows[0]?.id;
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.lesson_type AS "lessonType", sl.custom_name AS "customName",
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
              sl.room_id AS "roomId", r.name AS "roomName",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              sl.meeting_platform AS "meetingPlatform",
              COALESCE(gm.cnt, 0)::int AS "studentsCount"
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN (
         SELECT group_id, count(*) AS cnt FROM group_members GROUP BY group_id
       ) gm ON gm.group_id = g.id
       WHERE sl.tenant_id = $1 AND (g.teacher_id = $2 OR sl.teacher_id = $2)
         AND (sl.specific_date IS NULL OR sl.specific_date >= CURRENT_DATE)
       ORDER BY sl.day_of_week, sl.start_time`,
      [tenantId, teacherId]
    );

    const groupMap = new Map<
      string,
      { id: string; name: string; color: string | null; studentsCount: number; weeklyHours: number; slotsCount: number }
    >();
    for (const row of rows) {
      if (!row.groupId) continue; // individual/diagnostika slots have no group to summarize
      const existing = groupMap.get(row.groupId);
      const hours = (row.durationMinutes ?? 90) / 60;
      if (existing) {
        existing.weeklyHours += hours;
        existing.slotsCount += 1;
      } else {
        groupMap.set(row.groupId, {
          id: row.groupId,
          name: row.groupName,
          color: row.color,
          studentsCount: row.studentsCount,
          weeklyHours: hours,
          slotsCount: 1,
        });
      }
    }

    return {
      slots: rows,
      groups: Array.from(groupMap.values()),
    };
  });

  app.post("/schedule", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const isOnline = body.isOnline ?? false;
    const meetingUrl = body.meetingUrl || null;
    const { rows } = await pool.query(
      `INSERT INTO schedule_slots
         (tenant_id, group_id, teacher_id, lesson_type, custom_name, day_of_week, start_time, duration_minutes, room_id, is_online, meeting_url, meeting_platform, specific_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        tenantId,
        body.groupId ?? null,
        body.teacherId ?? null,
        body.lessonType ?? "guruh",
        body.customName ?? null,
        body.dayOfWeek,
        body.startTime,
        body.durationMinutes ?? 90,
        body.roomId ?? null,
        isOnline,
        meetingUrl,
        body.meetingPlatform ?? "zoom",
        body.specificDate ?? null,
      ]
    );
    const id = rows[0].id;
    if (isOnline && !meetingUrl) {
      const autoUrl = body.meetingPlatform === "meet"
        ? `https://meet.google.com/chess-school-${id.slice(0, 8)}`
        : `https://zoom.us/j/${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      await pool.query(`UPDATE schedule_slots SET meeting_url = $1 WHERE id = $2`, [autoUrl, id]);
    }
    return reply.code(201).send({ id });
  });

  app.patch("/schedule/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    let meetingUrl = body.meetingUrl || null;
    if (body.isOnline && !meetingUrl) {
      const existing = await pool.query(
        `SELECT meeting_url AS "meetingUrl", meeting_platform AS "meetingPlatform" FROM schedule_slots WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      const platform = body.meetingPlatform ?? existing.rows[0]?.meetingPlatform ?? "zoom";
      meetingUrl = existing.rows[0]?.meetingUrl ?? (
        platform === "meet"
          ? `https://meet.google.com/chess-school-${id.slice(0, 8)}`
          : `https://zoom.us/j/${Math.floor(Math.random() * 9000000000 + 1000000000)}`
      );
    }

    const { rowCount } = await pool.query(
      `UPDATE schedule_slots SET
         day_of_week      = COALESCE($1, day_of_week),
         start_time       = COALESCE($2, start_time),
         room_id          = COALESCE($3, room_id),
         is_online        = COALESCE($4, is_online),
         meeting_url      = COALESCE($5, meeting_url),
         lesson_type      = COALESCE($6, lesson_type),
         custom_name      = COALESCE($7, custom_name),
         meeting_platform = COALESCE($8, meeting_platform),
         teacher_id       = COALESCE($9, teacher_id),
         duration_minutes = COALESCE($10, duration_minutes),
         specific_date    = COALESCE($11, specific_date)
       WHERE id = $12 AND tenant_id = $13`,
      [
        body.dayOfWeek ?? null, body.startTime ?? null, body.roomId ?? null,
        body.isOnline ?? null, meetingUrl,
        body.lessonType ?? null, body.customName ?? null,
        body.meetingPlatform ?? null, body.teacherId ?? null,
        body.durationMinutes ?? null, body.specificDate ?? null, id, tenantId,
      ]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  app.delete("/schedule/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(`DELETE FROM schedule_slots WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // ── Bitta darsni bekor qilish / ko'chirish (haftalik shablonni o'zgartirmasdan) ──

  app.get("/schedule/exceptions", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request) => {
    const { tenantId } = request.user;
    const { from, to } = request.query as { from?: string; to?: string };
    const params: unknown[] = [tenantId];
    let range = "";
    if (from && to) {
      params.push(from, to);
      range = `AND se.date BETWEEN $2 AND $3`;
    }
    const { rows } = await pool.query(
      `SELECT se.id, se.schedule_slot_id AS "scheduleSlotId", se.date, se.kind,
              se.new_date AS "newDate", se.new_start_time AS "newStartTime", se.reason
       FROM schedule_exceptions se
       WHERE se.tenant_id = $1 ${range}
       ORDER BY se.date`,
      params
    );
    return rows;
  });

  app.post("/schedule/:id/exceptions", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = exceptionSchema.parse(request.body);
    const { tenantId, sub } = request.user;

    const slotRes = await pool.query(
      `SELECT id, specific_date AS "specificDate" FROM schedule_slots WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (slotRes.rows.length === 0) return reply.code(404).send({ error: "Not found" });
    if (slotRes.rows[0].specificDate) {
      return reply.code(400).send({ error: "Bir martalik darsni bekor qilish uchun uni o'chiring, istisno kerak emas" });
    }
    if (body.kind === "rescheduled" && (!body.newDate || !body.newStartTime)) {
      return reply.code(400).send({ error: "Ko'chirish uchun yangi sana va vaqt kerak" });
    }

    const { rows } = await pool.query(
      `INSERT INTO schedule_exceptions (tenant_id, schedule_slot_id, date, kind, new_date, new_start_time, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (schedule_slot_id, date) DO UPDATE SET
         kind = EXCLUDED.kind, new_date = EXCLUDED.new_date,
         new_start_time = EXCLUDED.new_start_time, reason = EXCLUDED.reason
       RETURNING id`,
      [tenantId, id, body.date, body.kind, body.newDate ?? null, body.newStartTime ?? null, body.reason ?? null, sub]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.delete("/schedule/exceptions/:exceptionId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { exceptionId } = request.params as { exceptionId: string };
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(
      `DELETE FROM schedule_exceptions WHERE id = $1 AND tenant_id = $2 AND kind != 'holiday'`,
      [exceptionId, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // ── Butun maktab uchun bayram/dam olish kuni ──

  app.post("/schedule/holidays", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = holidaySchema.parse(request.body);
    const { tenantId, sub } = request.user;
    const { rows } = await pool.query(
      `INSERT INTO schedule_exceptions (tenant_id, schedule_slot_id, date, kind, reason, created_by)
       VALUES ($1, NULL, $2, 'holiday', $3, $4)
       ON CONFLICT (tenant_id, date) WHERE kind = 'holiday' DO UPDATE SET reason = EXCLUDED.reason
       RETURNING id`,
      [tenantId, body.date, body.reason ?? null, sub]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.delete("/schedule/holidays/:holidayId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { holidayId } = request.params as { holidayId: string };
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(
      `DELETE FROM schedule_exceptions WHERE id = $1 AND tenant_id = $2 AND kind = 'holiday'`,
      [holidayId, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // ── Haftalik shablonni haqiqiy sanalarga yoyish (haftalik/kalendar UI uchun) ──
  // Takrorlanuvchi (guruh) darslarni [from, to] oralig'idagi har bir mos sanaga joylaydi,
  // bir martalik (individual/diagnostika) darslarni o'z specific_date'ida qoldiradi,
  // bekor qilingan/bayram kunlarini chiqarib tashlaydi, ko'chirilganlarni yangi sanaga ko'chiradi.
  app.get("/schedule/occurrences", async (request, reply) => {
    const { tenantId, role, sub } = request.user;
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return reply.code(400).send({ error: "from/to (YYYY-MM-DD) required" });
    }

    const params: unknown[] = [tenantId];
    let roleFilter = "";
    if (role === "student") {
      roleFilter = `AND g.id IN (SELECT gm.group_id FROM group_members gm JOIN students s ON s.id = gm.student_id WHERE s.user_id = $2)`;
      params.push(sub);
    } else if (role === "teacher") {
      roleFilter = `AND (g.teacher_id = (SELECT id FROM teachers WHERE user_id = $2) OR sl.teacher_id = (SELECT id FROM teachers WHERE user_id = $2))`;
      params.push(sub);
    }

    const slotsRes = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
              sl.room_id AS "roomId", r.name AS "roomName",
              COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              sl.meeting_platform AS "meetingPlatform",
              sl.lesson_type AS "lessonType", sl.custom_name AS "customName",
              COALESCE(tu2.full_name, tu.full_name) AS "teacherName"
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       LEFT JOIN teachers t2 ON t2.id = sl.teacher_id
       LEFT JOIN users tu2 ON tu2.id = t2.user_id
       WHERE sl.tenant_id = $1 ${roleFilter}`,
      params
    );

    const exceptionsRes = await pool.query(
      `SELECT id, schedule_slot_id AS "scheduleSlotId", date, kind,
              new_date AS "newDate", new_start_time AS "newStartTime"
       FROM schedule_exceptions
       WHERE tenant_id = $1 AND (date BETWEEN $2 AND $3 OR new_date BETWEEN $2 AND $3)`,
      [tenantId, from, to]
    );

    const holidaySet = new Set(exceptionsRes.rows.filter((e) => e.kind === "holiday").map((e) => e.date as string));
    const exceptionsBySlotDate = new Map<string, (typeof exceptionsRes.rows)[number]>();
    for (const e of exceptionsRes.rows) {
      if (e.scheduleSlotId) exceptionsBySlotDate.set(`${e.scheduleSlotId}:${e.date}`, e);
    }

    type OccSlot = (typeof slotsRes.rows)[number] & { occurrenceDate: string; startTime: string; exceptionKind?: string };
    const occurrencesByDate = new Map<string, OccSlot[]>();
    function addOcc(date: string, slot: (typeof slotsRes.rows)[number], overrideTime?: string, exceptionKind?: string) {
      if (holidaySet.has(date)) return;
      const arr = occurrencesByDate.get(date) ?? [];
      arr.push({ ...slot, occurrenceDate: date, startTime: overrideTime ?? slot.startTime, exceptionKind });
      occurrencesByDate.set(date, arr);
    }

    for (const slot of slotsRes.rows) {
      if (slot.specificDate) {
        const d = String(slot.specificDate).slice(0, 10);
        if (d >= from && d <= to) addOcc(d, slot);
        continue;
      }
      for (let cur = new Date(from + "T00:00:00"); cur <= new Date(to + "T00:00:00"); cur.setDate(cur.getDate() + 1)) {
        if (dayOfWeekOf(cur) !== slot.dayOfWeek) continue;
        const dateStr = toDateStr(cur);
        const exc = exceptionsBySlotDate.get(`${slot.id}:${dateStr}`);
        // Bekor qilingan bo'lsa ham ro'yxatda qoladi (chizib ko'rsatish uchun) — aks holda
        // admin uni bosib qayta tiklay olmay qoladi. Ko'chirilgan bo'lsa asl sanada
        // ko'rsatilmaydi, yangi sanada quyida qo'shiladi.
        if (exc?.kind === "rescheduled") continue;
        addOcc(dateStr, slot, undefined, exc?.kind === "cancelled" ? "cancelled" : undefined);
      }
    }
    for (const e of exceptionsRes.rows) {
      if (e.kind !== "rescheduled" || !e.newDate) continue;
      const slot = slotsRes.rows.find((s) => s.id === e.scheduleSlotId);
      if (!slot) continue;
      const newDateStr = String(e.newDate).slice(0, 10);
      if (newDateStr >= from && newDateStr <= to) addOcc(newDateStr, slot, e.newStartTime, "rescheduled");
    }

    return [...occurrencesByDate.entries()]
      .map(([date, occSlots]) => ({
        date,
        slots: occSlots.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}
