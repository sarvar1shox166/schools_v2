import type { FastifyInstance } from "fastify";
import { pool } from "../../db/pool.js";

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/notifications", async (request) => {
    const { unread } = request.query as { unread?: string };
    const params: unknown[] = [request.user.sub];
    let where = `user_id = $1`;
    if (unread === "true" || unread === "1") {
      where += ` AND read_at IS NULL`;
    }
    const { rows } = await pool.query(
      `SELECT id, type, icon, title, body, read_at AS "readAt", created_at AS "createdAt"
       FROM notifications WHERE ${where}
       ORDER BY created_at DESC LIMIT 100`,
      params
    );
    return rows;
  });

  app.get("/notifications/unread-count", async (request) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [request.user.sub]
    );
    return { count: rows[0].count };
  });

  app.post("/notifications/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(
      `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, request.user.sub]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // Notification stats for the current user.
  // "ariza" (application) and "payment" notifications are identified by the
  // `type` column (values 'application' / 'payment' — no dedicated tables for
  // these exist yet, so the counters simply reflect notifications created with
  // those types and will read 0 until such notifications are generated).
  app.get("/notifications/stats", async (request) => {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS "thisWeek",
         COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread,
         COUNT(*) FILTER (WHERE type = 'application')::int AS applications,
         COUNT(*) FILTER (WHERE type = 'payment')::int AS "paymentWarnings"
       FROM notifications WHERE user_id = $1`,
      [request.user.sub]
    );
    return rows[0];
  });

  app.post("/notifications/read-all", async (request) => {
    await pool.query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [request.user.sub]
    );
    return { ok: true };
  });
}
