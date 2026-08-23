import type { PoolClient } from "pg";

export class PhoneTakenError extends Error {}

/** Diagnostika belgilangan arizadan (yoki lead'dan) darhol o'quvchi hisobi
 *  yaratadi — shu bilan login/parol berish va darsni o'quvchining o'z
 *  jadvalida (schedule_slots.student_id orqali) ko'rsatish mumkin bo'ladi.
 *  Arizalar va Lidlar bo'limlari ikkalasi ham shu funksiyadan foydalanadi. */
export async function createStudentAccount(
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
