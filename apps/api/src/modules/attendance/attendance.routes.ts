import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { consumeLesson, refundLesson } from "../payments/lessons.js";
import { recordLessonSession } from "../payroll/lesson-sessions.js";

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
      status: z.enum(["p", "a", "l"]),
    })
  ),
});

export async function attendanceRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/attendance", async (request) => {
    const { scheduleSlotId, date } = querySchema.parse(request.query);
    const { rows } = await pool.query(
      `SELECT student_id AS "studentId", status
       FROM attendance_records
       WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, date]
    );
    return rows;
  });

  app.get(
    "/attendance/stats",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request) => {
      const { tenantId } = request.user;
      const { date } = request.query as { date?: string };
      const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

      const { rows } = await pool.query(
        `SELECT ar.status, COUNT(*)::int AS count
         FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         WHERE s.tenant_id = $1 AND ar.date = $2
         GROUP BY ar.status`,
        [tenantId, targetDate]
      );

      const counts = { p: 0, a: 0, l: 0 };
      for (const r of rows) counts[r.status as "p" | "a" | "l"] = Number(r.count);
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
    "/attendance/history",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { groupId, days } = request.query as { groupId?: string; days?: string };
      if (!groupId) return reply.code(400).send({ error: "groupId is required" });
      const numDays = Math.min(Math.max(Number(days) || 8, 1), 31);

      const groupRes = await pool.query(`SELECT id FROM groups WHERE id = $1 AND tenant_id = $2`, [groupId, tenantId]);
      if (groupRes.rows.length === 0) return reply.code(404).send({ error: "Group not found" });

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

      const recordMap = new Map<string, Map<string, "p" | "a" | "l">>();
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

    const totals = { p: 0, a: 0, l: 0 };
    for (const r of rows) totals[r.status as "p" | "a" | "l"]++;
    const total = rows.length;
    const pct = total > 0 ? Math.round((totals.p / total) * 100) : 0;

    return { records: rows, totals, percent: pct };
  });

  app.post(
    "/attendance",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request) => {
      const body = markSchema.parse(request.body);
      const userId = request.user.sub;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const r of body.records) {
          const existing = await client.query(
            `SELECT status FROM attendance_records
             WHERE student_id = $1 AND schedule_slot_id = $2 AND date = $3`,
            [r.studentId, body.scheduleSlotId, body.date]
          );
          const oldStatus = existing.rows[0]?.status as string | undefined;

          await client.query(
            `INSERT INTO attendance_records (student_id, schedule_slot_id, date, status, marked_by)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (student_id, schedule_slot_id, date)
             DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
            [r.studentId, body.scheduleSlotId, body.date, r.status, userId]
          );

          if (oldStatus !== "p" && r.status === "p") {
            await consumeLesson(client, r.studentId);
          } else if (oldStatus === "p" && r.status !== "p") {
            await refundLesson(client, r.studentId);
          }
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
}
