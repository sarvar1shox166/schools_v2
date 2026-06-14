import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { awardXp } from "../gamification/xp.js";

const createVideoSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["zoom", "debyut", "taktika", "endshpil", "strategiya"]),
  videoUrl: z.string().min(1),
  durationSeconds: z.number().int().positive().optional(),
  thumbnailColor: z.string().optional(),
  thumbnailIcon: z.string().optional(),
});

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
});

const VIDEO_XP_REWARD = 20;

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function videosRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/videos", async (request) => {
    const { tenantId, sub, role } = request.user;
    const { category } = request.query as { category?: string };

    const conditions: string[] = ["v.tenant_id = $1"];
    const params: unknown[] = [tenantId];
    if (category && category !== "hammasi") {
      conditions.push(`v.category = $${params.length + 1}`);
      params.push(category);
    }

    let progressJoin = "";
    if (role === "student") {
      const studentId = await getStudentIdForUser(sub);
      params.push(studentId);
      progressJoin = `LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.student_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT v.id, v.title, v.category, v.video_url AS "videoUrl", v.duration_seconds AS "durationSeconds",
              v.thumbnail_color AS "thumbnailColor", v.thumbnail_icon AS "thumbnailIcon",
              COALESCE(vp.progress_pct, 0) AS "progressPct"
       FROM video_lessons v
       ${progressJoin}
       WHERE ${conditions.join(" AND ")}
       ORDER BY v.created_at DESC`,
      params
    );
    return rows;
  });

  app.post("/videos", { onRequest: [app.requireRole("super_admin", "admin", "teacher")] }, async (request, reply) => {
    const body = createVideoSchema.parse(request.body);
    const { tenantId, sub, role } = request.user;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });

    let teacherId: string | null = null;
    if (role === "teacher") teacherId = await getTeacherIdForUser(sub);

    const { rows } = await pool.query(
      `INSERT INTO video_lessons (tenant_id, teacher_id, title, category, video_url, duration_seconds, thumbnail_color, thumbnail_icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [tenantId, teacherId, body.title, body.category, body.videoUrl, body.durationSeconds ?? null, body.thumbnailColor ?? null, body.thumbnailIcon ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.post("/videos/:id/progress", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = progressSchema.parse(request.body);
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const existing = await pool.query(
      `SELECT progress_pct AS "progressPct" FROM video_progress WHERE student_id = $1 AND video_id = $2`,
      [studentId, id]
    );
    const wasCompleted = (existing.rows[0]?.progressPct ?? 0) >= 100;

    await pool.query(
      `INSERT INTO video_progress (student_id, video_id, progress_pct, watched_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (student_id, video_id) DO UPDATE SET progress_pct = $3, watched_at = now()`,
      [studentId, id, body.progressPct]
    );

    if (body.progressPct >= 100 && !wasCompleted) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const xpResult = await awardXp(client, studentId, VIDEO_XP_REWARD);
        await client.query("COMMIT");
        return { ...xpResult, xpAwarded: VIDEO_XP_REWARD };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    return { progressPct: body.progressPct };
  });
}
