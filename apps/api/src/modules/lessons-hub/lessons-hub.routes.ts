import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const groupQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
});

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
}
