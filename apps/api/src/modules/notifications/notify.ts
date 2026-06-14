import type { Pool, PoolClient } from "pg";
import { sendTelegramMessage } from "./telegram-bot.js";

export async function notifyStudent(db: Pool | PoolClient, studentId: string, text: string): Promise<void> {
  const { rows } = await db.query(
    `SELECT u.telegram_id AS "telegramId" FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [studentId]
  );
  const telegramId = rows[0]?.telegramId;
  if (!telegramId) return;

  await sendTelegramMessage(Number(telegramId), text);
}

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: string;
  icon?: string;
  title: string;
  body?: string;
}

export async function createNotification(db: Pool | PoolClient, input: CreateNotificationInput): Promise<void> {
  await db.query(
    `INSERT INTO notifications (tenant_id, user_id, type, icon, title, body)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.tenantId, input.userId, input.type, input.icon ?? "bell", input.title, input.body ?? null]
  );
}
