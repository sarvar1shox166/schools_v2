import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { dayOfWeekOf } from "../../lib/schedule-dates.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  age: z.number().int().positive().optional(),
  level: z.string().optional(),
  source: z.enum(["telegram", "website", "phone", "referral", "instagram", "other"]).default("other"),
  note: z.string().optional(),
  diagnosticTeacherId: z.string().uuid().optional(),
  // Diagnostika bir martalik voqea — aniq sana tanlanadi (hafta kuni emas).
  diagnosticDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  diagnosticTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  meetingPlatform: z.enum(["zoom", "meet"]).default("zoom"),
  meetingUrl: z.string().url().optional().or(z.literal("")),
});

const updateSchema = z.object({
  status: z.enum(["diagnostika", "royxatdan_otdi", "rad"]).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  note: z.string().optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  age: z.number().int().positive().optional(),
  level: z.string().optional(),
  diagnosticTeacherId: z.string().uuid().optional().nullable(),
  diagnosticDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  diagnosticTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  meetingPlatform: z.enum(["zoom", "meet"]).optional(),
  meetingUrl: z.string().optional().nullable(),
});

const DIAGNOSTIC_DURATION_MINUTES = 60;

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
              a.converted_student_id AS "convertedStudentId",
              a.diagnostic_teacher_id AS "diagnosticTeacherId",
              tu.full_name AS "diagnosticTeacherName",
              a.diagnostic_date AS "diagnosticDate",
              a.diagnostic_time AS "diagnosticTime",
              a.meeting_platform AS "meetingPlatform",
              a.meeting_url AS "meetingUrl",
              a.schedule_slot_id AS "scheduleSlotId"
       FROM applications a
       LEFT JOIN users u ON u.id = a.assigned_to
       LEFT JOIN teachers t ON t.id = a.diagnostic_teacher_id
       LEFT JOIN users tu ON tu.id = t.user_id
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
    const base = { diagnostika: 0, royxatdan_otdi: 0, rad: 0 };
    for (const r of rows) base[r.status as keyof typeof base] = r.count;
    return base;
  });

  app.post("/applications", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let scheduleSlotId: string | null = null;
      const hasDiagnosticSlot =
        body.diagnosticTeacherId !== undefined &&
        body.diagnosticDate !== undefined &&
        body.diagnosticTime !== undefined;

      if (hasDiagnosticSlot) {
        // Diagnostika bir martalik voqea — aniq sanaga bog'lanadi (specific_date).
        // schedule_slots.day_of_week NOT NULL bo'lgani uchun shu sanadan hisoblab olinadi.
        const dayOfWeek = dayOfWeekOf(new Date(body.diagnosticDate! + "T00:00:00"));
        const slotRes = await client.query(
          `INSERT INTO schedule_slots
             (tenant_id, group_id, teacher_id, lesson_type, custom_name, day_of_week, start_time,
              duration_minutes, is_online, meeting_url, meeting_platform, specific_date)
           VALUES ($1, NULL, $2, 'diagnostika', $3, $4, $5, $6, true, $7, $8, $9)
           RETURNING id`,
          [
            tenantId,
            body.diagnosticTeacherId,
            `Diagnostika — ${body.fullName}`,
            dayOfWeek,
            body.diagnosticTime,
            DIAGNOSTIC_DURATION_MINUTES,
            body.meetingUrl || null,
            body.meetingPlatform,
            body.diagnosticDate,
          ]
        );
        scheduleSlotId = slotRes.rows[0].id;
      }

      const { rows } = await client.query(
        `INSERT INTO applications
           (tenant_id, full_name, phone, age, level, source, note,
            diagnostic_teacher_id, diagnostic_date, diagnostic_time,
            meeting_platform, meeting_url, schedule_slot_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          tenantId, body.fullName, body.phone, body.age ?? null, body.level ?? null, body.source, body.note ?? null,
          body.diagnosticTeacherId ?? null, body.diagnosticDate ?? null, body.diagnosticTime ?? null,
          body.meetingPlatform, body.meetingUrl || null, scheduleSlotId,
        ]
      );

      await client.query("COMMIT");
      return reply.code(201).send({ id: rows[0].id });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/applications/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const cur = await client.query(
        `SELECT schedule_slot_id AS "scheduleSlotId" FROM applications WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [id, tenantId]
      );
      if (cur.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      let scheduleSlotId: string | null = cur.rows[0].scheduleSlotId;

      const hasDiagnosticChange =
        body.diagnosticTeacherId !== undefined ||
        body.diagnosticDate !== undefined ||
        body.diagnosticTime !== undefined;

      if (body.status === "rad" && scheduleSlotId) {
        await client.query(`DELETE FROM schedule_slots WHERE id = $1`, [scheduleSlotId]);
        scheduleSlotId = null;
      } else if (
        hasDiagnosticChange &&
        body.diagnosticTeacherId &&
        body.diagnosticDate !== undefined && body.diagnosticDate !== null &&
        body.diagnosticTime
      ) {
        const dayOfWeek = dayOfWeekOf(new Date(body.diagnosticDate + "T00:00:00"));
        if (scheduleSlotId) {
          await client.query(
            `UPDATE schedule_slots SET
               teacher_id = $1, day_of_week = $2, start_time = $3, specific_date = $4,
               meeting_platform = COALESCE($5, meeting_platform),
               meeting_url = COALESCE($6, meeting_url)
             WHERE id = $7`,
            [
              body.diagnosticTeacherId, dayOfWeek, body.diagnosticTime, body.diagnosticDate,
              body.meetingPlatform ?? null, body.meetingUrl ?? null, scheduleSlotId,
            ]
          );
        } else {
          const slotRes = await client.query(
            `INSERT INTO schedule_slots
               (tenant_id, group_id, teacher_id, lesson_type, custom_name, day_of_week, start_time,
                duration_minutes, is_online, meeting_url, meeting_platform, specific_date)
             VALUES ($1, NULL, $2, 'diagnostika', NULL, $3, $4, $5, true, $6, $7, $8)
             RETURNING id`,
            [
              tenantId, body.diagnosticTeacherId, dayOfWeek, body.diagnosticTime,
              DIAGNOSTIC_DURATION_MINUTES, body.meetingUrl ?? null, body.meetingPlatform ?? "zoom", body.diagnosticDate,
            ]
          );
          scheduleSlotId = slotRes.rows[0].id;
        }
      }

      await client.query(
        `UPDATE applications SET
           status = COALESCE($1, status),
           assigned_to = COALESCE($2, assigned_to),
           note = COALESCE($3, note),
           full_name = COALESCE($4, full_name),
           phone = COALESCE($5, phone),
           age = COALESCE($6, age),
           level = COALESCE($7, level),
           diagnostic_teacher_id = COALESCE($8, diagnostic_teacher_id),
           diagnostic_date = COALESCE($9, diagnostic_date),
           diagnostic_time = COALESCE($10, diagnostic_time),
           meeting_platform = COALESCE($11, meeting_platform),
           meeting_url = COALESCE($12, meeting_url),
           schedule_slot_id = $13,
           updated_at = now()
         WHERE id = $14 AND tenant_id = $15`,
        [
          body.status ?? null, body.assignedTo ?? null, body.note ?? null,
          body.fullName ?? null, body.phone ?? null, body.age ?? null, body.level ?? null,
          body.diagnosticTeacherId ?? null, body.diagnosticDate ?? null, body.diagnosticTime ?? null,
          body.meetingPlatform ?? null, body.meetingUrl ?? null,
          scheduleSlotId, id, tenantId,
        ]
      );

      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

    // Import inline to avoid circular dep
    const { hashPassword, generateTempPassword } = await import("../auth/auth.service.js");
    const tempPassword = generateTempPassword();
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
        `UPDATE applications SET status = 'royxatdan_otdi', converted_student_id = $1, updated_at = now()
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
    const cur = await pool.query(
      `SELECT schedule_slot_id AS "scheduleSlotId" FROM applications WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    await pool.query(`DELETE FROM applications WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    const slotId = cur.rows[0]?.scheduleSlotId;
    if (slotId) await pool.query(`DELETE FROM schedule_slots WHERE id = $1`, [slotId]);
    return { ok: true };
  });
}
