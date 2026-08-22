import { Bot, webhookCallback } from "grammy";
import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { env } from "../../env.js";
import { pool } from "../../db/pool.js";
import { findUserByTelegramId, linkTelegramId } from "../auth/auth.service.js";
import { consumeLinkToken } from "./link-token.js";

let bot: Bot | null = null;
let botUsername: string | null = null;

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

    const openAppButton = env.APP_URL
      ? { reply_markup: { inline_keyboard: [[{ text: "📱 Ilovani ochish", web_app: { url: env.APP_URL } }]] } }
      : undefined;

    // "Telegram bilan bog'lash" tugmasi ilova ichida bosilganda /start ga
    // bir martalik token ulanib keladi (t.me/bot?start=<token>) — shu orqali
    // hisob avtomatik bog'lanadi, foydalanuvchidan qo'shimcha amal talab qilinmaydi.
    const payload = ctx.match ? String(ctx.match).trim() : "";
    if (payload) {
      const userId = await consumeLinkToken(payload);
      if (!userId) {
        await ctx.reply(
          "Havola muddati tugagan yoki allaqachon ishlatilgan. Ilovadan qaytadan \"Telegram bilan bog'lash\" tugmasini bosing."
        );
        return;
      }
      try {
        await linkTelegramId(userId, telegramId);
      } catch (err) {
        if (err instanceof Error && err.message === "telegram_already_linked") {
          await ctx.reply("Bu Telegram hisobi allaqachon boshqa foydalanuvchiga bog'langan.");
          return;
        }
        throw err;
      }
      const { rows } = await pool.query(`SELECT full_name AS "fullName" FROM users WHERE id = $1`, [userId]);
      await ctx.reply(`✅ Hisobingiz muvaffaqiyatli bog'landi, ${rows[0]?.fullName ?? ""}!`, openAppButton);
      return;
    }

    const user = await findUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        "Assalomu alaykum! Hisobingiz hali Telegram bilan bog'lanmagan.\n\nBog'lash uchun: ilovaga kiring → \"Profil\" bo'limi → \"Telegram bilan bog'lash\" tugmasini bosing.",
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

/** Bog'lash havolasini (t.me/<username>?start=...) qurish uchun kerak —
 *  bot hali init qilinmagan bo'lsa (masalan token sozlanmagan) null. */
export function getBotUsername(): string | null {
  return botUsername;
}

export async function telegramBotRoutes(app: FastifyInstance) {
  const b = getBot();
  if (!b) return;

  await b.init();
  botUsername = b.botInfo.username;
  app.post("/telegram/webhook", webhookCallback(b, "fastify", { secretToken: webhookSecret() }));

  if (env.APP_URL) {
    try {
      await b.api.setWebhook(`${env.APP_URL}/api/v1/telegram/webhook`, { secret_token: webhookSecret() });
    } catch (err) {
      app.log.error(err, "Telegram webhook o'rnatilmadi");
    }
  }
}
