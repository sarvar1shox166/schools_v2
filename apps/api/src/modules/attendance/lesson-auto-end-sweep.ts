import { pool } from "../../db/pool.js";
import { dayOfWeekOf, toDateStr } from "../../lib/schedule-dates.js";

// Har 5 daqiqada tekshiradi — teacher-absence-sweep bilan bir xil davriylik.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const LOOKBACK_DAYS = 2;
// O'qituvchi darsni tugatish tugmasini bosmasa, rejalashtirilgan tugash
// vaqtidan shuncha vaqt o'tgach dars avtomatik yopiladi (davomat/paketga
// tegilmaydi — faqat "lessons" yozuvi yaratilib, "Uy vazifalari" bo'limi
// ochiladi va dashboard'dagi "hozir davom etmoqda" holati tugaydi).
const AUTO_END_GRACE_MS = 60 * 60_000;

async function sweepOnce(): Promise<void> {
  const now = new Date();
  const { rows: slots } = await pool.query(
    `SELECT sl.id, sl.tenant_id AS "tenantId", sl.group_id AS "groupId",
            COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
            sl.day_of_week AS "dayOfWeek", sl.start_time AS "startTime",
            sl.duration_minutes AS "durationMinutes", sl.specific_date AS "specificDate"
     FROM schedule_slots sl
     LEFT JOIN groups g ON g.id = sl.group_id
     WHERE COALESCE(sl.teacher_id, g.teacher_id) IS NOT NULL`
  );

  for (const slot of slots) {
    const candidateDates: string[] = [];
    if (slot.specificDate) {
      candidateDates.push(toDateStr(new Date(slot.specificDate)));
    } else {
      for (let i = 0; i < LOOKBACK_DAYS; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (dayOfWeekOf(d) === slot.dayOfWeek) candidateDates.push(toDateStr(d));
      }
    }

    for (const dateStr of candidateDates) {
      const [h, m] = String(slot.startTime).split(":").map(Number);
      const start = new Date(dateStr + "T00:00:00");
      start.setHours(h, m, 0, 0);
      const scheduledEnd = new Date(start.getTime() + (slot.durationMinutes ?? 90) * 60_000);
      if (now.getTime() < scheduledEnd.getTime() + AUTO_END_GRACE_MS) continue; // muddat hali kelmagan

      // Faqat o'qituvchi haqiqatan darsga kirgan bo'lsa yopamiz — kirmagan
      // darsni teacher-absence-sweep alohida "kelmadi" deb belgilaydi.
      const taRes = await pool.query(
        `SELECT status FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
        [slot.teacherId, slot.id, dateStr]
      );
      if (!["p", "l"].includes(taRes.rows[0]?.status)) continue;

      const existing = await pool.query(
        `SELECT 1 FROM lessons WHERE schedule_slot_id = $1 AND conducted_at = $2`,
        [slot.id, dateStr]
      );
      if (existing.rows.length > 0) continue; // o'qituvchi allaqachon qo'lda tugatgan

      await pool.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, status)
         VALUES ($1, $2, $3, $4, $5, 'conducted')
         ON CONFLICT (schedule_slot_id, conducted_at) WHERE schedule_slot_id IS NOT NULL DO NOTHING`,
        [slot.tenantId, slot.id, slot.groupId, slot.teacherId, dateStr]
      );
    }
  }
}

export function startLessonAutoEndSweep(): void {
  sweepOnce().catch((err) => console.error("lesson-auto-end-sweep failed:", err));
  setInterval(() => {
    sweepOnce().catch((err) => console.error("lesson-auto-end-sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
}
