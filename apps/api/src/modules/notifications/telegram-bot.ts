import { env } from "../../env.js";

export interface TelegramButton {
  text: string;
  url: string;
}

export async function sendTelegramMessage(chatId: number, text: string, buttons?: TelegramButton[]): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(buttons?.length
          ? { reply_markup: { inline_keyboard: [buttons.map((b) => ({ text: b.text, url: b.url }))] } }
          : {}),
      }),
    });
  } catch {
    // Notifications are best-effort; failures must not break the calling flow.
  }
}
