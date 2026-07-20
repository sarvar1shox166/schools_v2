import type { FastifyInstance } from "fastify";
import type { PoolClient } from "pg";
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

class PhoneTakenError extends Error {}

/** Diagnostika belgilangan arizadan darhol o'quvchi hisobi yaratadi — shu bilan
 *  arizaga login/parol berish mumkin bo'ladi va diagnostika darsi o'quvchining
 *  o'z jadvalida (schedule_slots.student_id orqali) ko'rinadi. */
async function createStudentAccount(
  client: PoolClient,
  tenantId: string,
  info: { fullName: string; phone: string; age?: number | null; level?: string | null }
): Promise<{ studentId: string; tempPassword: string }> {
  const existing = await client.query(`SELECT 1 FROM users WHERE phone = $1`, [info.phone]);
  if (existing.rows.length > 0) {
    throw new PhoneTakenError("Bu telefon raqami bilan foydalanuvchi allaqachon mavjud");
  }

  const { hashPassword, generateTempPassword } = await import("../auth/auth.service.js");
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const userRes = await client.query(
    `INSERT INTO users (tenant_id, role, full_name, phone, password_hash, login)
     VALUES ($1, 'student', $2, $3, $4, $3) RETURNING id`,
    [tenantId, info.fullName, info.phone, passwordHash]
  );
  const studentRes = await client.query(
    `INSERT INTO students (user_id, tenant_id, level, age) VALUES ($1, $2, $3, $4) RETURNING id`,
    [userRes.rows[0].id, tenantId, info.level ?? null, info.age ?? null]
  );
  return { studentId: studentRes.rows[0].id, tempPassword };
}

export async function applicationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/applications", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request) => {
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

  app.get("/applications/stats", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM applications WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    );
    const base = { diagnostika: 0, royxatdan_otdi: 0, rad: 0 };
    for (const r of rows) base[r.status as keyof typeof base] = r.count;
    return base;
  });

  app.post("/applications", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let scheduleSlotId: string | null = null;
      let studentId: string | null = null;
      let tempPassword: string | null = null;
      const hasDiagnosticSlot =
        body.diagnosticTeacherId !== undefined &&
        body.diagnosticDate !== undefined &&
        body.diagnosticTime !== undefined;

      if (hasDiagnosticSlot) {
        // Diagnostika bilan birga o'quvchi hisobi darhol yaratiladi — shu bilan
        // login/parol berish va darsni o'quvchi jadvalida ko'rsatish mumkin bo'ladi.
        const created = await createStudentAccount(client, tenantId!, {
          fullName: body.fullName, phone: body.phone, age: body.age, level: body.level,
        });
        studentId = created.studentId;
        tempPassword = created.tempPassword;

        // Diagnostika bir martalik voqea — aniq sanaga bog'lanadi (specific_date).
        // schedule_slots.day_of_week NOT NULL bo'lgani uchun shu sanadan hisoblab olinadi.
        const dayOfWeek = dayOfWeekOf(new Date(body.diagnosticDate! + "T00:00:00"));
        const slotRes = await client.query(
          `INSERT INTO schedule_slots
             (tenant_id, group_id, teacher_id, student_id, lesson_type, custom_name, day_of_week, start_time,
              duration_minutes, is_online, meeting_url, meeting_platform, specific_date)
           VALUES ($1, NULL, $2, $3, 'diagnostika', $4, $5, $6, $7, true, $8, $9, $10)
           RETURNING id`,
          [
            tenantId,
            body.diagnosticTeacherId,
            studentId,
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
            meeting_platform, meeting_url, schedule_slot_id, converted_student_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          tenantId, body.fullName, body.phone, body.age ?? null, body.level ?? null, body.source, body.note ?? null,
          body.diagnosticTeacherId ?? null, body.diagnosticDate ?? null, body.diagnosticTime ?? null,
          body.meetingPlatform, body.meetingUrl || null, scheduleSlotId, studentId,
        ]
      );

      await client.query("COMMIT");
      return reply.code(201).send({ id: rows[0].id, studentId, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof PhoneTakenError) return reply.code(409).send({ error: "phone_taken", message: err.message });
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/applications/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const cur = await client.query(
        `SELECT schedule_slot_id AS "scheduleSlotId", converted_student_id AS "convertedStudentId",
                full_name AS "fullName", phone, age, level
         FROM applications WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [id, tenantId]
      );
      if (cur.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      let scheduleSlotId: string | null = cur.rows[0].scheduleSlotId;
      let studentId: string | null = cur.rows[0].convertedStudentId;
      let tempPassword: string | null = null;

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
          // Diagnostika birinchi marta shu tahrirlashda belgilanmoqda — agar arizaga
          // hali o'quvchi hisobi biriktirilmagan bo'lsa, hozir yaratiladi.
          if (!studentId) {
            const created = await createStudentAccount(client, tenantId!, {
              fullName: body.fullName ?? cur.rows[0].fullName,
              phone: body.phone ?? cur.rows[0].phone,
              age: body.age ?? cur.rows[0].age,
              level: body.level ?? cur.rows[0].level,
            });
            studentId = created.studentId;
            tempPassword = created.tempPassword;
          }

          const slotRes = await client.query(
            `INSERT INTO schedule_slots
               (tenant_id, group_id, teacher_id, student_id, lesson_type, custom_name, day_of_week, start_time,
                duration_minutes, is_online, meeting_url, meeting_platform, specific_date)
             VALUES ($1, NULL, $2, $3, 'diagnostika', NULL, $4, $5, $6, true, $7, $8, $9)
             RETURNING id`,
            [
              tenantId, body.diagnosticTeacherId, studentId, dayOfWeek, body.diagnosticTime,
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
           converted_student_id = COALESCE($14, converted_student_id),
           updated_at = now()
         WHERE id = $15 AND tenant_id = $16`,
        [
          body.status ?? null, body.assignedTo ?? null, body.note ?? null,
          body.fullName ?? null, body.phone ?? null, body.age ?? null, body.level ?? null,
          body.diagnosticTeacherId ?? null, body.diagnosticDate ?? null, body.diagnosticTime ?? null,
          body.meetingPlatform ?? null, body.meetingUrl ?? null,
          scheduleSlotId, studentId, id, tenantId,
        ]
      );

      await client.query("COMMIT");
      return { ok: true, studentId, tempPassword };
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof PhoneTakenError) return reply.code(409).send({ error: "phone_taken", message: err.message });
      throw err;
    } finally {
      client.release();
    }
  });

  // Convert application to student
  app.post("/applications/:id/convert", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appRes = await client.query(
        `SELECT full_name, phone, age, level, converted_student_id AS "convertedStudentId"
         FROM applications WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [id, tenantId]
      );
      if (appRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      const app_ = appRes.rows[0];

      // Diagnostika bosqichida o'quvchi hisobi allaqachon yaratilgan bo'lishi mumkin
      // (POST/PATCH /applications) — bunda qayta yaratmasdan faqat statusni yangilaymiz.
      if (app_.convertedStudentId) {
        await client.query(
          `UPDATE applications SET status = 'royxatdan_otdi', updated_at = now() WHERE id = $1`,
          [id]
        );
        await client.query("COMMIT");
        return reply.code(200).send({ studentId: app_.convertedStudentId, tempPassword: null, alreadyExisted: true });
      }

      const { studentId, tempPassword } = await createStudentAccount(client, tenantId!, {
        fullName: app_.full_name, phone: app_.phone, age: app_.age, level: app_.level,
      });
      await client.query(
        `UPDATE applications SET status = 'royxatdan_otdi', converted_student_id = $1, updated_at = now()
         WHERE id = $2`,
        [studentId, id]
      );
      await client.query("COMMIT");
      return reply.code(201).send({ studentId, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof PhoneTakenError) return reply.code(409).send({ error: "phone_taken", message: err.message });
      throw err;
    } finally {
      client.release();
    }
  });

  app.delete("/applications/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const cur = await pool.query(
      `SELECT schedule_slot_id AS "scheduleSlotId", converted_student_id AS "convertedStudentId", status
       FROM applications WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    await pool.query(`DELETE FROM applications WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    const slotId = cur.rows[0]?.scheduleSlotId;
    if (slotId) await pool.query(`DELETE FROM schedule_slots WHERE id = $1`, [slotId]);

    // Diagnostika bosqichida arizadan avtomatik yaratilgan (lekin hali "ro'yxatdan
    // o'tdi" holatiga o'tkazilmagan, ya'ni haqiqiy o'quvchi bo'lmagan) hisobni ham
    // tozalaymiz — aks holda telefon raqami band bo'lib qolib, xuddi shu raqam bilan
    // yangi ariza qo'shib bo'lmay qoladi. Real bog'liq ma'lumot bo'lsa (masalan
    // allaqachon guruh/davomat) xatolik jim yutiladi — ariza o'chirish shu sababli
    // to'xtab qolmasligi kerak.
    const studentId = cur.rows[0]?.convertedStudentId;
    if (studentId && cur.rows[0]?.status !== "royxatdan_otdi") {
      try {
        const userRes = await pool.query(`SELECT user_id AS "userId" FROM students WHERE id = $1`, [studentId]);
        if (userRes.rows[0]) await pool.query(`DELETE FROM users WHERE id = $1`, [userRes.rows[0].userId]);
      } catch {
        // Bog'liq ma'lumot (davomat, guruh a'zoligi va h.k.) bo'lsa — hisobni
        // o'chirmasdan qoldiramiz, ariza o'chirish baribir muvaffaqiyatli tugaydi.
      }
    }

    return { ok: true };
  });
}
