import { pool } from "../../db/pool.js";

export type JoinCheckResult = { ok: true } | { ok: false; reason: "not_enrolled" | "teacher_not_joined" | "package_expired" };

/** O'quvchi berilgan darsga (havola orqali) kira oladimi — veb ilova va
 *  Telegram bot ikkalasi ham shu bitta tekshiruvdan foydalanadi, shuning
 *  uchun ikkala joyda ham bir xil qoidalar amal qiladi. */
export async function checkStudentCanJoin(
  studentId: string,
  scheduleSlotId: string,
  tenantId: string,
  date: string
): Promise<JoinCheckResult> {
  const slotCheck = await pool.query(
    `SELECT sl.id, COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId"
     FROM schedule_slots sl
     LEFT JOIN groups g ON g.id = sl.group_id
     LEFT JOIN group_members gm ON gm.group_id = sl.group_id AND gm.student_id = $1
     WHERE sl.id = $2 AND sl.tenant_id = $3 AND (gm.student_id IS NOT NULL OR sl.student_id = $1)`,
    [studentId, scheduleSlotId, tenantId]
  );
  if (!slotCheck.rows[0]) return { ok: false, reason: "not_enrolled" };

  // O'qituvchi hali darsga kirmagan bo'lsa, o'quvchi ham kira olmaydi.
  const teacherId = slotCheck.rows[0].teacherId as string | null;
  if (teacherId) {
    const taCheck = await pool.query(
      `SELECT status FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
      [teacherId, scheduleSlotId, date]
    );
    if (!["p", "l"].includes(taCheck.rows[0]?.status)) {
      return { ok: false, reason: "teacher_not_joined" };
    }
  }

  // Paket muddati o'tgan bo'lsa — dars soni qolgan-qolmaganidan qat'i nazar
  // kirish taqiqlanadi. Paketi umuman yo'q bo'lsa (yoki muddati hali
  // o'tmagan) avvalgidek kirishga ruxsat beriladi.
  const hasUsablePackage = await pool.query(
    `SELECT 1 FROM student_packages
     WHERE student_id = $1 AND status = 'active' AND used_lessons < total_lessons
       AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
     LIMIT 1`,
    [studentId]
  );
  if (hasUsablePackage.rows.length === 0) {
    const hasExpiredPackage = await pool.query(
      `SELECT 1 FROM student_packages
       WHERE student_id = $1 AND status = 'active' AND used_lessons < total_lessons
         AND expires_at < CURRENT_DATE
       LIMIT 1`,
      [studentId]
    );
    if (hasExpiredPackage.rows.length > 0) {
      return { ok: false, reason: "package_expired" };
    }
  }

  return { ok: true };
}
