import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { dayOfWeekOf } from "../../lib/schedule-dates.js";
import { createStudentAccount, PhoneTakenError } from "./student-account.js";

const convertSchema = z.object({
  diagnosticTeacherId: z.string().uuid(),
  diagnosticDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diagnosticTime: z.string().regex(/^\d{2}:\d{2}$/),
  meetingPlatform: z.enum(["zoom", "meet"]).default("zoom"),
  meetingUrl: z.string().url().optional().or(z.literal("")),
});

const DIAGNOSTIC_DURATION_MINUTES = 60;
const LEAD_ROLES = ["super_admin", "admin", "assistant_admin", "operator"] as const;

/** Landing sahifadan kelgan xom so'rovlar ("Lidlar") — Arizalar (CRM)dan
 *  ataylab ajratilgan alohida bo'lim. Admin ko'rib chiqib, kerak bo'lsa
 *  "Diagnostikaga o'tkazish" orqali to'liq arizaga aylantiradi. */
export async function leadsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", app.requireRole(...LEAD_ROLES) as never);

  app.get("/leads", async (request) => {
    const { tenantId } = request.user;
    const { status } = request.query as { status?: string };
    const params: unknown[] = [tenantId];
    let where = "tenant_id = $1";
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT id, full_name AS "fullName", phone, age, level, status,
              converted_application_id AS "convertedApplicationId", created_at AS "createdAt"
       FROM leads WHERE ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  });

  app.get("/leads/stats", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM leads WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    );
    const base = { yangi: 0, otkazildi: 0, rad: 0 };
    for (const r of rows) base[r.status as keyof typeof base] = r.count;
    return base;
  });

  app.patch("/leads/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const body = z.object({ status: z.enum(["yangi", "rad"]) }).parse(request.body);

    const res = await pool.query(
      `UPDATE leads SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING id`,
      [body.status, id, tenantId]
    );
    if (!res.rows[0]) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // Lidni diagnostika darsi bilan to'liq arizaga aylantiradi — o'quvchi
  // hisobi, dars jadvali va Arizalar yozuvi shu yerda bir yo'la yaratiladi.
  app.post("/leads/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const body = convertSchema.parse(request.body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const leadRes = await client.query(
        `SELECT full_name AS "fullName", phone, age, level, status
         FROM leads WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [id, tenantId]
      );
      const lead = leadRes.rows[0];
      if (!lead) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      if (lead.status !== "yangi") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "already_processed" });
      }

      const created = await createStudentAccount(client, tenantId!, {
        fullName: lead.fullName, phone: lead.phone, age: lead.age, level: lead.level,
      });

      const dayOfWeek = dayOfWeekOf(new Date(body.diagnosticDate + "T00:00:00"));
      const slotRes = await client.query(
        `INSERT INTO schedule_slots
           (tenant_id, group_id, teacher_id, student_id, lesson_type, custom_name, day_of_week, start_time,
            duration_minutes, is_online, meeting_url, meeting_platform, specific_date)
         VALUES ($1, NULL, $2, $3, 'diagnostika', $4, $5, $6, $7, true, $8, $9, $10)
         RETURNING id`,
        [
          tenantId, body.diagnosticTeacherId, created.studentId, `Diagnostika — ${lead.fullName}`,
          dayOfWeek, body.diagnosticTime, DIAGNOSTIC_DURATION_MINUTES,
          body.meetingUrl || null, body.meetingPlatform, body.diagnosticDate,
        ]
      );
      const scheduleSlotId = slotRes.rows[0].id;

      const appRes = await client.query(
        `INSERT INTO applications
           (tenant_id, full_name, phone, age, level, source, diagnostic_teacher_id, diagnostic_date,
            diagnostic_time, meeting_platform, meeting_url, schedule_slot_id, converted_student_id)
         VALUES ($1, $2, $3, $4, $5, 'website', $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          tenantId, lead.fullName, lead.phone, lead.age, lead.level,
          body.diagnosticTeacherId, body.diagnosticDate, body.diagnosticTime,
          body.meetingPlatform, body.meetingUrl || null, scheduleSlotId, created.studentId,
        ]
      );

      await client.query(
        `UPDATE leads SET status = 'otkazildi', converted_application_id = $1, updated_at = now() WHERE id = $2`,
        [appRes.rows[0].id, id]
      );

      await client.query("COMMIT");
      return reply.code(201).send({
        applicationId: appRes.rows[0].id,
        studentId: created.studentId,
        tempPassword: created.tempPassword,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err instanceof PhoneTakenError) return reply.code(409).send({ error: "phone_taken", message: err.message });
      throw err;
    } finally {
      client.release();
    }
  });
}
