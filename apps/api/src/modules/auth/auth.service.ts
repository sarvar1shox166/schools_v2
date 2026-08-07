import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { pool } from "../../db/pool.js";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  role: "super_admin" | "admin" | "teacher" | "student";
  fullName: string;
  phone: string;
  login: string;
  avatarUrl: string | null;
}

export async function findUserByLogin(loginValue: string) {
  const { rows } = await pool.query<
    AuthUser & { passwordHash: string; isActive: boolean; tokenVersion: number }
  >(
    `SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", role,
            full_name AS "fullName", phone, login, avatar_url AS "avatarUrl",
            password_hash AS "passwordHash",
            is_active AS "isActive", token_version AS "tokenVersion"
     FROM users WHERE login = $1 OR phone = $1`,
    [loginValue]
  );
  return rows[0] ?? null;
}

/** Refresh paytida tekshiriladigan joriy holat: token hali kuchda va hisob faolmi. */
export async function getUserAuthState(userId: string) {
  const { rows } = await pool.query<{ tokenVersion: number; isActive: boolean }>(
    `SELECT token_version AS "tokenVersion", is_active AS "isActive" FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

/** Foydalanuvchining barcha refresh-tokenlarini bekor qiladi (token_version++). */
export async function revokeAllSessions(userId: string) {
  await pool.query(`UPDATE users SET token_version = token_version + 1 WHERE id = $1`, [userId]);
}

/** @deprecated use findUserByLogin */
export const findUserByPhone = findUserByLogin;

export async function findUserByTelegramId(telegramId: number) {
  const { rows } = await pool.query<AuthUser & { isActive: boolean; tokenVersion: number }>(
    `SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", role,
            full_name AS "fullName", phone, avatar_url AS "avatarUrl", is_active AS "isActive",
            token_version AS "tokenVersion"
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

/** 12 hex chars (48 bits) — brute-forcing this within a login rate limit is infeasible. */
export function generateTempPassword() {
  return randomBytes(6).toString("hex");
}
