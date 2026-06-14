import type { FastifyInstance } from "fastify";
import { pool } from "../../db/pool.js";

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", app.requireRole("super_admin", "admin"));

  // Monthly income for the last 6 months
  app.get("/reports/income-summary", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT to_char(d.month, 'YYYY-MM') AS month,
              COALESCE(SUM(t.amount), 0) AS amount
       FROM (
         SELECT date_trunc('month', now()) - (n || ' months')::interval AS month
         FROM generate_series(0, 5) AS n
       ) d
       LEFT JOIN transactions t ON t.tenant_id = $1 AND t.status = 'paid'
         AND date_trunc('month', t.created_at) = d.month
       GROUP BY d.month
       ORDER BY d.month`,
      [tenantId]
    );
    return rows.map((r) => ({ month: r.month, amount: Number(r.amount) }));
  });

  // Income breakdown by package
  app.get("/reports/income-breakdown", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT p.name, COALESCE(SUM(t.amount), 0) AS amount, COUNT(*)::int AS count
       FROM transactions t
       JOIN student_packages sp ON sp.id = t.student_package_id
       JOIN packages p ON p.id = sp.package_id
       WHERE t.tenant_id = $1 AND t.status = 'paid'
       GROUP BY p.name
       ORDER BY amount DESC`,
      [tenantId]
    );
    return rows.map((r) => ({ name: r.name, amount: Number(r.amount), count: r.count }));
  });

  // Income breakdown by payment method
  app.get("/reports/payment-methods", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT method, COALESCE(SUM(amount), 0) AS amount, COUNT(*)::int AS count
       FROM transactions
       WHERE tenant_id = $1 AND status = 'paid'
       GROUP BY method
       ORDER BY amount DESC`,
      [tenantId]
    );
    return rows.map((r) => ({ method: r.method, amount: Number(r.amount), count: r.count }));
  });

  // Overview KPIs
  app.get("/reports/overview", async (request) => {
    const { tenantId } = request.user;

    const [students, teachers, groups, monthIncome, pendingPayments, attendance] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM students WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int AS count FROM teachers WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int AS count FROM groups WHERE tenant_id = $1`, [tenantId]),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS amount FROM transactions
         WHERE tenant_id = $1 AND status = 'paid' AND date_trunc('month', created_at) = date_trunc('month', now())`,
        [tenantId]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM transactions WHERE tenant_id = $1 AND status = 'pending'`, [tenantId]),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE ar.status = 'p')::int AS present,
           COUNT(*)::int AS total
         FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         WHERE s.tenant_id = $1 AND ar.date >= now() - interval '30 days'`,
        [tenantId]
      ),
    ]);

    const att = attendance.rows[0];
    const attendanceRate = att.total > 0 ? Math.round((att.present / att.total) * 1000) / 10 : 0;

    return {
      studentsCount: students.rows[0].count,
      teachersCount: teachers.rows[0].count,
      groupsCount: groups.rows[0].count,
      monthIncome: Number(monthIncome.rows[0].amount),
      pendingPayments: pendingPayments.rows[0].count,
      attendanceRate,
    };
  });

  // New students per month for the last 6 months
  app.get("/reports/student-growth", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT to_char(d.month, 'YYYY-MM') AS month,
              COUNT(s.id)::int AS count
       FROM (
         SELECT date_trunc('month', now()) - (n || ' months')::interval AS month
         FROM generate_series(0, 5) AS n
       ) d
       LEFT JOIN students s ON s.tenant_id = $1
         AND date_trunc('month', s.joined_at) = d.month
       GROUP BY d.month
       ORDER BY d.month`,
      [tenantId]
    );
    return rows.map((r) => ({ month: r.month, count: r.count }));
  });

  // Extra income KPIs: year-to-date total, plan-completion %, average per student.
  // "Reja bajarilishi %" (plan completion) — there is no explicit monthly
  // plan/target concept in the schema, so it is derived as:
  //   current month income / average income of the previous 3 months * 100
  // (the trailing 3-month average acts as the implicit "plan").
  app.get("/reports/income-extra", async (request) => {
    const { tenantId } = request.user;

    const [yearTotal, currentMonth, prevMonths, students] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS amount FROM transactions
         WHERE tenant_id = $1 AND status = 'paid'
           AND date_trunc('year', created_at) = date_trunc('year', now())`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS amount FROM transactions
         WHERE tenant_id = $1 AND status = 'paid'
           AND date_trunc('month', created_at) = date_trunc('month', now())`,
        [tenantId]
      ),
      pool.query(
        `SELECT COALESCE(AVG(month_amount), 0) AS avg_amount FROM (
           SELECT date_trunc('month', now()) - (n || ' months')::interval AS month,
                  COALESCE((
                    SELECT SUM(amount) FROM transactions t
                    WHERE t.tenant_id = $1 AND t.status = 'paid'
                      AND date_trunc('month', t.created_at) = date_trunc('month', now()) - (n || ' months')::interval
                  ), 0) AS month_amount
           FROM generate_series(1, 3) AS n
         ) m`,
        [tenantId]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM students WHERE tenant_id = $1`, [tenantId]),
    ]);

    const yearTotalAmount = Number(yearTotal.rows[0].amount);
    const currentMonthAmount = Number(currentMonth.rows[0].amount);
    const avgPrevMonths = Number(prevMonths.rows[0].avg_amount);
    const planCompletionPct = avgPrevMonths > 0
      ? Math.round((currentMonthAmount / avgPrevMonths) * 1000) / 10
      : 0;
    const studentsCount = students.rows[0].count;
    const avgPerStudent = studentsCount > 0 ? Math.round(yearTotalAmount / studentsCount) : 0;

    return {
      yearTotal: yearTotalAmount,
      planCompletionPct,
      avgPerStudent,
    };
  });

  // Group fill rate: group_members count / groups.capacity
  app.get("/reports/group-fill-rate", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.color, g.capacity,
              COUNT(gm.student_id)::int AS count
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.tenant_id = $1
       GROUP BY g.id, g.name, g.color, g.capacity
       ORDER BY g.name`,
      [tenantId]
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      capacity: r.capacity,
      count: r.count,
    }));
  });
}
