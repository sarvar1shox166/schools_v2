import { pool } from "../../db/pool.js";
import { recordLessonSession } from "../payroll/lesson-sessions.js";
import { dayOfWeekOf, toDateStr } from "../../lib/schedule-dates.js";

// Har 5 daqiqada tekshiradi, oxirgi ~2 kunlik darslarni qamrab oladi — server
// vaqtincha o'chib-yonib qolsa ham (masalan deploy paytida) o'tkazib
// yubormaslik uchun ortiqcha zахира bilan.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const LOOKBACK_DAYS = 2;

/** Dars tugagan, lekin o'qituvchi hech qachon "darsga kirish"ni bosmagan
 *  (teacher_attendance'da yozuv yo'q) holatlarni topib, avtomatik "kelmadi"
 *  (status='a') deb belgilaydi. Shundan keyin recordLessonSession() shu
 *  o'qituvchi uchun to'lovni bekor qiladi (agar u xato bilan avval
 *  yozilgan bo'lsa). Bekor qilingan/bayram kunlari hisobga olinmaydi. */
async function sweepOnce(): Promise<void> {
  const now = new Date();
  const { rows: slots } = await pool.query(
    `SELECT sl.id, sl.tenant_id AS "tenantId",
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
      const end = new Date(start.getTime() + (slot.durationMinutes ?? 90) * 60_000);
      if (end >= now) continue; // dars hali tugamagan

      const excRes = await pool.query(
        `SELECT 1 FROM schedule_exceptions
         WHERE tenant_id = $1 AND date = $2 AND (schedule_slot_id = $3 OR schedule_slot_id IS NULL)
           AND kind IN ('cancelled', 'holiday', 'rescheduled')`,
        [slot.tenantId, dateStr, slot.id]
      );
      if (excRes.rows.length > 0) continue; // dars umuman bo'lmagan/ko'chirilgan

      const existing = await pool.query(
        `SELECT 1 FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
        [slot.teacherId, slot.id, dateStr]
      );
      if (existing.rows.length > 0) continue; // allaqachon belgilangan (kirgan yoki qo'lda belgilangan)

      await pool.query(
        `INSERT INTO teacher_attendance (tenant_id, teacher_id, schedule_slot_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, 'a', NULL)
         ON CONFLICT (teacher_id, schedule_slot_id, date) DO NOTHING`,
        [slot.tenantId, slot.teacherId, slot.id, dateStr]
      );
      // Ehtiyot uchun — agar bu slot/sana uchun avval (xato bilan) to'lov
      // yozilgan bo'lsa, endi "kelmadi" statusi bilan bekor qilinadi.
      await recordLessonSession(pool, slot.id, dateStr);
    }
  }
}

export function startTeacherAbsenceSweep(): void {
  sweepOnce().catch((err) => console.error("teacher-absence-sweep failed:", err));
  setInterval(() => {
    sweepOnce().catch((err) => console.error("teacher-absence-sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
}
