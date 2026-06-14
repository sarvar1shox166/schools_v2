import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { awardXp } from "../gamification/xp.js";

const groupQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
});

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function lessonsHubRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/recordings", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { groupId } = groupQuerySchema.parse(request.query);
    const { sub } = request.user;

    const params: unknown[] = [sub];
    let where = `gm.student_id = (SELECT id FROM students WHERE user_id = $1)`;
    if (groupId) {
      params.push(groupId);
      where += ` AND lr.group_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT lr.id, lr.title, lr.video_url AS "videoUrl", lr.duration_seconds AS "durationSeconds",
              lr.recorded_date AS "recordedDate", lr.group_id AS "groupId"
       FROM lesson_recordings lr
       JOIN group_members gm ON gm.group_id = lr.group_id
       WHERE ${where}
       ORDER BY lr.recorded_date DESC`,
      params
    );
    return rows;
  });

  app.get("/homework", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { groupId } = groupQuerySchema.parse(request.query);
    const { sub } = request.user;
    const studentId = await getStudentIdForUser(sub);
    if (!studentId) return [];

    const params: unknown[] = [studentId];
    let where = `gm.student_id = $1`;
    if (groupId) {
      params.push(groupId);
      where += ` AND h.group_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT h.id, h.title, h.description, h.due_date AS "dueDate", h.xp_reward AS "xpReward",
              (hc.student_id IS NOT NULL) AS done
       FROM homework h
       JOIN group_members gm ON gm.group_id = h.group_id
       LEFT JOIN homework_completions hc ON hc.homework_id = h.id AND hc.student_id = $1
       WHERE ${where}
       ORDER BY h.due_date NULLS LAST, h.created_at DESC`,
      params
    );
    return rows;
  });

  app.post("/homework/:id/complete", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const existing = await pool.query(
      `SELECT 1 FROM homework_completions WHERE student_id = $1 AND homework_id = $2`,
      [studentId, id]
    );
    if (existing.rows.length > 0) return { alreadyCompleted: true };

    const hwRes = await pool.query(`SELECT xp_reward AS "xpReward" FROM homework WHERE id = $1`, [id]);
    if (hwRes.rows.length === 0) return reply.code(404).send({ error: "Not found" });
    const xpReward = hwRes.rows[0].xpReward as number;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO homework_completions (student_id, homework_id) VALUES ($1, $2)`,
        [studentId, id]
      );
      const xpResult = await awardXp(client, studentId, xpReward);
      await client.query("COMMIT");
      return { ...xpResult, xpAwarded: xpReward };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
