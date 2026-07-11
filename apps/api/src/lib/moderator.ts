import { pool } from "../db/pool.js";

/** Moderatorga biriktirilgan o'qituvchilar — moderator faqat shularning
 *  jadvali/davomatini ko'radi va to'g'irlaydi. */
export async function assignedTeacherIds(tenantId: string, moderatorUserId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT teacher_id AS "teacherId" FROM moderator_teachers WHERE tenant_id = $1 AND moderator_user_id = $2`,
    [tenantId, moderatorUserId]
  );
  return rows.map((r) => r.teacherId as string);
}
