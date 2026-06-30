import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { hashPassword } from "../auth/auth.service.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  spec: z.string().optional(),
  title: z.string().optional(),
  expYears: z.number().int().nonnegative().optional(),
});

const updateSchema = createSchema.partial();

export async function teachersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/teachers", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT t.id, u.full_name AS "fullName", u.phone, t.spec, t.title,
              t.exp_years AS "expYears", t.joined_at AS "joinedAt",
              (SELECT count(*) FROM groups g WHERE g.teacher_id = t.id) AS "groupsCount",
              (SELECT ROUND(AVG(rating)::numeric, 1)
               FROM teacher_reviews WHERE teacher_id = t.id) AS "rating"
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.tenant_id = $1
       ORDER BY u.full_name`,
      [tenantId]
    );
    return rows.map((row) => ({ ...row, rating: row.rating ? Number(row.rating) : null }));
  });

  app.post("/teachers", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const tempPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash)
         VALUES ($1, 'teacher', $2, $3, $4) RETURNING id`,
        [tenantId, body.fullName, body.phone, passwordHash]
      );
      const userId = userRes.rows[0].id;

      const teacherRes = await client.query(
        `INSERT INTO teachers (user_id, tenant_id, spec, title, exp_years)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, tenantId, body.spec ?? null, body.title ?? null, body.expYears ?? null]
      );

      await client.query("COMMIT");
      return reply.code(201).send({ id: teacherRes.rows[0].id, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/teachers/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    if (body.fullName || body.phone) {
      await pool.query(
        `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = now()
         WHERE id = (SELECT user_id FROM teachers WHERE id = $3 AND tenant_id = $4)`,
        [body.fullName ?? null, body.phone ?? null, id, tenantId]
      );
    }

    await pool.query(
      `UPDATE teachers SET spec = COALESCE($1, spec), title = COALESCE($2, title), exp_years = COALESCE($3, exp_years)
       WHERE id = $4 AND tenant_id = $5`,
      [body.spec ?? null, body.title ?? null, body.expYears ?? null, id, tenantId]
    );

    return { ok: true };
  });

  app.delete("/teachers/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(
      `DELETE FROM users WHERE id = (SELECT user_id FROM teachers WHERE id = $1 AND tenant_id = $2)`,
      [id, tenantId]
    );
    return { ok: true };
  });

  // Teacher rankings: real attendance + review data
  app.get("/teachers/rankings", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT t.id, u.full_name AS "fullName", t.spec,
              (SELECT COUNT(*)::int FROM groups g WHERE g.teacher_id = t.id) AS "groupsCount",
              (SELECT COUNT(DISTINCT gm.student_id)::int FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE g.teacher_id = t.id) AS "studentsCount",
              COALESCE(rev.avg_rating, 0) AS "avgRating",
              COALESCE(rev.review_count, 0) AS "reviewCount"
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN (
         SELECT teacher_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*)::int AS review_count
         FROM teacher_reviews
         GROUP BY teacher_id
       ) rev ON rev.teacher_id = t.id
       WHERE t.tenant_id = $1
       ORDER BY "avgRating" DESC, "studentsCount" DESC`,
      [tenantId]
    );
    return rows.map((r) => ({
      ...r,
      avgRating: r.avgRating > 0 ? Number(r.avgRating) : null,
    }));
  });

  // Get reviews for all teachers (admin view)
  app.get("/teachers/reviews", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT tr.id, tr.rating, tr.comment, tr.period, tr.created_at AS "createdAt",
              tu.full_name AS "teacherName",
              ru.full_name AS "reviewerName",
              g.name AS "groupName", g.color AS "groupColor"
       FROM teacher_reviews tr
       JOIN teachers t ON t.id = tr.teacher_id
       JOIN users tu ON tu.id = t.user_id
       JOIN users ru ON ru.id = tr.reviewer_id
       LEFT JOIN groups g ON g.teacher_id = tr.teacher_id
       WHERE t.tenant_id = $1
       ORDER BY tr.created_at DESC
       LIMIT 50`,
      [tenantId]
    );
    return rows;
  });

  // Add a review (admin only)
  app.post("/teachers/:id/reviews", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId, sub } = request.user;
    const body = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
      period: z.string().optional(),
    }).parse(request.body);

    const period = body.period ?? new Date().toISOString().slice(0, 7);
    const reviewer = await pool.query(`SELECT id FROM users WHERE id = $1 AND tenant_id = $2`, [sub, tenantId]);
    if (reviewer.rows.length === 0) return reply.code(403).send({ error: "Forbidden" });

    await pool.query(
      `INSERT INTO teacher_reviews (tenant_id, teacher_id, reviewer_id, rating, comment, period)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (teacher_id, reviewer_id, period) DO UPDATE
       SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`,
      [tenantId, id, sub, body.rating, body.comment ?? null, period]
    );
    return reply.code(201).send({ ok: true });
  });
}
