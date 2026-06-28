import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const createSchema = z.object({
  scheduleSlotId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  conductedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic: z.string().optional(),
  homework: z.string().optional(),
  zoomLink: z.string().url().optional(),
});

const updateSchema = z.object({
  topic: z.string().optional(),
  homework: z.string().optional(),
  zoomLink: z.string().optional(),
  status: z.enum(["conducted", "cancelled"]).optional(),
});

export async function lessonsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // List lessons for a group (or all for admin)
  app.get(
    "/lessons",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const { groupId, from, to } = request.query as { groupId?: string; from?: string; to?: string };

      const params: unknown[] = [tenantId];
      let filter = "";

      if (groupId) {
        params.push(groupId);
        filter += ` AND l.group_id = $${params.length}`;
      }
      if (role === "teacher") {
        const tr = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
        if (tr.rows[0]) {
          params.push(tr.rows[0].id);
          filter += ` AND l.teacher_id = $${params.length}`;
        }
      }
      if (from) {
        params.push(from);
        filter += ` AND l.conducted_at >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        filter += ` AND l.conducted_at <= $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT l.id, l.group_id AS "groupId", g.name AS "groupName", g.color,
                l.teacher_id AS "teacherId", tu.full_name AS "teacherName",
                l.conducted_at AS "conductedAt", l.topic, l.homework, l.zoom_link AS "zoomLink",
                l.status,
                COUNT(ar.id)::int AS "totalStudents",
                COUNT(ar.id) FILTER (WHERE ar.status = 'p')::int AS "presentCount",
                COUNT(ar.id) FILTER (WHERE ar.status = 'ae')::int AS "excusedCount"
         FROM lessons l
         JOIN groups g ON g.id = l.group_id
         JOIN teachers t ON t.id = l.teacher_id
         JOIN users tu ON tu.id = t.user_id
         LEFT JOIN attendance_records ar ON ar.lesson_id = l.id
         WHERE l.tenant_id = $1 ${filter}
         GROUP BY l.id, g.name, g.color, tu.full_name
         ORDER BY l.conducted_at DESC
         LIMIT 100`,
        params
      );
      return rows;
    }
  );

  // Create a lesson
  app.post(
    "/lessons",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request, reply) => {
      const { tenantId, role, sub } = request.user;
      const body = createSchema.parse(request.body);

      const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
      let teacherId = teacherRes.rows[0]?.id;

      if (!teacherId && (role === "super_admin" || role === "admin")) {
        // For admin creating a lesson, require groupId to infer teacher
        if (body.groupId) {
          const gr = await pool.query(`SELECT teacher_id FROM groups WHERE id = $1`, [body.groupId]);
          teacherId = gr.rows[0]?.teacher_id;
        }
      }

      if (!teacherId) return reply.code(400).send({ error: "Teacher not found" });

      const { rows } = await pool.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, topic, homework, zoom_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tenantId, body.scheduleSlotId ?? null, body.groupId ?? null, teacherId,
         body.conductedAt, body.topic ?? null, body.homework ?? null, body.zoomLink ?? null]
      );
      return reply.code(201).send({ id: rows[0].id });
    }
  );

  // Get lesson detail with attendance
  app.get(
    "/lessons/:id",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user;

      const lessonRes = await pool.query(
        `SELECT l.id, l.group_id AS "groupId", g.name AS "groupName",
                l.teacher_id AS "teacherId", tu.full_name AS "teacherName",
                l.conducted_at AS "conductedAt", l.topic, l.homework,
                l.zoom_link AS "zoomLink", l.status, l.schedule_slot_id AS "scheduleSlotId"
         FROM lessons l
         JOIN groups g ON g.id = l.group_id
         JOIN teachers t ON t.id = l.teacher_id
         JOIN users tu ON tu.id = t.user_id
         WHERE l.id = $1 AND l.tenant_id = $2`,
        [id, tenantId]
      );
      if (lessonRes.rows.length === 0) return reply.code(404).send({ error: "Lesson not found" });

      const attendanceRes = await pool.query(
        `SELECT ar.student_id AS "studentId", u.full_name AS "fullName",
                ar.status, ar.reason, ar.lesson_counted AS "lessonCounted"
         FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         JOIN users u ON u.id = s.user_id
         WHERE ar.lesson_id = $1
         ORDER BY u.full_name`,
        [id]
      );

      return { ...lessonRes.rows[0], attendance: attendanceRes.rows };
    }
  );

  // Update lesson
  app.patch(
    "/lessons/:id",
    { onRequest: [app.requireRole("super_admin", "admin", "teacher")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateSchema.parse(request.body);
      await pool.query(
        `UPDATE lessons SET
           topic = COALESCE($1, topic),
           homework = COALESCE($2, homework),
           zoom_link = COALESCE($3, zoom_link),
           status = COALESCE($4, status)
         WHERE id = $5`,
        [body.topic ?? null, body.homework ?? null, body.zoomLink ?? null, body.status ?? null, id]
      );
      return { ok: true };
    }
  );
}
