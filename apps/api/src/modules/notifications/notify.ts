import type { Pool, PoolClient } from "pg";
import { sendTelegramMessage } from "./telegram-bot.js";

export async function notifyStudent(
  db: Pool | PoolClient,
  studentId: string,
  text: string,
  opts?: { title?: string; type?: string; icon?: string }
): Promise<void> {
  const { rows } = await db.query(
    `SELECT u.id AS "userId", u.tenant_id AS "tenantId", u.telegram_id AS "telegramId"
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [studentId]
  );
  const row = rows[0];
  if (!row) return;

  // In-app notification is the primary channel — Telegram is a best-effort extra,
  // only reachable when the student has linked their account (see auth.routes.ts).
  await createNotification(db, {
    tenantId: row.tenantId,
    userId: row.userId,
    type: opts?.type ?? "system",
    icon: opts?.icon ?? "bell",
    title: opts?.title ?? "Bildirishnoma",
    body: text,
  });

  if (row.telegramId) {
    await sendTelegramMessage(Number(row.telegramId), text);
  }
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
