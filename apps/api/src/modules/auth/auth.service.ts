import bcrypt from "bcryptjs";
import { pool } from "../../db/pool.js";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  role: "super_admin" | "admin" | "teacher" | "student";
  fullName: string;
  phone: string;
}

export async function findUserByPhone(phone: string) {
  const { rows } = await pool.query<
    AuthUser & { passwordHash: string; isActive: boolean }
  >(
    `SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", role,
            full_name AS "fullName", phone, password_hash AS "passwordHash",
            is_active AS "isActive"
     FROM users WHERE phone = $1`,
    [phone]
  );
  return rows[0] ?? null;
}

export async function findUserByTelegramId(telegramId: number) {
  const { rows } = await pool.query<AuthUser & { isActive: boolean }>(
    `SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", role,
            full_name AS "fullName", phone, is_active AS "isActive"
     FROM users WHERE telegram_id = $1`,
    [telegramId]
  );
  return rows[0] ?? null;
}

export async function linkTelegramId(userId: string, telegramId: number) {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE telegram_id = $1 AND id != $2`,
    [telegramId, userId]
  );
  if (rows.length > 0) {
    throw new Error("telegram_already_linked");
  }
  await pool.query(`UPDATE users SET telegram_id = $1, updated_at = now() WHERE id = $2`, [telegramId, userId]);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
