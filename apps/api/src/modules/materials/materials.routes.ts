import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { uploadFile, deleteFile, getSignedDownloadUrl, localReadStream, USE_S3 } from "../../lib/storage.js";

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

const listQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
});

export async function materialsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/materials", async (request, reply) => {
    const { groupId } = listQuerySchema.parse(request.query);
    const { tenantId, role, sub } = request.user;

    if (role === "teacher") {
      const teacherId = await getTeacherIdForUser(sub);
      if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });
      const params: unknown[] = [teacherId];
      let where = `m.teacher_id = $1`;
      if (groupId) {
        params.push(groupId);
        where += ` AND m.group_id = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT m.id, m.title, m.file_name AS "fileName", m.mime_type AS "mimeType",
                m.size_bytes AS "sizeBytes", m.created_at AS "createdAt",
                m.group_id AS "groupId", g.name AS "groupName"
         FROM lesson_materials m
         LEFT JOIN groups g ON g.id = m.group_id
         WHERE ${where}
         ORDER BY m.created_at DESC`,
        params
      );
      return rows;
    }

    if (role === "student") {
      const studentId = await getStudentIdForUser(sub);
      if (!studentId) return reply.code(404).send({ error: "Student not found" });
      const params: unknown[] = [studentId];
      let where = `gm.student_id = $1`;
      if (groupId) {
        params.push(groupId);
        where += ` AND m.group_id = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT m.id, m.title, m.file_name AS "fileName", m.mime_type AS "mimeType",
                m.size_bytes AS "sizeBytes", m.created_at AS "createdAt",
                m.group_id AS "groupId", g.name AS "groupName"
         FROM lesson_materials m
         JOIN group_members gm ON gm.group_id = m.group_id
         JOIN groups g ON g.id = m.group_id
         WHERE ${where}
         ORDER BY m.created_at DESC`,
        params
      );
      return rows;
    }

    const params: unknown[] = [tenantId];
    let where = `m.tenant_id = $1`;
    if (groupId) {
      params.push(groupId);
      where += ` AND m.group_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT m.id, m.title, m.file_name AS "fileName", m.mime_type AS "mimeType",
              m.size_bytes AS "sizeBytes", m.created_at AS "createdAt",
              m.group_id AS "groupId", g.name AS "groupName"
       FROM lesson_materials m
       LEFT JOIN groups g ON g.id = m.group_id
       WHERE ${where}
       ORDER BY m.created_at DESC`,
      params
    );
    return rows;
  });

  app.post("/materials", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "Fayl topilmadi" });

    const fields = data.fields as Record<string, { value?: string } | undefined>;
    const title = fields.title?.value ?? data.filename;
    const groupId = fields.groupId?.value || null;

    if (groupId) {
      const groupCheck = await pool.query(
        `SELECT id FROM groups WHERE id = $1 AND teacher_id = $2`,
        [groupId, teacherId]
      );
      if (groupCheck.rows.length === 0) return reply.code(400).send({ error: "Guruh topilmadi" });
    }

    const tenantId = request.user.tenantId;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });

    const ext = path.extname(data.filename) || "";
    const key = `materials/${tenantId}/${randomUUID()}${ext}`;
    const buffer = await data.toBuffer();
    await uploadFile(buffer, key, data.mimetype);

    const { rows } = await pool.query(
      `INSERT INTO lesson_materials (tenant_id, teacher_id, group_id, title, file_name, file_path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [tenantId, teacherId, groupId, title, data.filename, key, data.mimetype, buffer.length]
    );

    return reply.code(201).send({ id: rows[0].id });
  });

  app.get("/materials/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(
      `SELECT file_path AS "key", file_name AS "fileName", mime_type AS "mimeType", tenant_id AS "tenantId", group_id AS "groupId"
       FROM lesson_materials WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    const material = rows[0];
    if (material.tenantId !== request.user.tenantId) return reply.code(404).send({ error: "Not found" });

    if (request.user.role === "student") {
      const studentId = await getStudentIdForUser(request.user.sub);
      const access = await pool.query(
        `SELECT 1 FROM group_members WHERE group_id = $1 AND student_id = $2`,
        [material.groupId, studentId]
      );
      if (access.rows.length === 0) return reply.code(403).send({ error: "Forbidden" });
    }

    if (USE_S3) {
      const signedUrl = await getSignedDownloadUrl(material.key, 3600);
      return reply.redirect(302, signedUrl!);
    }

    reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(material.fileName)}"`);
    reply.type(material.mimeType);
    return reply.send(localReadStream(material.key));
  });

  app.delete("/materials/:id", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teacherId = await getTeacherIdForUser(request.user.sub);
    const { rows } = await pool.query(
      `DELETE FROM lesson_materials WHERE id = $1 AND teacher_id = $2 RETURNING file_path AS "key"`,
      [id, teacherId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    await deleteFile(rows[0].key);
    return { ok: true };
  });
}
