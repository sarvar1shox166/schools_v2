import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { hashPassword, generateTempPassword } from "../auth/auth.service.js";

const STAFF_ROLES = ["operator", "accountant", "moderator", "assistant_admin", "admin"] as const;

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  role: z.enum(STAFF_ROLES),
});

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  isActive: z.boolean().optional(),
});

const teachersAssignSchema = z.object({
  teacherIds: z.array(z.string().uuid()),
});

// Rol ierarxiyasi: caller o'zidan past yoki teng bo'lmagan rolni yarata/o'zgartira/o'chira olmaydi.
const ROLE_RANK: Record<string, number> = {
  admin: 3, assistant_admin: 2, moderator: 1, operator: 1, accountant: 1,
};
function canManage(callerRole: string, targetRole: string): boolean {
  if (callerRole === "super_admin") return true;
  return (ROLE_RANK[callerRole] ?? 0) > (ROLE_RANK[targetRole] ?? 0);
}

export async function staffRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/staff", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name AS "fullName", u.phone, u.login, u.role,
              u.is_active AS "isActive", u.created_at AS "createdAt"
       FROM users u
       WHERE u.tenant_id = $1
         AND u.role IN ('operator', 'accountant', 'moderator', 'assistant_admin', 'admin')
       ORDER BY u.role, u.full_name`,
      [tenantId]
    );
    return rows;
  });

  app.post("/staff", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId, role: callerRole } = request.user;
    if (!canManage(callerRole, body.role)) {
      return reply.code(403).send({ error: "Bu rolni yaratishga huquqingiz yo'q" });
    }
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const { rows } = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
       VALUES ($1, $2, $3, $4, $4, $5)
       RETURNING id`,
      [tenantId, body.role, body.fullName, body.phone, passwordHash]
    );
    return reply.code(201).send({ id: rows[0].id, tempPassword });
  });

  app.patch("/staff/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId, role: callerRole } = request.user;

    const target = await pool.query(
      `SELECT role FROM users WHERE id = $1 AND tenant_id = $2
         AND role IN ('operator', 'accountant', 'moderator', 'assistant_admin', 'admin')`,
      [id, tenantId]
    );
    if (!target.rows[0]) return reply.code(404).send({ error: "Not found" });
    if (!canManage(callerRole, target.rows[0].role)) {
      return reply.code(403).send({ error: "Bu xodimni o'zgartirishga huquqingiz yo'q" });
    }

    await pool.query(
      `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           phone      = COALESCE($2, phone),
           is_active  = COALESCE($3, is_active),
           -- Hisob o'chirilganda barcha refresh-tokenlar ham bekor qilinadi
           token_version = CASE WHEN $3 = false THEN token_version + 1 ELSE token_version END,
           updated_at = now()
       WHERE id = $4 AND tenant_id = $5
         AND role IN ('operator', 'accountant', 'moderator', 'assistant_admin', 'admin')`,
      [body.fullName ?? null, body.phone ?? null, body.isActive ?? null, id, tenantId]
    );
    return { ok: true };
  });

  app.delete("/staff/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId, role: callerRole } = request.user;

    const target = await pool.query(
      `SELECT role FROM users WHERE id = $1 AND tenant_id = $2
         AND role IN ('operator', 'accountant', 'moderator', 'assistant_admin', 'admin')`,
      [id, tenantId]
    );
    if (!target.rows[0]) return reply.code(404).send({ error: "Not found" });
    if (!canManage(callerRole, target.rows[0].role)) {
      return reply.code(403).send({ error: "Bu xodimni o'chirishga huquqingiz yo'q" });
    }

    await pool.query(
      `DELETE FROM users WHERE id = $1 AND tenant_id = $2 AND role IN ('operator','accountant','moderator','assistant_admin','admin')`,
      [id, tenantId]
    );
    return { ok: true };
  });

  // ── Moderatorga biriktirilgan o'qituvchilar ──────────────────────────
  app.get(
    "/staff/:id/teachers",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user;
      const { rows } = await pool.query(
        `SELECT teacher_id AS "teacherId" FROM moderator_teachers WHERE tenant_id = $1 AND moderator_user_id = $2`,
        [tenantId, id]
      );
      return rows.map((r) => r.teacherId);
    }
  );

  app.put(
    "/staff/:id/teachers",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user;
      const body = teachersAssignSchema.parse(request.body);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM moderator_teachers WHERE tenant_id = $1 AND moderator_user_id = $2`,
          [tenantId, id]
        );
        for (const teacherId of body.teacherIds) {
          await client.query(
            `INSERT INTO moderator_teachers (tenant_id, moderator_user_id, teacher_id) VALUES ($1, $2, $3)`,
            [tenantId, id, teacherId]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      return { ok: true };
    }
  );
}
