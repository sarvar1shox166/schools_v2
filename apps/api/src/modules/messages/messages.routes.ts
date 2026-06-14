import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { createNotification } from "../notifications/notify.js";

const sendSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

async function getContacts(tenantId: string, userId: string, role: string) {
  if (role === "teacher") {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id AS "userId", u.full_name AS "fullName", u.role
       FROM teachers t
       JOIN groups g ON g.teacher_id = t.id
       JOIN group_members gm ON gm.group_id = g.id
       JOIN students s ON s.id = gm.student_id
       JOIN users u ON u.id = s.user_id
       WHERE t.user_id = $1`,
      [userId]
    );
    return rows;
  }
  if (role === "student") {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id AS "userId", u.full_name AS "fullName", u.role
       FROM students s
       JOIN group_members gm ON gm.student_id = s.id
       JOIN groups g ON g.id = gm.group_id
       JOIN teachers t ON t.id = g.teacher_id
       JOIN users u ON u.id = t.user_id
       WHERE s.user_id = $1`,
      [userId]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT id AS "userId", full_name AS "fullName", role
     FROM users WHERE tenant_id = $1 AND id != $2 AND role IN ('teacher','student')`,
    [tenantId, userId]
  );
  return rows;
}

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/messages/threads", async (request) => {
    const { tenantId, sub, role } = request.user;
    if (!tenantId) return [];
    const contacts = await getContacts(tenantId, sub, role);

    const threads = await Promise.all(
      contacts.map(async (c: { userId: string; fullName: string; role: string }) => {
        const lastRes = await pool.query(
          `SELECT body, created_at AS "createdAt", sender_id AS "senderId"
           FROM messages
           WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
           ORDER BY created_at DESC LIMIT 1`,
          [sub, c.userId]
        );
        const unreadRes = await pool.query(
          `SELECT COUNT(*)::int AS count FROM messages WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
          [c.userId, sub]
        );
        return {
          userId: c.userId,
          fullName: c.fullName,
          role: c.role,
          lastBody: lastRes.rows[0]?.body ?? null,
          lastAt: lastRes.rows[0]?.createdAt ?? null,
          unreadCount: unreadRes.rows[0].count,
        };
      })
    );

    threads.sort((a, b) => {
      if (!a.lastAt) return 1;
      if (!b.lastAt) return -1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });

    return threads;
  });

  app.get("/messages/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    const { sub } = request.user;

    const { rows } = await pool.query(
      `SELECT id, sender_id AS "senderId", recipient_id AS "recipientId", body, read_at AS "readAt", created_at AS "createdAt"
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [sub, userId]
    );

    await pool.query(
      `UPDATE messages SET read_at = now() WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
      [userId, sub]
    );

    return rows;
  });

  app.post("/messages", async (request, reply) => {
    const body = sendSchema.parse(request.body);
    const { tenantId, sub } = request.user;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });

    const { rows } = await pool.query(
      `INSERT INTO messages (tenant_id, sender_id, recipient_id, body) VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id AS "senderId", recipient_id AS "recipientId", body, read_at AS "readAt", created_at AS "createdAt"`,
      [tenantId, sub, body.recipientId, body.body]
    );

    const senderRes = await pool.query(`SELECT full_name AS "fullName" FROM users WHERE id = $1`, [sub]);
    await createNotification(pool, {
      tenantId,
      userId: body.recipientId,
      type: "message",
      icon: "message",
      title: `${senderRes.rows[0]?.fullName ?? "Foydalanuvchi"}dan yangi xabar`,
      body: body.body.slice(0, 140),
    });

    return reply.code(201).send(rows[0]);
  });
}
