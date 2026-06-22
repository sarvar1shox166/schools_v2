import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { hashPassword } from "../auth/auth.service.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  level: z.string().optional(),
  age: z.number().int().positive().optional(),
  groupId: z.string().uuid().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  level: z.string().optional(),
  age: z.number().int().positive().optional(),
  status: z.enum(["yangi", "faol", "nofaol"]).optional(),
});

export async function studentsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/students", async (request) => {
    const { tenantId } = request.user;
    const { page, pageSize } = listQuerySchema.parse(request.query);

    const BASE_SELECT = `
      SELECT s.id, u.full_name AS "fullName", u.phone, u.login,
             s.level, s.age, s.status, s.joined_at AS "joinedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', g.id, 'name', g.name,
                  'teacherName', (SELECT full_name FROM users WHERE id = (
                    SELECT user_id FROM teachers WHERE id = g.teacher_id))))
                FROM group_members gm JOIN groups g ON g.id = gm.group_id
                WHERE gm.student_id = s.id), '[]'
             ) AS groups,
             sps.payment_status AS "paymentStatus",
             sps.active_package_expires AS "activePackageExpires"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN student_payment_status sps ON sps.student_id = s.id
      WHERE s.tenant_id = $1`;

    if (!page && !pageSize) {
      const { rows } = await pool.query(`${BASE_SELECT} ORDER BY u.full_name`, [tenantId]);
      return rows;
    }

    const pg = page ?? 1;
    const size = pageSize ?? 20;
    const offset = (pg - 1) * size;

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM students s WHERE s.tenant_id = $1`,
      [tenantId]
    );
    const total = countRows[0]?.total ?? 0;

    const { rows } = await pool.query(
      `${BASE_SELECT} ORDER BY u.full_name LIMIT $2 OFFSET $3`,
      [tenantId, size, offset]
    );

    return { items: rows, total, page: pg, pageSize: size };
  });

  app.post("/students", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const tempPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash, login)
         VALUES ($1, 'student', $2, $3, $4, $3) RETURNING id`,
        [tenantId, body.fullName, body.phone, passwordHash]
      );
      const userId = userRes.rows[0].id;

      const studentRes = await client.query(
        `INSERT INTO students (user_id, tenant_id, level, age)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, tenantId, body.level ?? null, body.age ?? null]
      );
      const studentId = studentRes.rows[0].id;

      if (body.groupId) {
        await client.query(
          `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`,
          [body.groupId, studentId]
        );
      }

      await client.query("COMMIT");
      return reply.code(201).send({ id: studentId, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/students/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    if (body.fullName || body.phone) {
      await pool.query(
        `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = now()
         WHERE id = (SELECT user_id FROM students WHERE id = $3 AND tenant_id = $4)`,
        [body.fullName ?? null, body.phone ?? null, id, tenantId]
      );
    }

    await pool.query(
      `UPDATE students SET level = COALESCE($1, level), age = COALESCE($2, age), status = COALESCE($3, status)
       WHERE id = $4 AND tenant_id = $5`,
      [body.level ?? null, body.age ?? null, body.status ?? null, id, tenantId]
    );

    return { ok: true };
  });

  app.delete("/students/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(
      `DELETE FROM users WHERE id = (SELECT user_id FROM students WHERE id = $1 AND tenant_id = $2)`,
      [id, tenantId]
    );
    return { ok: true };
  });

  app.post("/students/:id/groups/:groupId", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id, groupId } = request.params as { id: string; groupId: string };
    await pool.query(
      `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [groupId, id]
    );
    return { ok: true };
  });

  app.delete("/students/:id/groups/:groupId", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id, groupId } = request.params as { id: string; groupId: string };
    await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND student_id = $2`, [groupId, id]);
    return { ok: true };
  });
}
