import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

const progressQuerySchema = z.object({
  sort: z.enum(["xp", "attendance", "name"]).default("xp"),
});

export async function teacherPortalRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", app.requireRole("teacher"));

  app.get("/me/students", async (request, reply) => {
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const { rows } = await pool.query(
      `SELECT s.id, u.full_name AS "fullName", u.phone, s.level, s.age, s.status,
              s.joined_at AS "joinedAt",
              COALESCE(sx.xp, 0) AS xp, COALESCE(sx.level, 1) AS "xpLevel",
              json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name)) AS groups,
              al."lastLessonDate"
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       JOIN students s ON s.id = gm.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_xp sx ON sx.student_id = s.id
       LEFT JOIN (
         SELECT student_id, MAX(date) AS "lastLessonDate"
         FROM attendance_records
         WHERE status = 'p'
         GROUP BY student_id
       ) al ON al.student_id = s.id
       WHERE g.teacher_id = $1
       GROUP BY s.id, u.full_name, u.phone, s.level, s.age, s.status, s.joined_at, sx.xp, sx.level, al."lastLessonDate"
       ORDER BY u.full_name`,
      [teacherId]
    );
    return rows;
  });

  app.get("/me/students/progress", async (request, reply) => {
    const { sort } = progressQuerySchema.parse(request.query);
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const orderBy =
      sort === "name" ? `"fullName" ASC` : sort === "attendance" ? `"attendanceRate" DESC` : `xp DESC`;

    const { rows } = await pool.query(
      `WITH ts AS (
         SELECT DISTINCT gm.student_id FROM group_members gm
         JOIN groups g ON g.id = gm.group_id WHERE g.teacher_id = $1
       ),
       att AS (
         SELECT ar.student_id,
                ROUND(COUNT(*) FILTER (WHERE ar.status = 'p')::numeric / NULLIF(COUNT(*), 0) * 100) AS rate
         FROM attendance_records ar
         JOIN schedule_slots ss ON ss.id = ar.schedule_slot_id
         JOIN groups g ON g.id = ss.group_id
         WHERE g.teacher_id = $1
         GROUP BY ar.student_id
       )
       SELECT s.id, u.full_name AS "fullName", s.level,
              COALESCE(sx.xp, 0) AS xp, COALESCE(sx.level, 1) AS level2,
              COALESCE(sx.streak, 0) AS streak,
              COALESCE(att.rate, 0)::int AS "attendanceRate"
       FROM ts
       JOIN students s ON s.id = ts.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_xp sx ON sx.student_id = s.id
       LEFT JOIN att ON att.student_id = s.id
       ORDER BY ${orderBy}`,
      [teacherId]
    );
    return rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      level: r.level,
      xp: r.xp,
      level2: r.level2,
      streak: r.streak,
      attendanceRate: r.attendanceRate,
    }));
  });

  app.get("/me/profile", async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT t.id, u.full_name AS "fullName", u.phone, t.spec, t.title,
              t.exp_years AS "expYears", t.joined_at AS "joinedAt",
              (SELECT count(*) FROM groups g WHERE g.teacher_id = t.id) AS "groupsCount",
              (SELECT count(DISTINCT gm.student_id) FROM group_members gm
                JOIN groups g ON g.id = gm.group_id WHERE g.teacher_id = t.id) AS "studentsCount"
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = $1`,
      [request.user.sub]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Teacher not found" });
    const teacher = rows[0];

    const attRes = await pool.query(
      `SELECT ROUND(COUNT(*) FILTER (WHERE ar.status = 'p')::numeric / NULLIF(COUNT(*), 0) * 100)::int AS rate
       FROM attendance_records ar
       JOIN schedule_slots ss ON ss.id = ar.schedule_slot_id
       JOIN groups g ON g.id = ss.group_id
       WHERE g.teacher_id = $1`,
      [teacher.id]
    );

    return { ...teacher, attendanceRate: attRes.rows[0]?.rate ?? 0 };
  });
}
