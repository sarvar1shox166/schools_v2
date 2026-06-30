import type { PoolClient } from "pg";
import { notifyStudent } from "../notifications/notify.js";

export async function consumeLesson(client: PoolClient, studentId: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT id, used_lessons, total_lessons FROM student_packages
     WHERE student_id = $1 AND status = 'active' AND used_lessons < total_lessons
     ORDER BY purchased_at ASC LIMIT 1 FOR UPDATE`,
    [studentId]
  );
  if (rows.length === 0) return false;

  const pkg = rows[0];
  const used = pkg.used_lessons + 1;
  const status = used >= pkg.total_lessons ? "finished" : "active";
  await client.query(
    `UPDATE student_packages SET used_lessons = $1, status = $2 WHERE id = $3`,
    [used, status, pkg.id]
  );

  if (status === "finished") {
    await notifyStudent(client, studentId, "Sizning dars paketingiz tugadi. Davom etish uchun yangi paket sotib oling.");
  }
  return true;
}

export async function refundLesson(client: PoolClient, studentId: string) {
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
