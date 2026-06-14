import { env } from "../../env.js";

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Notifications are best-effort; failures must not break the calling flow.
  }
}
