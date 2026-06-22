import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  age: z.number().int().positive().optional(),
  level: z.string().optional(),
  source: z.enum(["telegram", "website", "phone", "referral", "other"]).default("other"),
  note: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["yangi", "korildi", "qabul", "rad"]).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  note: z.string().optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  age: z.number().int().positive().optional(),
  level: z.string().optional(),
});

export async function applicationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/applications", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { status } = request.query as { status?: string };
    const params: unknown[] = [tenantId];
    let where = "a.tenant_id = $1";
    if (status) {
      params.push(status);
      where += ` AND a.status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT a.id, a.full_name AS "fullName", a.phone, a.age, a.level,
              a.source, a.note, a.status, a.created_at AS "createdAt",
              a.updated_at AS "updatedAt",
              u.full_name AS "assignedToName", a.assigned_to AS "assignedTo",
              a.converted_student_id AS "convertedStudentId"
       FROM applications a
       LEFT JOIN users u ON u.id = a.assigned_to
       WHERE ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    return rows;
  });

  app.get("/applications/stats", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM applications WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    );
    const base = { yangi: 0, korildi: 0, qabul: 0, rad: 0 };
    for (const r of rows) base[r.status as keyof typeof base] = r.count;
    return base;
  });

  app.post("/applications", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `INSERT INTO applications (tenant_id, full_name, phone, age, level, source, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [tenantId, body.fullName, body.phone, body.age ?? null, body.level ?? null, body.source, body.note ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/applications/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;
    await pool.query(
      `UPDATE applications SET
         status = COALESCE($1, status),
         assigned_to = COALESCE($2, assigned_to),
         note = COALESCE($3, note),
         full_name = COALESCE($4, full_name),
         phone = COALESCE($5, phone),
         age = COALESCE($6, age),
         level = COALESCE($7, level),
         updated_at = now()
       WHERE id = $8 AND tenant_id = $9`,
      [
        body.status ?? null, body.assignedTo ?? null, body.note ?? null,
        body.fullName ?? null, body.phone ?? null, body.age ?? null, body.level ?? null,
        id, tenantId,
      ]
    );
    return { ok: true };
  });

  // Convert application to student
  app.post("/applications/:id/convert", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const appRes = await pool.query(
      `SELECT full_name, phone, age, level FROM applications WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (appRes.rows.length === 0) return reply.code(404).send({ error: "Not found" });
    const app_ = appRes.rows[0];

    // Import hashPassword inline to avoid circular dep
    const { hashPassword } = await import("../auth/auth.service.js");
    const { randomBytes } = await import("node:crypto");
    const tempPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash, login)
         VALUES ($1, 'student', $2, $3, $4, $3) RETURNING id`,
        [tenantId, app_.full_name, app_.phone, passwordHash]
      );
      const userId = userRes.rows[0].id;
      const studentRes = await client.query(
        `INSERT INTO students (user_id, tenant_id, level, age) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, tenantId, app_.level ?? null, app_.age ?? null]
      );
      const studentId = studentRes.rows[0].id;
      await client.query(
        `UPDATE applications SET status = 'qabul', converted_student_id = $1, updated_at = now()
         WHERE id = $2`,
        [studentId, id]
      );
      await client.query("COMMIT");
      return reply.code(201).send({ studentId, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.delete("/applications/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(`DELETE FROM applications WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return { ok: true };
  });
}
