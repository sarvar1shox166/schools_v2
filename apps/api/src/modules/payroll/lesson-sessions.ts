import type { Pool, PoolClient } from "pg";

// Ba'zi chaqiruvchilar tranzaksiya ichida (PoolClient), ba'zilari esa
// to'g'ridan-to'g'ri pool orqali (masalan sweep job) ishlaydi.
type Queryable = Pool | PoolClient;

// schedule_slots.lesson_type uses Uzbek values ('guruh'/'individual'/'diagnostika');
// lesson_sessions.lesson_type uses the English enum ('group'/'individual'/'diagnostic').
const UZ_TO_EN_LESSON_TYPE: Record<string, "group" | "individual" | "diagnostic"> = {
  guruh: "group",
  individual: "individual",
  diagnostika: "diagnostic",
};

export async function recordLessonSession(client: Queryable, scheduleSlotId: string, date: string) {
  const slotRes = await client.query(
    `SELECT sl.group_id, COALESCE(sl.teacher_id, g.teacher_id) AS teacher_id, sl.lesson_type
     FROM schedule_slots sl
     LEFT JOIN groups g ON g.id = sl.group_id
     WHERE sl.id = $1`,
    [scheduleSlotId]
  );
  if (slotRes.rows.length === 0) return;
  const { group_id: groupId, teacher_id: teacherId, lesson_type: rawLessonType } = slotRes.rows[0];
  if (!teacherId) return; // no teacher assigned — nothing to pay

  // O'qituvchi darsga o'zi kirmagan (yoki "kelmadi" deb belgilangan) bo'lsa —
  // to'lov yozilmaydi. Agar oldin (xato bilan) to'lov yozilgan bo'lsa, endi
  // o'qituvchi "kelmadi" deb tuzatilganda ham shu yerdan o'chirib tashlanadi.
  const taRes = await client.query(
    `SELECT status FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
    [teacherId, scheduleSlotId, date]
  );
  if (!["p", "l"].includes(taRes.rows[0]?.status)) {
    await client.query(
      `DELETE FROM lesson_sessions WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, date]
    );
    return;
  }

  const lessonType = UZ_TO_EN_LESSON_TYPE[rawLessonType] ?? "group";

  // students_count faqat statistika/hisobot uchun saqlanadi — barcha dars turlari
  // (guruh, individual, diagnostika) bir xil mantiq bilan flat stavka bo'yicha
  // to'lanadi: 1 dars o'tilsa, o'qituvchi qatnashgan o'quvchilar soniga qaramay
  // bitta belgilangan stavkani oladi.
  let studentsCount = 0;
  if (lessonType === "group" && groupId) {
    const countRes = await client.query(
      `SELECT count(*)::int AS cnt FROM attendance_records
       WHERE schedule_slot_id = $1 AND date = $2 AND status = 'p'`,
      [scheduleSlotId, date]
    );
    studentsCount = countRes.rows[0].cnt as number;
  }

  let rate = 0;
  const rateRes = await client.query(
    `SELECT group_rate, individual_rate, diagnostic_rate FROM teacher_rates WHERE teacher_id = $1`,
    [teacherId]
  );
  if (rateRes.rows.length > 0) {
    const r = rateRes.rows[0];
    rate = lessonType === "individual" ? r.individual_rate : lessonType === "diagnostic" ? r.diagnostic_rate : r.group_rate;
  }

  const amount = rate;

  await client.query(
    `INSERT INTO lesson_sessions (schedule_slot_id, teacher_id, group_id, lesson_type, date, students_count, rate, amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (schedule_slot_id, date)
     DO UPDATE SET students_count = EXCLUDED.students_count, rate = EXCLUDED.rate, amount = EXCLUDED.amount,
                    teacher_id = EXCLUDED.teacher_id, lesson_type = EXCLUDED.lesson_type`,
    [scheduleSlotId, teacherId, groupId ?? null, lessonType, date, studentsCount, rate, amount]
  );
}
