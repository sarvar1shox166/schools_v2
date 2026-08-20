import type { PoolClient } from "pg";
import { notifyStudent } from "../notifications/notify.js";

/** Returns the id of the package the credit was consumed from, or null if the student has no active package. */
export async function consumeLesson(client: PoolClient, studentId: string): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT id, used_lessons, total_lessons FROM student_packages
     WHERE student_id = $1 AND status = 'active' AND used_lessons < total_lessons
       AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
     ORDER BY purchased_at ASC LIMIT 1 FOR UPDATE`,
    [studentId]
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
export async function refundLesson(client: PoolClient, studentId: string, studentPackageId?: string | null) {
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

  const { rows } = await client.query(
    `SELECT id, used_lessons, total_lessons, status FROM student_packages
     WHERE student_id = $1 AND status IN ('active', 'finished') AND used_lessons > 0
     ORDER BY purchased_at DESC LIMIT 1 FOR UPDATE`,
    [studentId]
  );
  if (rows.length === 0) return;

  const pkg = rows[0];
  const used = pkg.used_lessons - 1;
  await client.query(
    `UPDATE student_packages SET used_lessons = $1, status = 'active' WHERE id = $2`,
    [used, pkg.id]
  );
}
