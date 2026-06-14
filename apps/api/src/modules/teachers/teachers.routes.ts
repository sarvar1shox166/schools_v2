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

/**
 * Deterministic mock rating in the 4.0-5.0 range, derived from the teacher's
 * id (hashed) and experience years. No real rating data source exists yet
 * (see Phase 17 out-of-scope note).
 */
function computeMockRating(id: string, expYears: number | null): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const base = 4.0 + (hash % 81) / 100; // 4.00 - 4.80
  const expBonus = Math.min(0.2, (expYears ?? 0) * 0.02); // up to +0.20
  return Math.round((base + expBonus) * 10) / 10;
}

export async function teachersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/teachers", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT t.id, u.full_name AS "fullName", u.phone, t.spec, t.title,
              t.exp_years AS "expYears", t.joined_at AS "joinedAt",
              (SELECT count(*) FROM groups g WHERE g.teacher_id = t.id) AS "groupsCount"
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.tenant_id = $1
       ORDER BY u.full_name`,
      [tenantId]
    );
    return rows.map((row) => ({ ...row, rating: computeMockRating(row.id, row.expYears) }));
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
}
