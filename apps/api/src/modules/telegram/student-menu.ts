import { Bot, Keyboard } from "grammy";
import { pool } from "../../db/pool.js";
import { findUserByTelegramId } from "../auth/auth.service.js";

/** O'quvchiga /start dan keyin ko'rsatiladigan doimiy tugmali menyu —
 *  bot ichidan buyruq yozmasdan tezkor ma'lumot olish uchun. */
export const studentMenuKeyboard = new Keyboard()
  .text("📦 Mening paketim").text("📅 Jadval").row()
  .text("⭐ Mening natijam").text("📝 Uy vazifalari")
  .resized();

const DOW_NAMES = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

async function getLinkedStudent(telegramId: number): Promise<{ studentId: string; fullName: string } | null> {
  const user = await findUserByTelegramId(telegramId);
  if (!user || user.role !== "student") return null;
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [user.id]);
  if (!rows[0]) return null;
  return { studentId: rows[0].id, fullName: user.fullName };
}

export function registerStudentMenuHandlers(bot: Bot): void {
  bot.hears("📦 Mening paketim", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const student = await getLinkedStudent(telegramId);
    if (!student) {
      await ctx.reply("Bu funksiya faqat bog'langan o'quvchilar uchun.");
      return;
    }

    const { rows } = await pool.query(
      `SELECT sp.total_lessons AS "totalLessons", sp.used_lessons AS "usedLessons",
              sp.expires_at AS "expiresAt", p.name AS "packageName"
       FROM student_packages sp
       JOIN packages p ON p.id = sp.package_id
       WHERE sp.student_id = $1 AND sp.status = 'active'
       ORDER BY sp.purchased_at DESC`,
      [student.studentId]
    );

    if (rows.length === 0) {
      await ctx.reply("Sizda hozircha faol paket yo'q.");
      return;
    }

    const blocks = rows.map((r) => {
      const left = r.totalLessons - r.usedLessons;
      const expiry = r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("uz-UZ") : "muddatsiz";
      return `📦 ${r.packageName}\nQolgan: ${left} / ${r.totalLessons} dars\nMuddati: ${expiry}`;
    });
    await ctx.reply(blocks.join("\n\n"));
  });

  bot.hears("📅 Jadval", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const student = await getLinkedStudent(telegramId);
    if (!student) {
      await ctx.reply("Bu funksiya faqat bog'langan o'quvchilar uchun.");
      return;
    }

    const { rows } = await pool.query(
      `SELECT sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime", g.name AS "groupName"
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN group_members gm ON gm.group_id = sl.group_id AND gm.student_id = $1
       WHERE sl.specific_date IS NULL AND (gm.student_id = $1 OR sl.student_id = $1)
       ORDER BY sl.day_of_week, sl.start_time`,
      [student.studentId]
    );

    if (rows.length === 0) {
      await ctx.reply("Sizda hozircha jadvalga qo'yilgan dars yo'q.");
      return;
    }

    const byDay = new Map<number, string[]>();
    for (const r of rows) {
      const list = byDay.get(r.dayOfWeek) ?? [];
      list.push(`  ${String(r.startTime).slice(0, 5)} — ${r.groupName ?? "dars"}`);
      byDay.set(r.dayOfWeek, list);
    }
    const lines = [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dow, items]) => `${DOW_NAMES[dow]}:\n${items.join("\n")}`);
    await ctx.reply(`📅 Dars jadvalingiz:\n\n${lines.join("\n\n")}`);
  });

  bot.hears("⭐ Mening natijam", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const student = await getLinkedStudent(telegramId);
    if (!student) {
      await ctx.reply("Bu funksiya faqat bog'langan o'quvchilar uchun.");
      return;
    }

    const { rows } = await pool.query(
      `SELECT xp, level, streak, elo FROM student_xp WHERE student_id = $1`,
      [student.studentId]
    );
    const s = rows[0] ?? { xp: 0, level: 1, streak: 0, elo: 1200 };
    await ctx.reply(
      `⭐ ${student.fullName}ning natijalari:\n\nDaraja: ${s.level}\nXP: ${s.xp}\nELO: ${s.elo}\nStreak: ${s.streak} kun`
    );
  });

  bot.hears("📝 Uy vazifalari", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    const student = await getLinkedStudent(telegramId);
    if (!student) {
      await ctx.reply("Bu funksiya faqat bog'langan o'quvchilar uchun.");
      return;
    }

    const { rows } = await pool.query(
      `SELECT h.title, h.description, h.due_date AS "dueDate",
              EXISTS(SELECT 1 FROM homework_completions hc WHERE hc.homework_id = h.id AND hc.student_id = $1) AS done
       FROM homework h
       JOIN group_members gm ON gm.group_id = h.group_id AND gm.student_id = $1
       ORDER BY h.due_date ASC NULLS LAST, h.created_at DESC
       LIMIT 10`,
      [student.studentId]
    );

    if (rows.length === 0) {
      await ctx.reply("Hozircha uy vazifalari yo'q.");
      return;
    }

    const pending = rows.filter((r) => !r.done);
    const shown = pending.length > 0 ? pending : rows;
    // O'qituvchi description'ga havola/qo'shimcha ko'rsatma qo'yishi mumkin —
    // shuning uchun sarlavha bilan bir qatorda emas, alohida qatorda ko'rsatiladi
    // (Telegram oddiy matndagi havolalarni ham avtomatik bosiladigan qiladi).
    const blocks = shown.map((r) => {
      const status = r.done ? "✅" : "⏳";
      const due = r.dueDate ? `\n🗓 Muddat: ${new Date(r.dueDate).toLocaleDateString("uz-UZ")}` : "";
      const desc = r.description ? `\n${r.description}` : "";
      return `${status} ${r.title}${desc}${due}`;
    });
    const header = pending.length > 0 ? `📝 Bajarilmagan uy vazifalari (${pending.length}):` : "📝 Oxirgi uy vazifalari:";
    await ctx.reply(`${header}\n\n${blocks.join("\n\n")}`);
  });
}
