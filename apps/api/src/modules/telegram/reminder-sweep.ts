import { pool } from "../../db/pool.js";
import { dayOfWeekOf, toDateStr, todayStr } from "../../lib/schedule-dates.js";
import { sendTelegramMessage } from "../notifications/telegram-bot.js";
import { signJoinToken } from "./join-link.js";
import { env } from "../../env.js";

// Har daqiqada tekshiradi — "5 daqiqa qoldi" kabi eslatmalar aniq vaqtda
// yuborilishi uchun boshqa sweep'larga qaraganda tezroq.
const SWEEP_INTERVAL_MS = 60_000;

type ReminderKind = "student_60min" | "student_5min" | "student_start" | "teacher_5min" | "teacher_daily";

/** Bir marta yuborilganini kafolatlaydi — yozuv muvaffaqiyatli qo'shilsa
 *  (hali yuborilmagan bo'lsa) true, aks holda (allaqachon yuborilgan) false. */
async function markSent(
  kind: ReminderKind,
  recipientUserId: string,
  date: string,
  scheduleSlotId: string | null
): Promise<boolean> {
  const { rows } = await pool.query(
    `INSERT INTO telegram_reminders_sent (schedule_slot_id, date, kind, recipient_user_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [scheduleSlotId, date, kind, recipientUserId]
  );
  return rows.length > 0;
}

async function getTelegramEnabledTenantIds(): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT tenant_id AS "tenantId" FROM tenant_settings
     WHERE key = 'system' AND (value->>'telegramBot')::boolean = true`
  );
  return new Set(rows.map((r) => r.tenantId as string));
}

interface SlotRow {
  id: string;
  tenantId: string;
  groupId: string | null;
  studentId: string | null;
  teacherId: string | null;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number | null;
  specificDate: string | null;
  meetingUrl: string | null;
  groupName: string | null;
}

async function isExcepted(tenantId: string, date: string, scheduleSlotId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM schedule_exceptions
     WHERE tenant_id = $1 AND date = $2 AND (schedule_slot_id = $3 OR schedule_slot_id IS NULL)
       AND kind IN ('cancelled', 'holiday', 'rescheduled')`,
    [tenantId, date, scheduleSlotId]
  );
  return rows.length > 0;
}

async function notifyStudentsForSlot(
  slot: SlotRow,
  dateStr: string,
  kind: "student_60min" | "student_5min" | "student_start",
  text: string
): Promise<void> {
  const { rows: students } = await pool.query(
    `SELECT s.id AS "studentId", u.id AS "userId", u.telegram_id AS "telegramId"
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE u.telegram_id IS NOT NULL AND (
       s.id IN (SELECT student_id FROM group_members WHERE group_id = $1)
       OR s.id = $2
     )`,
    [slot.groupId, slot.studentId]
  );

  for (const student of students) {
    const sent = await markSent(kind, student.userId, dateStr, slot.id);
    if (!sent) continue;

    if (kind === "student_start" && env.APP_URL) {
      const token = signJoinToken({ studentId: student.studentId, scheduleSlotId: slot.id, date: dateStr });
      await sendTelegramMessage(Number(student.telegramId), text, [
        { text: "🎥 Darsga kirish", url: `${env.APP_URL}/api/v1/telegram/join?t=${token}` },
      ]);
    } else {
      await sendTelegramMessage(Number(student.telegramId), text);
    }
  }
}

async function notifyTeacherForSlot(slot: SlotRow, dateStr: string, text: string): Promise<void> {
  if (!slot.teacherId) return;
  const { rows } = await pool.query(
    `SELECT u.id AS "userId", u.telegram_id AS "telegramId"
     FROM teachers t JOIN users u ON u.id = t.user_id
     WHERE t.id = $1 AND u.telegram_id IS NOT NULL`,
    [slot.teacherId]
  );
  const teacher = rows[0];
  if (!teacher) return;

  const sent = await markSent("teacher_5min", teacher.userId, dateStr, slot.id);
  if (!sent) return;
  await sendTelegramMessage(Number(teacher.telegramId), text);
}

async function sweepLessonReminders(enabledTenants: Set<string>): Promise<void> {
  const now = new Date();
  const dateStr = toDateStr(now);
  const dow = dayOfWeekOf(now);

  const { rows: slots } = await pool.query<SlotRow>(
    `SELECT sl.id, sl.tenant_id AS "tenantId", sl.group_id AS "groupId", sl.student_id AS "studentId",
            COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
            sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
            sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate",
            sl.meeting_url AS "meetingUrl", g.name AS "groupName"
     FROM schedule_slots sl
     LEFT JOIN groups g ON g.id = sl.group_id`
  );

  for (const slot of slots) {
    if (!enabledTenants.has(slot.tenantId)) continue;

    const occursToday = slot.specificDate
      ? toDateStr(new Date(slot.specificDate)) === dateStr
      : slot.dayOfWeek === dow;
    if (!occursToday) continue;

    const [h, m] = String(slot.startTime).split(":").map(Number);
    const start = new Date(dateStr + "T00:00:00");
    start.setHours(h, m, 0, 0);
    const diffMin = (start.getTime() - now.getTime()) / 60_000;

    // Eslatma yuborish uchun mantiqiy oraliqdan tashqarida bo'lsa, keraksiz
    // schedule_exceptions so'rovini o'tkazib yuboramiz.
    if (diffMin > 61 || diffMin < -2) continue;
    if (await isExcepted(slot.tenantId, dateStr, slot.id)) continue;

    const groupName = slot.groupName ?? "dars";
    const timeLabel = String(slot.startTime).slice(0, 5);

    if (diffMin <= 60 && diffMin > 58) {
      await notifyStudentsForSlot(slot, dateStr, "student_60min", `⏰ Eslatma: bugun soat ${timeLabel} da "${groupName}" darsi boshlanadi (1 soat qoldi).`);
    }
    if (diffMin <= 5 && diffMin > 3) {
      await notifyStudentsForSlot(slot, dateStr, "student_5min", `⏰ Diqqat! "${groupName}" darsi 5 daqiqadan so'ng boshlanadi.`);
      await notifyTeacherForSlot(slot, dateStr, `⏰ "${groupName}" darsingiz 5 daqiqadan so'ng boshlanadi.`);
    }
    if (diffMin <= 0 && diffMin > -2) {
      await notifyStudentsForSlot(slot, dateStr, "student_start", `🎥 Dars boshlandi! "${groupName}" darsiga kirish uchun tugmani bosing.`);
    }
  }
}

async function sweepTeacherDailyDigest(enabledTenants: Set<string>): Promise<void> {
  const now = new Date();
  if (now.getHours() !== 7 || now.getMinutes() >= 5) return; // faqat 07:00-07:05 oralig'ida

  const dateStr = todayStr();
  const dow = dayOfWeekOf(now);

  const { rows: slots } = await pool.query<{
    slotId: string;
    teacherId: string;
    startTime: string;
    groupName: string | null;
    specificDate: string | null;
    dayOfWeek: number;
    tenantId: string;
  }>(
    `SELECT sl.id AS "slotId", COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId", sl.start_time AS "startTime",
            g.name AS "groupName", sl.specific_date AS "specificDate", sl.day_of_week AS "dayOfWeek",
            sl.tenant_id AS "tenantId"
     FROM schedule_slots sl
     LEFT JOIN groups g ON g.id = sl.group_id
     WHERE COALESCE(sl.teacher_id, g.teacher_id) IS NOT NULL
     ORDER BY sl.start_time`
  );

  const byTeacher = new Map<string, { tenantId: string; lines: string[] }>();
  for (const slot of slots) {
    if (!enabledTenants.has(slot.tenantId)) continue;
    const occursToday = slot.specificDate
      ? toDateStr(new Date(slot.specificDate)) === dateStr
      : slot.dayOfWeek === dow;
    if (!occursToday) continue;
    if (await isExcepted(slot.tenantId, dateStr, slot.slotId)) continue;

    const entry = byTeacher.get(slot.teacherId) ?? { tenantId: slot.tenantId, lines: [] };
    entry.lines.push(`• ${String(slot.startTime).slice(0, 5)} — ${slot.groupName ?? "dars"}`);
    byTeacher.set(slot.teacherId, entry);
  }

  for (const [teacherId, { lines }] of byTeacher) {
    const { rows } = await pool.query(
      `SELECT u.id AS "userId", u.telegram_id AS "telegramId"
       FROM teachers t JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND u.telegram_id IS NOT NULL`,
      [teacherId]
    );
    const teacher = rows[0];
    if (!teacher) continue;

    const sent = await markSent("teacher_daily", teacher.userId, dateStr, null);
    if (!sent) continue;
    await sendTelegramMessage(Number(teacher.telegramId), `📋 Bugungi darslaringiz:\n${lines.join("\n")}`);
  }
}

async function sweepOnce(): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const enabledTenants = await getTelegramEnabledTenantIds();
  if (enabledTenants.size === 0) return;
  await sweepLessonReminders(enabledTenants);
  await sweepTeacherDailyDigest(enabledTenants);
}

export function startTelegramReminderSweep(): void {
  sweepOnce().catch((err) => console.error("telegram-reminder-sweep failed:", err));
  setInterval(() => {
    sweepOnce().catch((err) => console.error("telegram-reminder-sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
}
