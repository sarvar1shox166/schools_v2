import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const createSchema = z.object({
  name: z.string().min(1),
  level: z.string().optional(),
  teacherId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  color: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial();

export async function groupsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/groups", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.level, g.color, g.capacity, g.room_id AS "roomId",
              r.name AS "roomName",
              g.teacher_id AS "teacherId", tu.full_name AS "teacherName",
              (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id) AS "studentsCount"
       FROM groups g
       LEFT JOIN rooms r ON r.id = g.room_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
       WHERE g.tenant_id = $1
       ORDER BY g.name`,
      [tenantId]
    );
    return rows;
  });

  app.post("/groups", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `INSERT INTO groups (tenant_id, name, level, teacher_id, room_id, color, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 12)) RETURNING id`,
      [tenantId, body.name, body.level ?? null, body.teacherId ?? null, body.roomId ?? null, body.color ?? null, body.capacity ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/groups/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;
    await pool.query(
      `UPDATE groups SET
         name = COALESCE($1, name), level = COALESCE($2, level),
         teacher_id = COALESCE($3, teacher_id), room_id = COALESCE($4, room_id),
         color = COALESCE($5, color), capacity = COALESCE($6, capacity)
       WHERE id = $7 AND tenant_id = $8`,
      [body.name ?? null, body.level ?? null, body.teacherId ?? null, body.roomId ?? null, body.color ?? null, body.capacity ?? null, id, tenantId]
    );
    return { ok: true };
  });

  app.delete("/groups/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(`DELETE FROM groups WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return { ok: true };
  });

  // Students in a group (for attendance marking)
  app.get("/groups/:id/students", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const groupCheck = await pool.query(`SELECT id FROM groups WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (groupCheck.rows.length === 0) return reply.code(404).send({ error: "Group not found" });

    const { rows } = await pool.query(
      `SELECT s.id, u.full_name AS "fullName"
       FROM group_members gm
       JOIN students s ON s.id = gm.student_id
       JOIN users u ON u.id = s.user_id
       WHERE gm.group_id = $1
       ORDER BY u.full_name`,
      [id]
    );
    return rows;
  });
}
