import { randomBytes } from "node:crypto";
import { pool } from "../../db/pool.js";

// Telegramning start_param maydoni faqat [A-Za-z0-9_-] belgilariga ruxsat beradi
// va ~64 belgigacha — shuning uchun tokenni o'zida ma'lumot tashiydigan (imzolangan)
// qilib emas, balki tasodifiy va bazada saqlanadigan (bir martalik) qilib qurdik.
const TOKEN_TTL_MS = 10 * 60_000;

export async function createLinkToken(userId: string): Promise<string> {
  const token = randomBytes(16).toString("base64url");
  await pool.query(
    `INSERT INTO telegram_link_tokens (token, user_id) VALUES ($1, $2)`,
    [token, userId]
  );
  // Eskirgan (ishlatilmagan) tokenlarni shu yerda tozalab boramiz — alohida
  // tozalash joby shart emas, hajmi kichik va kam yaratiladi.
  await pool.query(
    `DELETE FROM telegram_link_tokens WHERE created_at < now() - ($1 || ' milliseconds')::interval`,
    [TOKEN_TTL_MS]
  );
  return token;
}

/** Tokenni bir martalik iste'mol qiladi — topilsa va muddati o'tmagan bo'lsa
 *  darhol o'chiriladi va tegishli userId qaytariladi, aks holda null. */
export async function consumeLinkToken(token: string): Promise<string | null> {
  const { rows } = await pool.query(
    `DELETE FROM telegram_link_tokens
     WHERE token = $1 AND created_at >= now() - ($2 || ' milliseconds')::interval
     RETURNING user_id AS "userId"`,
    [token, TOKEN_TTL_MS]
  );
  return rows[0]?.userId ?? null;
}
