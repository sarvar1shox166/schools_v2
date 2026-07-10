import type { PoolClient } from "pg";

// schedule_slots.lesson_type uses Uzbek values ('guruh'/'individual'/'diagnostika');
// lesson_sessions.lesson_type uses the English enum ('group'/'individual'/'diagnostic').
const UZ_TO_EN_LESSON_TYPE: Record<string, "group" | "individual" | "diagnostic"> = {
  guruh: "group",
  individual: "individual",
  diagnostika: "diagnostic",
};

export async function recordLessonSession(client: PoolClient, scheduleSlotId: string, date: string) {
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

  const lessonType = UZ_TO_EN_LESSON_TYPE[rawLessonType] ?? "group";

  // Group lessons are paid per attending student; individual/diagnostic lessons are
  // a flat per-session rate (no per-student attendance is tracked for these — see
  // /me/teacher-attendance/join, the only trigger point for non-group sessions).
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
  let retentionCoef = 1;
  const rateRes = await client.query(
    `SELECT group_rate, individual_rate, diagnostic_rate, retention_coef FROM teacher_rates WHERE teacher_id = $1`,
    [teacherId]
  );
  if (rateRes.rows.length > 0) {
    const r = rateRes.rows[0];
    rate = lessonType === "individual" ? r.individual_rate : lessonType === "diagnostic" ? r.diagnostic_rate : r.group_rate;
    retentionCoef = r.retention_coef;
  }

  const amount = lessonType === "group"
    ? rate * studentsCount * retentionCoef
    : rate * retentionCoef;

  await client.query(
    `INSERT INTO lesson_sessions (schedule_slot_id, teacher_id, group_id, lesson_type, date, students_count, rate, amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (schedule_slot_id, date)
     DO UPDATE SET students_count = EXCLUDED.students_count, rate = EXCLUDED.rate, amount = EXCLUDED.amount,
                    teacher_id = EXCLUDED.teacher_id, lesson_type = EXCLUDED.lesson_type`,
    [scheduleSlotId, teacherId, groupId ?? null, lessonType, date, studentsCount, rate, amount]
  );
}
