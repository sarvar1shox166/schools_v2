import { Bot, webhookCallback } from "grammy";
import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { env } from "../../env.js";
import { findUserByTelegramId } from "../auth/auth.service.js";

let bot: Bot | null = null;

// Webhook so'rovi haqiqatan Telegramdan kelayotganini tasdiqlaydi (X-Telegram-Bot-Api-Secret-Token) —
// bot tokenidan hosil qilinadi, shuning uchun alohida env o'zgaruvchisi shart emas.
function webhookSecret(): string {
  return createHash("sha256").update(`${env.TELEGRAM_BOT_TOKEN}:webhook`).digest("hex");
}

function buildBot(token: string): Bot {
  const b = new Bot(token);

  b.command("start", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const user = await findUserByTelegramId(telegramId);

    const openAppButton = env.APP_URL
      ? { reply_markup: { inline_keyboard: [[{ text: "📱 Ilovani ochish", web_app: { url: env.APP_URL } }]] } }
      : undefined;

    if (!user) {
      // Bog'lash faqat Mini App ichidan mumkin (u yerda Telegram initData mavjud
      // bo'ladi) — shuning uchun bu yerda ham "Ilovani ochish" tugmasi beriladi,
      // aks holda foydalanuvchi web va bot o'rtasida aylanib qoladi.
      await ctx.reply(
        "Assalomu alaykum! Hisobingiz hali Telegram bilan bog'lanmagan.\n\nBog'lash uchun quyidagi tugma orqali ilovani oching → tizimga kiring → \"Profil\" bo'limi → \"Telegram bilan bog'lash\".",
        openAppButton
      );
      return;
    }

    await ctx.reply(`Assalomu alaykum, ${user.fullName}! Hisobingiz ulangan. ✅`, openAppButton);
  });

  return b;
}

/** Faqat bir marta yaratiladi — TELEGRAM_BOT_TOKEN bo'sh bo'lsa (dev muhitda
 *  odatiy holat) null qaytaradi va funksiya to'liq no-op bo'ladi. */
export function getBot(): Bot | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  if (!bot) bot = buildBot(env.TELEGRAM_BOT_TOKEN);
  return bot;
}

export async function telegramBotRoutes(app: FastifyInstance) {
  const b = getBot();
  if (!b) return;

  await b.init();
  app.post("/telegram/webhook", webhookCallback(b, "fastify", { secretToken: webhookSecret() }));

  if (env.APP_URL) {
    try {
      await b.api.setWebhook(`${env.APP_URL}/api/v1/telegram/webhook`, { secret_token: webhookSecret() });
    } catch (err) {
      app.log.error(err, "Telegram webhook o'rnatilmadi");
    }
  }
}
