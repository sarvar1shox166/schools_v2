import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const brandSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  telegram: z.string().optional(),
  logoUrl: z.string().optional(),
});

const systemSchema = z.object({
  autoOperator: z.boolean().optional(),
  debtReminder: z.boolean().optional(),
  onlinePayment: z.boolean().optional(),
  selfUnregister: z.boolean().optional(),
  telegramBot: z.boolean().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  yearStart: z.string().optional(),
});

const salaryTypeSchema = z.object({
  teacherId: z.string().uuid(),
  salaryType: z.enum(["per_lesson", "monthly_fixed", "percent_income"]),
  monthlyAmount: z.number().nonnegative().optional(),
  incomePercent: z.number().nonnegative().max(100).optional(),
  groupRate: z.number().nonnegative().optional(),
  individualRate: z.number().nonnegative().optional(),
  diagnosticRate: z.number().nonnegative().optional(),
  retentionCoef: z.number().positive().optional(),
});

async function getSetting(tenantId: string, key: string) {
  const { rows } = await pool.query(
    `SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = $2`,
    [tenantId, key]
  );
  return rows[0]?.value ?? null;
}

async function setSetting(tenantId: string, key: string, value: object) {
  await pool.query(
    `INSERT INTO tenant_settings (tenant_id, key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, updated_at = now()`,
    [tenantId, key, JSON.stringify(value)]
  );
}

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", app.requireRole("super_admin", "admin") as never);

  // ── Brand ──────────────────────────────────────────────────────────
  app.get("/settings/brand", async (request) => {
    const { tenantId } = request.user;
    const stored = await getSetting(tenantId!, "brand");
    const tenantRes = await pool.query(
      `SELECT name FROM tenants WHERE id = $1`, [tenantId]
    );
    const defaults = {
      name: tenantRes.rows[0]?.name ?? "",
      phone: "", address: "", telegram: "", logoUrl: "",
    };
    return { ...defaults, ...(stored ?? {}) };
  });

  app.put("/settings/brand", async (request, reply) => {
    const { tenantId } = request.user;
    const body = brandSchema.parse(request.body);
    const current = (await getSetting(tenantId!, "brand")) ?? {};
    await setSetting(tenantId!, "brand", { ...current, ...body });
    if (body.name) {
      await pool.query(`UPDATE tenants SET name = $1 WHERE id = $2`, [body.name, tenantId]);
    }
    return reply.send({ ok: true });
  });

  // ── System ─────────────────────────────────────────────────────────
  app.get("/settings/system", async (request) => {
    const { tenantId } = request.user;
    const stored = await getSetting(tenantId!, "system");
    const defaults = {
      autoOperator: true, debtReminder: true, onlinePayment: true,
      selfUnregister: false, telegramBot: false,
      language: "O'zbekcha", currency: "So'm (UZS)",
      timezone: "UTC+5 (Toshkent)", yearStart: "1-sentabr",
    };
    return { ...defaults, ...(stored ?? {}) };
  });

  app.put("/settings/system", async (request, reply) => {
    const { tenantId } = request.user;
    const body = systemSchema.parse(request.body);
    const current = (await getSetting(tenantId!, "system")) ?? {};
    await setSetting(tenantId!, "system", { ...current, ...body });
    return reply.send({ ok: true });
  });

  // ── Teacher salary types ────────────────────────────────────────────
  app.get("/settings/salary", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT t.id AS "teacherId", u.full_name AS "teacherName",
              COALESCE(tr.salary_type, 'per_lesson') AS "salaryType",
              COALESCE(tr.group_rate, 0) AS "groupRate",
              COALESCE(tr.individual_rate, 0) AS "individualRate",
              COALESCE(tr.diagnostic_rate, 0) AS "diagnosticRate",
              COALESCE(tr.retention_coef, 1) AS "retentionCoef",
              COALESCE(tr.monthly_amount, 0) AS "monthlyAmount",
              COALESCE(tr.income_percent, 0) AS "incomePercent"
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN teacher_rates tr ON tr.teacher_id = t.id
       WHERE t.tenant_id = $1
       ORDER BY u.full_name`,
      [tenantId]
    );
    return rows;
  });

  app.put("/settings/salary", async (request, reply) => {
    const body = salaryTypeSchema.parse(request.body);
    await pool.query(
      `INSERT INTO teacher_rates
         (teacher_id, salary_type, monthly_amount, income_percent,
          group_rate, individual_rate, diagnostic_rate, retention_coef)
       VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, 1))
       ON CONFLICT (teacher_id) DO UPDATE SET
         salary_type = $2, monthly_amount = $3, income_percent = $4,
         group_rate = COALESCE($5, teacher_rates.group_rate),
         individual_rate = COALESCE($6, teacher_rates.individual_rate),
         diagnostic_rate = COALESCE($7, teacher_rates.diagnostic_rate),
         retention_coef = COALESCE($8, teacher_rates.retention_coef)`,
      [
        body.teacherId, body.salaryType,
        body.monthlyAmount ?? 0, body.incomePercent ?? 0,
        body.groupRate ?? null, body.individualRate ?? null,
        body.diagnosticRate ?? null, body.retentionCoef ?? null,
      ]
    );
    return reply.send({ ok: true });
  });
}
