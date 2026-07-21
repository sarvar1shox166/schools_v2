import type { Pool } from "pg";

export interface TeacherEarnings {
  teacherId: string;
  groupAmount: number;
  individualAmount: number;
  diagnosticAmount: number;
  totalAmount: number;
}

/** Bitta oy uchun har bir o'qituvchining ishlab topgan summasini hisoblaydi
 *  (maosh turiga qarab: per_lesson / monthly_fixed / percent_income).
 *  /payroll/generate (saqlaydi) va jonli ko'rsatish (saqlamasdan) ikkalasi
 *  ham shu funksiyadan foydalanadi — hisob-kitob mantiqi bitta joyda. */
export async function computeTeacherEarnings(pool: Pool, tenantId: string, period: string): Promise<TeacherEarnings[]> {
  const lessonRows = await pool.query(
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
    [tenantId, period]
  );
  const lessonTotalsByTeacher = new Map(lessonRows.rows.map((r) => [r.teacherId as string, r]));

  const teachersRes = await pool.query(
    `SELECT t.id AS "teacherId", COALESCE(tr.salary_type, 'per_lesson') AS "salaryType",
            COALESCE(tr.monthly_amount, 0) AS "monthlyAmount",
            COALESCE(tr.income_percent, 0) AS "incomePercent"
     FROM teachers t
     LEFT JOIN teacher_rates tr ON tr.teacher_id = t.id
     WHERE t.tenant_id = $1`,
    [tenantId]
  );

  const results: TeacherEarnings[] = [];
  for (const t of teachersRes.rows) {
    let groupAmount = 0, individualAmount = 0, diagnosticAmount = 0, totalAmount = 0;

    if (t.salaryType === "monthly_fixed") {
      totalAmount = Number(t.monthlyAmount);
    } else if (t.salaryType === "percent_income") {
      const revenueRes = await pool.query(
        `SELECT COALESCE(SUM(tx.amount), 0) AS revenue
         FROM transactions tx
         JOIN student_packages sp ON sp.id = tx.student_package_id
         JOIN group_members gm ON gm.student_id = sp.student_id
         JOIN groups g ON g.id = gm.group_id
         WHERE g.teacher_id = $1 AND tx.status = 'paid' AND to_char(tx.created_at, 'YYYY-MM') = $2`,
        [t.teacherId, period]
      );
      const revenue = Number(revenueRes.rows[0].revenue);
      totalAmount = revenue * (Number(t.incomePercent) / 100);
    } else {
      const ls = lessonTotalsByTeacher.get(t.teacherId);
      if (!ls) continue; // per_lesson, no sessions this period — nothing earned
      groupAmount = Number(ls.groupAmount);
      individualAmount = Number(ls.individualAmount);
      diagnosticAmount = Number(ls.diagnosticAmount);
      totalAmount = Number(ls.totalAmount);
    }

    results.push({ teacherId: t.teacherId, groupAmount, individualAmount, diagnosticAmount, totalAmount });
  }
  return results;
}
