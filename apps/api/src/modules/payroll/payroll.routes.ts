import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const rateSchema = z.object({
  groupRate: z.number().nonnegative().optional(),
  individualRate: z.number().nonnegative().optional(),
  diagnosticRate: z.number().nonnegative().optional(),
  retentionCoef: z.number().positive().optional(),
});

const periodSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function payrollRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // ---- Teacher rates ----

  app.get("/teachers/:id/rate", { onRequest: [app.requireRole("super_admin", "admin", "teacher")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(
      `SELECT group_rate AS "groupRate", individual_rate AS "individualRate",
              diagnostic_rate AS "diagnosticRate", retention_coef AS "retentionCoef"
       FROM teacher_rates WHERE teacher_id = $1`,
      [id]
    );
    return rows[0] ?? { groupRate: 0, individualRate: 0, diagnosticRate: 0, retentionCoef: 1 };
  });

  app.patch("/teachers/:id/rate", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = rateSchema.parse(request.body);
    await pool.query(
      `INSERT INTO teacher_rates (teacher_id, group_rate, individual_rate, diagnostic_rate, retention_coef)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 1))
       ON CONFLICT (teacher_id) DO UPDATE SET
         group_rate = COALESCE($2, teacher_rates.group_rate),
         individual_rate = COALESCE($3, teacher_rates.individual_rate),
         diagnostic_rate = COALESCE($4, teacher_rates.diagnostic_rate),
         retention_coef = COALESCE($5, teacher_rates.retention_coef)`,
      [id, body.groupRate ?? null, body.individualRate ?? null, body.diagnosticRate ?? null, body.retentionCoef ?? null]
    );
    return { ok: true };
  });

  // ---- Teacher's own lessons & income ----

  app.get("/teacher/lessons", { onRequest: [app.requireRole("teacher")] }, async (request) => {
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return [];

    const { rows } = await pool.query(
      `SELECT ls.id, ls.date, ls.lesson_type AS "lessonType", ls.students_count AS "studentsCount",
              ls.amount, g.name AS "groupName"
       FROM lesson_sessions ls
       JOIN groups g ON g.id = ls.group_id
       WHERE ls.teacher_id = $1
       ORDER BY ls.date DESC
       LIMIT 50`,
      [teacherId]
    );
    return rows;
  });

  app.get("/teacher/income", { onRequest: [app.requireRole("teacher")] }, async (request) => {
    const { period } = periodSchema.parse(request.query);
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return { groupAmount: 0, individualAmount: 0, diagnosticAmount: 0, totalAmount: 0, sessions: [] };

    const { rows } = await pool.query(
      `SELECT ls.id, ls.date, ls.lesson_type AS "lessonType", ls.students_count AS "studentsCount",
              ls.amount, g.name AS "groupName"
       FROM lesson_sessions ls
       JOIN groups g ON g.id = ls.group_id
       WHERE ls.teacher_id = $1 AND to_char(ls.date, 'YYYY-MM') = $2
       ORDER BY ls.date`,
      [teacherId, period]
    );

    const totals = rows.reduce(
      (acc, r) => {
        const amount = Number(r.amount);
        if (r.lessonType === "group") acc.groupAmount += amount;
        else if (r.lessonType === "individual") acc.individualAmount += amount;
        else acc.diagnosticAmount += amount;
        acc.totalAmount += amount;
        return acc;
      },
      { groupAmount: 0, individualAmount: 0, diagnosticAmount: 0, totalAmount: 0 }
    );

    return { ...totals, sessions: rows };
  });

  // ---- Admin payroll ----

  app.get("/payroll", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { period } = periodSchema.parse(request.query);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT pr.id, pr.teacher_id AS "teacherId", u.full_name AS "teacherName", pr.period,
              pr.group_amount AS "groupAmount", pr.individual_amount AS "individualAmount",
              pr.diagnostic_amount AS "diagnosticAmount", pr.total_amount AS "totalAmount",
              pr.generated_at AS "generatedAt"
       FROM payroll_records pr
       JOIN teachers t ON t.id = pr.teacher_id
       JOIN users u ON u.id = t.user_id
       WHERE pr.period = $1 AND t.tenant_id = $2
       ORDER BY u.full_name`,
      [period, tenantId]
    );
    return rows;
  });

  app.post("/payroll/generate", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = periodSchema.parse(request.body);
    const { tenantId } = request.user;

    const { rows } = await pool.query(
      `SELECT
         ls.teacher_id AS "teacherId",
         SUM(CASE WHEN ls.lesson_type = 'group' THEN ls.amount ELSE 0 END) AS "groupAmount",
         SUM(CASE WHEN ls.lesson_type = 'individual' THEN ls.amount ELSE 0 END) AS "individualAmount",
         SUM(CASE WHEN ls.lesson_type = 'diagnostic' THEN ls.amount ELSE 0 END) AS "diagnosticAmount",
         SUM(ls.amount) AS "totalAmount"
       FROM lesson_sessions ls
       JOIN teachers t ON t.id = ls.teacher_id
       WHERE t.tenant_id = $1 AND to_char(ls.date, 'YYYY-MM') = $2 AND ls.teacher_id IS NOT NULL
       GROUP BY ls.teacher_id`,
      [tenantId, body.period]
    );

    for (const r of rows) {
      await pool.query(
        `INSERT INTO payroll_records (teacher_id, period, group_amount, individual_amount, diagnostic_amount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (teacher_id, period) DO UPDATE SET
           group_amount = EXCLUDED.group_amount, individual_amount = EXCLUDED.individual_amount,
           diagnostic_amount = EXCLUDED.diagnostic_amount, total_amount = EXCLUDED.total_amount,
           generated_at = now()`,
        [r.teacherId, body.period, r.groupAmount, r.individualAmount, r.diagnosticAmount, r.totalAmount]
      );
    }

    return reply.code(201).send({ ok: true, count: rows.length });
  });
}
