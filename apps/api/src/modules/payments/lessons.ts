import type { PoolClient } from "pg";
import { notifyStudent } from "../notifications/notify.js";

/** Paket turi (packages.lesson_type) — dars turiga mos paketdan yechish uchun. */
export type PackageLessonType = "group" | "individual";

/** Jadvaldagi dars turi (schedule_slots.lesson_type) → shu darsni qoplaydigan paket turi.
 *  Diagnostika (bepul sinov darsi) hech qaysi paketdan yechilmaydi — null. */
export function packageTypeForSlot(slotLessonType: string | null | undefined): PackageLessonType | null {
  if (slotLessonType === "individual") return "individual";
  if (slotLessonType === "diagnostika") return null;
  return "group";
}

/**
 * Returns the id of the package the credit was consumed from, or null if the student has no active
 * package OF THE MATCHING TYPE. Individual lessons are charged only to individual packages and
 * group lessons only to group packages — a student's group package is never silently spent on an
 * individual lesson (or vice versa).
 */
export async function consumeLesson(
  client: PoolClient, studentId: string, packageType: PackageLessonType = "group"
): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT sp.id, sp.used_lessons, sp.total_lessons FROM student_packages sp
     JOIN packages p ON p.id = sp.package_id
     WHERE sp.student_id = $1 AND sp.status = 'active' AND sp.used_lessons < sp.total_lessons
       AND (sp.expires_at IS NULL OR sp.expires_at >= CURRENT_DATE)
       AND p.lesson_type = $2
     ORDER BY sp.purchased_at ASC LIMIT 1 FOR UPDATE OF sp`,
    [studentId, packageType]
  );
  if (rows.length === 0) return null;

  const pkg = rows[0];
  const used = pkg.used_lessons + 1;
  const status = used >= pkg.total_lessons ? "finished" : "active";
  await client.query(
    `UPDATE student_packages SET used_lessons = $1, status = $2 WHERE id = $3`,
    [used, status, pkg.id]
  );

  if (status === "finished") {
    await notifyStudent(
      client, studentId,
      "Sizning dars paketingiz tugadi. Davom etish uchun yangi paket sotib oling.",
      { title: "Paket tugadi", type: "payment", icon: "wallet" }
    );
  }
  return pkg.id;
}

/**
 * Refunds a credit back to the package it was originally consumed from (tracked via
 * attendance_records.student_package_id). Falls back to the most-recently-used package
 * when the original package is unknown (legacy rows predating this tracking) or can no
 * longer accept a refund — this heuristic can misattribute the credit if the student has
 * multiple packages, which is exactly the bug the exact-package path avoids.
 */
export async function refundLesson(
  client: PoolClient, studentId: string, studentPackageId?: string | null,
  // Berilsa, fallback faqat shu turdagi paketga qaytaradi; null — fallback umuman yo'q
  // (faqat aniq paketga qaytariladi). undefined — eski xatti-harakat (turga qaramasdan).
  fallbackType?: PackageLessonType | null
) {
  if (studentPackageId) {
    const { rows } = await client.query(
      `SELECT id, used_lessons FROM student_packages WHERE id = $1 AND used_lessons > 0 FOR UPDATE`,
      [studentPackageId]
    );
    if (rows.length > 0) {
      await client.query(
        `UPDATE student_packages SET used_lessons = $1, status = 'active' WHERE id = $2`,
        [rows[0].used_lessons - 1, rows[0].id]
      );
      return;
    }
  }

  if (fallbackType === null) return;

  const { rows } = await client.query(
    `SELECT sp.id, sp.used_lessons, sp.total_lessons, sp.status FROM student_packages sp
     JOIN packages p ON p.id = sp.package_id
     WHERE sp.student_id = $1 AND sp.status IN ('active', 'finished') AND sp.used_lessons > 0
       AND ($2::text IS NULL OR p.lesson_type = $2)
     ORDER BY sp.purchased_at DESC LIMIT 1 FOR UPDATE OF sp`,
    [studentId, fallbackType ?? null]
  );
  if (rows.length === 0) return;

  const pkg = rows[0];
  const used = pkg.used_lessons - 1;
  await client.query(
    `UPDATE student_packages SET used_lessons = $1, status = 'active' WHERE id = $2`,
    [used, pkg.id]
  );
}
