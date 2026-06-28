import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { hashPassword } from "../auth/auth.service.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  role: z.enum(["operator", "accountant", "admin"]),
});

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  isActive: z.boolean().optional(),
});

export async function staffRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/staff", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.phone, u.login, u.role,
              u.is_active AS "isActive", u.created_at AS "createdAt"
       FROM users u
       WHERE u.tenant_id = $1
         AND u.role IN ('operator', 'accountant', 'admin')
       ORDER BY u.role, u.full_name`,
      [tenantId]
    );
    return rows;
  });

  app.post("/staff", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const tempPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const { rows } = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
       VALUES ($1, $2, $3, $4, $4, $5)
       RETURNING id`,
      [tenantId, body.role, body.fullName, body.phone, passwordHash]
    );
    return reply.code(201).send({ id: rows[0].id, tempPassword });
  });

  app.patch("/staff/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    await pool.query(
      `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           phone      = COALESCE($2, phone),
           is_active  = COALESCE($3, is_active),
           updated_at = now()
       WHERE id = $4 AND tenant_id = $5
         AND role IN ('operator', 'accountant', 'admin')`,
      [body.fullName ?? null, body.phone ?? null, body.isActive ?? null, id, tenantId]
    );
    return { ok: true };
  });

  app.delete("/staff/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(
      `DELETE FROM users WHERE id = $1 AND tenant_id = $2 AND role IN ('operator','accountant','admin')`,
      [id, tenantId]
    );
    return { ok: true };
  });
}
