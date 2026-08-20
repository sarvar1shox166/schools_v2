import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { awardXp } from "../gamification/xp.js";

const createSchema = z.object({
  groupId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  xpReward: z.number().int().nonnegative().default(30),
  // Vazifa aynan qaysi dars uchun berilganini bildiradi — bir guruhda bir
  // necha marta dars bo'lganda ularni ajratish uchun.
  scheduleSlotId: z.string().uuid().optional(),
  lessonDate: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  xpReward: z.number().int().nonnegative().optional(),
});

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function homeworkRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // List homework (teacher sees their groups, student sees their groups)
  app.get("/homework", async (request) => {
    const { tenantId, role, sub } = request.user;
    const { groupId } = z.object({ groupId: z.string().uuid().optional() }).parse(request.query);

    if (role === "teacher") {
      const { rows: teacherRows } = await pool.query(
        `SELECT id FROM teachers WHERE user_id = $1`, [sub]
      );
      const teacherId = teacherRows[0]?.id;
      if (!teacherId) return [];

      const params: unknown[] = [teacherId];
      let groupFilter = "";
      if (groupId) { params.push(groupId); groupFilter = `AND h.group_id = $${params.length}`; }

      const { rows } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date AS "dueDate", h.xp_reward AS "xpReward",
                h.created_at AS "createdAt", g.name AS "groupName", g.color AS "groupColor",
                h.group_id AS "groupId",
                h.schedule_slot_id AS "scheduleSlotId", h.lesson_date AS "lessonDate",
                sl.start_time AS "lessonTime",
                COUNT(DISTINCT hc.student_id)::int AS "completionCount",
                (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = h.group_id) AS "totalStudents"
         FROM homework h
         JOIN groups g ON g.id = h.group_id
         LEFT JOIN homework_completions hc ON hc.homework_id = h.id
         LEFT JOIN schedule_slots sl ON sl.id = h.schedule_slot_id
         WHERE g.teacher_id = $1 ${groupFilter}
         GROUP BY h.id, g.name, g.color, sl.start_time
         ORDER BY h.lesson_date DESC NULLS LAST, sl.start_time DESC NULLS LAST, h.created_at DESC`,
        params
      );
      return rows;
    }

    if (role === "student") {
      const { rows: stdRows } = await pool.query(
        `SELECT id FROM students WHERE user_id = $1`, [sub]
      );
      const studentId = stdRows[0]?.id;
      if (!studentId) return [];

      const params: unknown[] = [studentId];
      let groupFilter = "";
      if (groupId) { params.push(groupId); groupFilter = `AND h.group_id = $${params.length}`; }

      const { rows } = await pool.query(
        `SELECT h.id, h.title, h.description, h.due_date AS "dueDate", h.xp_reward AS "xpReward",
                h.created_at AS "createdAt", g.name AS "groupName", g.color AS "groupColor",
                h.group_id AS "groupId",
                h.schedule_slot_id AS "scheduleSlotId", h.lesson_date AS "lessonDate",
                sl.start_time AS "lessonTime",
                EXISTS(SELECT 1 FROM homework_completions hc WHERE hc.homework_id = h.id AND hc.student_id = $1) AS done
         FROM homework h
         JOIN groups g ON g.id = h.group_id
         JOIN group_members gm ON gm.group_id = h.group_id AND gm.student_id = $1
         LEFT JOIN schedule_slots sl ON sl.id = h.schedule_slot_id
         WHERE h.tenant_id = (SELECT tenant_id FROM students WHERE id = $1) ${groupFilter}
         ORDER BY h.due_date ASC NULLS LAST, h.created_at DESC`,
        params
      );
      return rows;
    }

    // admin / super_admin
    const params: unknown[] = [tenantId];
    let groupFilter = "";
    if (groupId) { params.push(groupId); groupFilter = `AND h.group_id = $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT h.id, h.title, h.description, h.due_date AS "dueDate", h.xp_reward AS "xpReward",
              h.created_at AS "createdAt", g.name AS "groupName", g.color AS "groupColor",
              h.group_id AS "groupId",
              h.schedule_slot_id AS "scheduleSlotId", h.lesson_date AS "lessonDate",
              sl.start_time AS "lessonTime",
              COUNT(hc.student_id)::int AS "completionCount"
       FROM homework h
       JOIN groups g ON g.id = h.group_id
       LEFT JOIN homework_completions hc ON hc.homework_id = h.id
       LEFT JOIN schedule_slots sl ON sl.id = h.schedule_slot_id
       WHERE h.tenant_id = $1 ${groupFilter}
       GROUP BY h.id, g.name, g.color, sl.start_time
       ORDER BY h.lesson_date DESC NULLS LAST, sl.start_time DESC NULLS LAST, h.created_at DESC`,
      params
    );
    return rows;
  });

  // Create homework (teacher only)
  app.post("/homework", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId, sub } = request.user;

    const { rows: teacherRows } = await pool.query(
      `SELECT id FROM teachers WHERE user_id = $1`, [sub]
    );
    const teacherId = teacherRows[0]?.id;
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const groupCheck = await pool.query(
      `SELECT id FROM groups WHERE id = $1 AND teacher_id = $2 AND tenant_id = $3`,
      [body.groupId, teacherId, tenantId]
    );
    if (groupCheck.rows.length === 0) return reply.code(400).send({ error: "Guruh topilmadi" });

    const { rows } = await pool.query(
      `INSERT INTO homework (tenant_id, group_id, title, description, due_date, xp_reward, schedule_slot_id, lesson_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        tenantId, body.groupId, body.title, body.description ?? null, body.dueDate ?? null, body.xpReward,
        body.scheduleSlotId ?? null, body.lessonDate ?? null,
      ]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  // Update homework (teacher only)
  app.patch("/homework/:id", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const { rowCount } = await pool.query(
      `UPDATE homework h SET
         title = COALESCE($1, h.title),
         description = CASE WHEN $2::text IS NOT NULL THEN NULLIF($2, '') ELSE h.description END,
         due_date = CASE WHEN $3::text IS NOT NULL THEN NULLIF($3, '')::date ELSE h.due_date END,
         xp_reward = COALESCE($4, h.xp_reward)
       FROM groups g
       WHERE h.id = $5 AND h.group_id = g.id AND g.teacher_id = $6`,
      [body.title ?? null, body.description ?? null, body.dueDate ?? null, body.xpReward ?? null, id, teacherId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // Per-student completion breakdown for one homework (teacher only)
  app.get("/homework/:id/completions", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const hwRes = await pool.query(
      `SELECT h.group_id AS "groupId" FROM homework h
       JOIN groups g ON g.id = h.group_id
       WHERE h.id = $1 AND g.teacher_id = $2`,
      [id, teacherId]
    );
    if (hwRes.rows.length === 0) return reply.code(404).send({ error: "Not found" });

    const { rows } = await pool.query(
      `SELECT s.id AS "studentId", u.full_name AS "fullName",
              (hc.student_id IS NOT NULL) AS done
       FROM group_members gm
       JOIN students s ON s.id = gm.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN homework_completions hc ON hc.homework_id = $1 AND hc.student_id = s.id
       WHERE gm.group_id = $2
       ORDER BY u.full_name`,
      [id, hwRes.rows[0].groupId]
    );
    return rows;
  });

  // Teacher marks a specific student's homework as done (one-way — cannot un-mark, to avoid XP-revocation edge cases)
  app.post("/homework/:id/complete/:studentId", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id, studentId } = request.params as { id: string; studentId: string };
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const hwRow = await pool.query(
      `SELECT h.xp_reward AS "xpReward" FROM homework h
       JOIN groups g ON g.id = h.group_id
       JOIN group_members gm ON gm.group_id = h.group_id AND gm.student_id = $2
       WHERE h.id = $1 AND g.teacher_id = $3`,
      [id, studentId, teacherId]
    );
    if (hwRow.rows.length === 0) return reply.code(404).send({ error: "Not found" });

    const inserted = await pool.query(
      `INSERT INTO homework_completions (student_id, homework_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING student_id`,
      [studentId, id]
    );

    if (inserted.rows.length > 0 && hwRow.rows[0].xpReward > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await awardXp(client, studentId, hwRow.rows[0].xpReward);
        await client.query("COMMIT");
      } catch { await client.query("ROLLBACK"); }
      finally { client.release(); }
    }

    return { ok: true };
  });

  // Delete homework (teacher only)
  app.delete("/homework/:id", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user;

    const { rows: teacherRows } = await pool.query(
      `SELECT id FROM teachers WHERE user_id = $1`, [sub]
    );
    const teacherId = teacherRows[0]?.id;
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const { rowCount } = await pool.query(
      `DELETE FROM homework h
       USING groups g
       WHERE h.id = $1 AND h.group_id = g.id AND g.teacher_id = $2`,
      [id, teacherId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // Student marks homework as complete
  app.post("/homework/:id/complete", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user;

    const { rows: stdRows } = await pool.query(
      `SELECT id FROM students WHERE user_id = $1`, [sub]
    );
    const studentId = stdRows[0]?.id;
    if (!studentId) return reply.code(403).send({ error: "Forbidden" });

    const hwRow = await pool.query(
      `SELECT h.id, h.xp_reward, h.tenant_id FROM homework h
       JOIN group_members gm ON gm.group_id = h.group_id AND gm.student_id = $2
       WHERE h.id = $1`,
      [id, studentId]
    );
    if (hwRow.rows.length === 0) return reply.code(404).send({ error: "Not found" });

    const inserted = await pool.query(
      `INSERT INTO homework_completions (student_id, homework_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING student_id`,
      [studentId, id]
    );

    const hw = hwRow.rows[0];
    if (inserted.rows.length > 0 && hw.xp_reward > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await awardXp(client, studentId, hw.xp_reward);
        await client.query("COMMIT");
      } catch { await client.query("ROLLBACK"); }
      finally { client.release(); }
    }

    return reply.code(201).send({ ok: true });
  });
}
