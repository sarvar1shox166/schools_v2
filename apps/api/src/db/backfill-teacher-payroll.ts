/**
 * Bir martalik, QO'LDA ishga tushiriladigan tuzatish skripti — `npm run migrate`
 * orqali AVTOMATIK ishlamaydi. Ustoz "Darsga kirish"ni bosmasdan (masalan
 * "Uy vazifalari" sahifasi orqali) darsni to'g'ri o'tkazgan, lekin
 * `teacher_attendance` yozuvi bo'lmagani (yoki fon jarayoni — sweep —
 * xato "kelmadi" deb belgilagani) sabab maoshi (`lesson_sessions`) yozilmagan
 * eski holatlarni topib tuzatadi.
 *
 * Faqat ISBOTLANGAN holatlar tuzatiladi: shu (schedule_slot_id, date) uchun
 * kamida bitta `attendance_records` yozuvi bo'lishi — bu dars haqiqatan
 * o'tilganining dalili. Admin/moderator QO'LDA (`marked_by` to'ldirilgan
 * holda) "kelmadi" deb belgilagan yozuvlarga ASLO tegilmaydi.
 *
 * Ishlatish:
 *   npx tsx src/db/backfill-teacher-payroll.ts --dry-run   # faqat ro'yxatni chop etadi
 *   npx tsx src/db/backfill-teacher-payroll.ts --apply     # haqiqatan tuzatadi
 */
import { pool } from "./pool.js";
import { recordLessonSession } from "../modules/payroll/lesson-sessions.js";

interface Candidate {
  teacherAttendanceId: string | null;
  teacherId: string;
  scheduleSlotId: string;
  date: string;
  attendanceRecordsCount: number;
  teacherName: string;
}

async function findCandidates(): Promise<Candidate[]> {
  // 1) Fon jarayoni (sweep) tomonidan xato "kelmadi" deb belgilangan holatlar.
  const swept = await pool.query<Candidate>(
    `SELECT ta.id AS "teacherAttendanceId", ta.teacher_id AS "teacherId",
            ta.schedule_slot_id AS "scheduleSlotId", to_char(ta.date, 'YYYY-MM-DD') AS date,
            (SELECT count(*)::int FROM attendance_records ar
             WHERE ar.schedule_slot_id = ta.schedule_slot_id AND ar.date = ta.date) AS "attendanceRecordsCount",
            u.full_name AS "teacherName"
     FROM teacher_attendance ta
     JOIN teachers t ON t.id = ta.teacher_id
     JOIN users u ON u.id = t.user_id
     WHERE ta.status = 'a' AND ta.marked_by IS NULL
       AND EXISTS (
         SELECT 1 FROM attendance_records ar
         WHERE ar.schedule_slot_id = ta.schedule_slot_id AND ar.date = ta.date
       )`
  );

  // 2) teacher_attendance UMUMAN yo'q, lekin o'quvchi davomati bor holatlar
  //    (sweep hali yetib ulgurmagan yoki hech qachon ishga tushmagan).
  const missing = await pool.query<Candidate>(
    `SELECT NULL AS "teacherAttendanceId", COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
            ar.schedule_slot_id AS "scheduleSlotId", to_char(ar.date, 'YYYY-MM-DD') AS date,
            count(ar.*)::int AS "attendanceRecordsCount",
            u.full_name AS "teacherName"
     FROM attendance_records ar
     JOIN schedule_slots sl ON sl.id = ar.schedule_slot_id
     LEFT JOIN groups g ON g.id = sl.group_id
     LEFT JOIN teachers t ON t.id = COALESCE(sl.teacher_id, g.teacher_id)
     LEFT JOIN users u ON u.id = t.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM teacher_attendance ta
       WHERE ta.schedule_slot_id = ar.schedule_slot_id AND ta.date = ar.date
     )
     AND COALESCE(sl.teacher_id, g.teacher_id) IS NOT NULL
     GROUP BY sl.teacher_id, g.teacher_id, ar.schedule_slot_id, ar.date, u.full_name`
  );

  return [...swept.rows, ...missing.rows];
}

async function main() {
  const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
  const candidates = await findCandidates();

  console.log(`Topildi: ${candidates.length} ta nomzod (${mode === "apply" ? "TUZATILADI" : "faqat ko'rsatiladi"})\n`);
  for (const c of candidates) {
    console.log(
      `  ${c.teacherName ?? "(noma'lum ustoz)"} — ${c.date} — slot ${c.scheduleSlotId} — ` +
      `${c.attendanceRecordsCount} ta o'quvchi davomati — ` +
      `${c.teacherAttendanceId ? "avval 'kelmadi' deb belgilangan" : "teacher_attendance yozuvi yo'q edi"}`
    );
  }

  if (mode === "dry-run") {
    console.log("\n--dry-run rejimi — hech narsa o'zgartirilmadi. Tasdiqlagach --apply bilan ishga tushiring.");
    return;
  }

  for (const c of candidates) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // tenant_id ni slot orqali topamiz (Candidate'da yo'q).
      const tenantRes = await client.query(
        `SELECT tenant_id AS "tenantId" FROM schedule_slots WHERE id = $1`,
        [c.scheduleSlotId]
      );
      const tenantId = tenantRes.rows[0]?.tenantId;
      if (!tenantId) throw new Error(`Slot topilmadi: ${c.scheduleSlotId}`);

      await client.query(
        `INSERT INTO teacher_attendance (tenant_id, teacher_id, schedule_slot_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, 'p', NULL)
         ON CONFLICT (teacher_id, schedule_slot_id, date) DO UPDATE SET status = 'p'`,
        [tenantId, c.teacherId, c.scheduleSlotId, c.date]
      );
      await recordLessonSession(client, c.scheduleSlotId, c.date);
      await client.query("COMMIT");
      console.log(`  [OK] tuzatildi: ${c.teacherName} — ${c.date}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  [XATO] ${c.teacherName} — ${c.date}:`, err);
    } finally {
      client.release();
    }
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
