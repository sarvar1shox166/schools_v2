import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const createSchema = z.object({
  groupId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  roomId: z.string().uuid().optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().url().optional(),
});

const updateSchema = createSchema.partial().omit({ groupId: true });

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/schedule", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.room_id AS "roomId", r.name AS "roomName",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              tu.full_name AS "teacherName"
       FROM schedule_slots sl
       JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE g.tenant_id = $1
       ORDER BY sl.day_of_week, sl.start_time`,
      [tenantId]
    );
    return rows;
  });

  app.get("/schedule/today", async (request) => {
    const { tenantId, role, sub } = request.user;
    const dayOfWeek = new Date().getDay();

    const params: unknown[] = [tenantId, dayOfWeek];
    let filter = "";
    if (role === "teacher") {
      filter = `AND g.teacher_id = (SELECT id FROM teachers WHERE user_id = $3)`;
      params.push(sub);
    } else if (role === "student") {
      filter = `AND g.id IN (
        SELECT gm.group_id FROM group_members gm
        JOIN students s ON s.id = gm.student_id
        WHERE s.user_id = $3
      )`;
      params.push(sub);
    }

    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.room_id AS "roomId", r.name AS "roomName",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              tu.full_name AS "teacherName"
       FROM schedule_slots sl
       JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE g.tenant_id = $1 AND sl.day_of_week = $2 ${filter}
       ORDER BY sl.start_time`,
      params
    );
    return rows;
  });

  app.get("/me/schedule/next", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub } = request.user;
    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              tu.full_name AS "teacherName", tu.phone AS "teacherPhone"
       FROM schedule_slots sl
       JOIN groups g ON g.id = sl.group_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE g.id IN (
         SELECT gm.group_id FROM group_members gm
         JOIN students s ON s.id = gm.student_id
         WHERE s.user_id = $1
       )`,
      [sub]
    );

    const now = new Date();
    let best: { row: (typeof rows)[number]; at: Date } | null = null;
    for (const row of rows) {
      const [h, m] = String(row.startTime).split(":").map(Number);
      let dayDiff = (row.dayOfWeek - now.getDay() + 7) % 7;
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + dayDiff);
      candidate.setHours(h, m, 0, 0);
      if (candidate < now) {
        candidate.setDate(candidate.getDate() + 7);
      }
      if (!best || candidate < best.at) best = { row, at: candidate };
    }

    if (!best) return null;
    return { ...best.row, nextAt: best.at.toISOString() };
  });

  app.get("/me/teacher-schedule", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { sub, tenantId } = request.user;
    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
    const teacherId = teacherRes.rows[0]?.id;
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const { rows } = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", g.name AS "groupName", g.color,
              sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
              sl.room_id AS "roomId", r.name AS "roomName",
              sl.is_online AS "isOnline", sl.meeting_url AS "meetingUrl",
              COALESCE(gm.cnt, 0)::int AS "studentsCount"
       FROM schedule_slots sl
       JOIN groups g ON g.id = sl.group_id
       LEFT JOIN rooms r ON r.id = sl.room_id
       LEFT JOIN (
         SELECT group_id, count(*) AS cnt FROM group_members GROUP BY group_id
       ) gm ON gm.group_id = g.id
       WHERE g.tenant_id = $1 AND g.teacher_id = $2
       ORDER BY sl.day_of_week, sl.start_time`,
      [tenantId, teacherId]
    );

    const groupMap = new Map<
      string,
      { id: string; name: string; color: string | null; studentsCount: number; weeklyHours: number; slotsCount: number }
    >();
    for (const row of rows) {
      const existing = groupMap.get(row.groupId);
      const hours = 1.5; // default lesson duration (90 min)
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

  app.post("/schedule", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const isOnline = body.isOnline ?? false;
    const { rows } = await pool.query(
      `INSERT INTO schedule_slots (group_id, day_of_week, start_time, room_id, is_online, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [body.groupId, body.dayOfWeek, body.startTime, body.roomId ?? null, isOnline, body.meetingUrl ?? null]
    );
    const id = rows[0].id;
    if (isOnline && !body.meetingUrl) {
      await pool.query(`UPDATE schedule_slots SET meeting_url = $1 WHERE id = $2`, [
        `https://meet.jit.si/ChessSchool-${id}`,
        id,
      ]);
    }
    return reply.code(201).send({ id });
  });

  app.patch("/schedule/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);

    let meetingUrl = body.meetingUrl ?? null;
    if (body.isOnline && !meetingUrl) {
      const existing = await pool.query(`SELECT meeting_url AS "meetingUrl" FROM schedule_slots WHERE id = $1`, [id]);
      meetingUrl = existing.rows[0]?.meetingUrl ?? `https://meet.jit.si/ChessSchool-${id}`;
    }

    await pool.query(
      `UPDATE schedule_slots SET
         day_of_week = COALESCE($1, day_of_week),
         start_time = COALESCE($2, start_time),
         room_id = COALESCE($3, room_id),
         is_online = COALESCE($4, is_online),
         meeting_url = COALESCE($5, meeting_url)
       WHERE id = $6`,
      [body.dayOfWeek ?? null, body.startTime ?? null, body.roomId ?? null, body.isOnline ?? null, meetingUrl, id]
    );
    return { ok: true };
  });

  app.delete("/schedule/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    await pool.query(`DELETE FROM schedule_slots WHERE id = $1`, [id]);
    return { ok: true };
  });
}
