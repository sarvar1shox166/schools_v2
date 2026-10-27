import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { hashPassword, generateTempPassword } from "../auth/auth.service.js";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  level: z.string().optional(),
  age: z.number().int().positive().optional(),
  groupId: z.string().uuid().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  level: z.string().optional(),
  age: z.number().int().positive().optional(),
  status: z.enum(["yangi", "faol", "nofaol"]).optional(),
  avatarUrl: z.string().optional(),
});

export async function studentsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/students", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request) => {
    const { tenantId } = request.user;
    const { page, pageSize } = listQuerySchema.parse(request.query);

    const BASE_SELECT = `
      SELECT s.id, u.full_name AS "fullName", u.phone, u.login, u.avatar_url AS "avatarUrl",
             s.level, s.age, s.status, s.joined_at AS "joinedAt",
             COALESCE(
               (SELECT json_agg(json_build_object('id', g.id, 'name', g.name,
                  'teacherId', g.teacher_id,
                  'teacherName', (SELECT full_name FROM users WHERE id = (
                    SELECT user_id FROM teachers WHERE id = g.teacher_id))))
                FROM group_members gm JOIN groups g ON g.id = gm.group_id
                WHERE gm.student_id = s.id), '[]'
             ) AS groups,
             sps.payment_status AS "paymentStatus",
             sps.active_package_expires AS "activePackageExpires"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN student_payment_status sps ON sps.student_id = s.id
      WHERE s.tenant_id = $1`;

    if (!page && !pageSize) {
      const { rows } = await pool.query(`${BASE_SELECT} ORDER BY u.full_name`, [tenantId]);
      return rows;
    }

    const pg = page ?? 1;
    const size = pageSize ?? 20;
    const offset = (pg - 1) * size;

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total FROM students s WHERE s.tenant_id = $1`,
      [tenantId]
    );
    const total = countRows[0]?.total ?? 0;

    const { rows } = await pool.query(
      `${BASE_SELECT} ORDER BY u.full_name LIMIT $2 OFFSET $3`,
      [tenantId, size, offset]
    );

    return { items: rows, total, page: pg, pageSize: size };
  });

  app.post("/students", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator")] }, async (request, reply) => {
    const body = createSchema.parse(request.body);
    const { tenantId } = request.user;
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash, login)
         VALUES ($1, 'student', $2, $3, $4, $3) RETURNING id`,
        [tenantId, body.fullName, body.phone, passwordHash]
      );
      const userId = userRes.rows[0].id;

      const studentRes = await client.query(
        `INSERT INTO students (user_id, tenant_id, level, age)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, tenantId, body.level ?? null, body.age ?? null]
      );
      const studentId = studentRes.rows[0].id;

      if (body.groupId) {
        await client.query(
          `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`,
          [body.groupId, studentId]
        );
      }

      await client.query("COMMIT");
      return reply.code(201).send({ id: studentId, tempPassword });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.get("/students/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT s.id, u.full_name AS "fullName", u.phone, u.login, u.avatar_url AS "avatarUrl",
              s.level, s.age, s.status, s.joined_at AS "joinedAt",
              COALESCE(
                (SELECT json_agg(json_build_object('id', g.id, 'name', g.name,
                   'teacherName', (SELECT full_name FROM users WHERE id = (
                     SELECT user_id FROM teachers WHERE id = g.teacher_id))))
                 FROM group_members gm JOIN groups g ON g.id = gm.group_id
                 WHERE gm.student_id = s.id), '[]'
              ) AS groups,
              sps.payment_status AS "paymentStatus",
              sps.active_package_expires AS "activePackageExpires",
              (SELECT json_build_object(
                 'xp', sx.xp, 'level', sx.level, 'streak', sx.streak, 'elo', sx.elo
               ) FROM student_xp sx WHERE sx.student_id = s.id
              ) AS xp,
              (SELECT count(*)::int FROM attendance_records ar WHERE ar.student_id = s.id) AS "totalLessons",
              (SELECT count(*)::int FROM attendance_records ar WHERE ar.student_id = s.id AND ar.status = 'p') AS "presentCount"
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_payment_status sps ON sps.student_id = s.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [id, tenantId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return rows[0];
  });

  app.post("/students/:id/reset-password", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const newPassword = generateTempPassword();
    const passwordHash = await hashPassword(newPassword);
    const { rowCount } = await pool.query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1
       WHERE id = (SELECT user_id FROM students WHERE id = $2 AND tenant_id = $3)`,
      [passwordHash, id, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { tempPassword: newPassword };
  });

  app.patch("/students/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.parse(request.body);
    const { tenantId } = request.user;

    if (body.fullName || body.phone || body.avatarUrl) {
      await pool.query(
        `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone),
                avatar_url = COALESCE($3, avatar_url), updated_at = now()
         WHERE id = (SELECT user_id FROM students WHERE id = $4 AND tenant_id = $5)`,
        [body.fullName ?? null, body.phone ?? null, body.avatarUrl ?? null, id, tenantId]
      );
    }

    await pool.query(
      `UPDATE students SET level = COALESCE($1, level), age = COALESCE($2, age), status = COALESCE($3, status)
       WHERE id = $4 AND tenant_id = $5`,
      [body.level ?? null, body.age ?? null, body.status ?? null, id, tenantId]
    );

    // Holat "nofaol" bo'lsa o'quvchi tizimga kira olmasligi kerak (deactivate bilan bir xil);
    // "faol"/"yangi"ga qaytarilsa kirish qayta ochiladi.
    if (body.status) {
      const nowActive = body.status !== "nofaol";
      await pool.query(
        `UPDATE users SET is_active = $1, token_version = token_version + (CASE WHEN $1 THEN 0 ELSE 1 END)
         WHERE id = (SELECT user_id FROM students WHERE id = $2 AND tenant_id = $3)`,
        [nowActive, id, tenantId]
      );
    }

    return { ok: true };
  });

  // O'quvchini o'chirishdan OLDIN nima yo'qolishi/bloklanishini aniq ko'rsatadi
  // (UI tasdiqlash oynasi shundan foydalanadi, DELETE ham shu mantiqni qayta tekshiradi).
  async function computeDeletionImpact(studentId: string, tenantId: string) {
    const head = await pool.query(
      `SELECT s.id, s.status, u.full_name AS "fullName", u.phone, u.is_active AS "isActive"
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [studentId, tenantId]
    );
    if (head.rows.length === 0) return null;

    const [money, debt, pkgs, att, groups, lessons, emptySlots, extra] = await Promise.all([
      pool.query(
        `SELECT count(*)::int AS cnt,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float AS "paidTotal"
         FROM transactions WHERE student_id = $1`,
        [studentId]
      ),
      pool.query(
        `SELECT count(*)::int AS cnt,
                COALESCE(SUM(GREATEST(balance, 0)), 0)::float AS outstanding
         FROM charge_balance WHERE student_id = $1`,
        [studentId]
      ),
      pool.query(
        `SELECT count(*)::int AS cnt,
                count(*) FILTER (WHERE status = 'active')::int AS active,
                COALESCE(SUM(total_lessons - used_lessons) FILTER (WHERE status = 'active'), 0)::int AS remaining
         FROM student_packages WHERE student_id = $1`,
        [studentId]
      ),
      pool.query(`SELECT count(*)::int AS cnt FROM attendance_records WHERE student_id = $1`, [studentId]),
      pool.query(
        `SELECT g.id, g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id
         WHERE gm.student_id = $1 ORDER BY g.name`,
        [studentId]
      ),
      // O'quvchining individual/diagnostika slotlarida allaqachon o'tilgan (ustoz maoshi
      // yozilgan) darslar — bular o'chirilsa ustoz maoshi tarixi buziladi.
      pool.query(
        `SELECT count(*)::int AS cnt FROM lesson_sessions ls
         JOIN schedule_slots sl ON sl.id = ls.schedule_slot_id
         WHERE sl.student_id = $1 AND sl.tenant_id = $2`,
        [studentId, tenantId]
      ),
      // Hech qanday tarixi yo'q kelajakdagi individual/diagnostika slotlar — o'quvchi bilan
      // birga o'chiriladi (aks holda jadvalda "egasiz" dars qolib, ustoz "kelmadi" bo'lib qoladi).
      pool.query(
        `SELECT count(*)::int AS cnt FROM schedule_slots sl
         WHERE sl.student_id = $1 AND sl.tenant_id = $2
           AND sl.lesson_type IN ('individual', 'diagnostika')
           AND (sl.specific_date IS NULL OR sl.specific_date >= CURRENT_DATE)
           AND NOT EXISTS (SELECT 1 FROM lesson_sessions ls WHERE ls.schedule_slot_id = sl.id)
           AND NOT EXISTS (SELECT 1 FROM teacher_attendance ta WHERE ta.schedule_slot_id = sl.id)`,
        [studentId, tenantId]
      ),
      pool.query(
        `SELECT
           (SELECT count(*)::int FROM homework_completions WHERE student_id = $1) AS homework,
           (SELECT count(*)::int FROM student_achievements WHERE student_id = $1) AS achievements,
           (SELECT COALESCE(xp, 0)::int FROM student_xp WHERE student_id = $1) AS xp`,
        [studentId]
      ),
    ]);

    const counts = {
      transactions: money.rows[0].cnt as number,
      paidTotal: money.rows[0].paidTotal as number,
      charges: debt.rows[0].cnt as number,
      outstandingDebt: debt.rows[0].outstanding as number,
      packages: pkgs.rows[0].cnt as number,
      activePackages: pkgs.rows[0].active as number,
      remainingLessons: pkgs.rows[0].remaining as number,
      attendanceRecords: att.rows[0].cnt as number,
      groups: groups.rows as { id: string; name: string }[],
      lessonHistory: lessons.rows[0].cnt as number,
      futureEmptySlots: emptySlots.rows[0].cnt as number,
      homeworkCompletions: extra.rows[0].homework as number,
      achievements: extra.rows[0].achievements as number,
      xp: (extra.rows[0].xp ?? 0) as number,
    };

    // Moliyaviy/ustoz-maoshi tarixi bor o'quvchini O'CHIRIB BO'LMAYDI — hisobotlar,
    // qarzlar va ustoz maoshi buziladi. Bunday o'quvchi "nofaol" qilinadi.
    const blockers: { code: string; message: string }[] = [];
    if (counts.transactions > 0) {
      blockers.push({ code: "transactions", message: `${counts.transactions} ta to'lov yozuvi bor (jami to'langan ${Math.round(counts.paidTotal).toLocaleString("ru-RU")} so'm) — o'chirilsa tushum hisobotlari kamayadi.` });
    }
    if (counts.charges > 0) {
      blockers.push({ code: "charges", message: `${counts.charges} ta qarz/majburiyat yozuvi bor${counts.outstandingDebt > 0 ? ` (to'lanmagan ${Math.round(counts.outstandingDebt).toLocaleString("ru-RU")} so'm)` : ""} — o'chirilsa "Jami qarz" o'zgaradi.` });
    }
    if (counts.packages > 0) {
      blockers.push({ code: "packages", message: `${counts.packages} ta paket bor${counts.remainingLessons > 0 ? ` (${counts.remainingLessons} ta dars krediti qolgan)` : ""}.` });
    }
    if (counts.lessonHistory > 0) {
      blockers.push({ code: "lesson_history", message: `${counts.lessonHistory} ta individual/diagnostika dars o'tilgan va ustozga maosh hisoblangan — tarix saqlanishi kerak.` });
    }

    return { student: head.rows[0], counts, blockers, canDelete: blockers.length === 0 };
  }

  app.get("/students/:id/deletion-impact", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const impact = await computeDeletionImpact(id, request.user.tenantId!);
    if (!impact) return reply.code(404).send({ error: "Not found" });
    return impact;
  });

  app.delete("/students/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const impact = await computeDeletionImpact(id, tenantId!);
    if (!impact) return reply.code(404).send({ error: "Not found" });
    if (!impact.canDelete) {
      return reply.code(409).send({
        error: "Bu o'quvchini o'chirib bo'lmaydi: moliyaviy yoki dars tarixi bor. Uning o'rniga \"Nofaol qilish\"dan foydalaning.",
        blockers: impact.blockers,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Tarixsiz kelajakdagi individual/diagnostika slotlarni olib tashlaymiz.
      await client.query(
        `DELETE FROM schedule_slots sl
         WHERE sl.student_id = $1 AND sl.tenant_id = $2
           AND sl.lesson_type IN ('individual', 'diagnostika')
           AND (sl.specific_date IS NULL OR sl.specific_date >= CURRENT_DATE)
           AND NOT EXISTS (SELECT 1 FROM lesson_sessions ls WHERE ls.schedule_slot_id = sl.id)
           AND NOT EXISTS (SELECT 1 FROM teacher_attendance ta WHERE ta.schedule_slot_id = sl.id)`,
        [id, tenantId]
      );
      await client.query(
        `DELETE FROM users WHERE id = (SELECT user_id FROM students WHERE id = $1 AND tenant_id = $2)`,
        [id, tenantId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return { ok: true };
  });

  // "Nofaol qilish" — hech narsani o'chirmaydi: tarix saqlanadi, lekin o'quvchi tizimga
  // kira olmaydi (is_active=false + joriy tokenlar bekor) va ro'yxatda "nofaol" bo'ladi.
  app.post("/students/:id/deactivate", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE students SET status = 'nofaol' WHERE id = $1 AND tenant_id = $2 RETURNING user_id`,
        [id, tenantId]
      );
      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      await client.query(
        `UPDATE users SET is_active = false, token_version = token_version + 1 WHERE id = $1`,
        [res.rows[0].user_id]
      );
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/students/:id/activate", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE students SET status = 'faol' WHERE id = $1 AND tenant_id = $2 RETURNING user_id`,
        [id, tenantId]
      );
      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Not found" });
      }
      await client.query(`UPDATE users SET is_active = true WHERE id = $1`, [res.rows[0].user_id]);
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/students/:id/groups/:groupId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id, groupId } = request.params as { id: string; groupId: string };
    const { tenantId } = request.user;

    const check = await pool.query(
      `SELECT
         (SELECT id FROM students WHERE id = $1 AND tenant_id = $3) AS "studentId",
         g.capacity,
         (SELECT count(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS "memberCount",
         EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.student_id = $1) AS "alreadyMember"
       FROM groups g WHERE g.id = $2 AND g.tenant_id = $3`,
      [id, groupId, tenantId]
    );
    const row = check.rows[0];
    if (!row || !row.studentId) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (!row.alreadyMember && row.capacity != null && row.memberCount >= row.capacity) {
      return reply.code(409).send({ error: "Guruh to'lgan" });
    }

    await pool.query(
      `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [groupId, id]
    );
    return { ok: true };
  });

  app.delete("/students/:id/groups/:groupId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id, groupId } = request.params as { id: string; groupId: string };
    const { tenantId } = request.user;

    const check = await pool.query(
      `SELECT (SELECT id FROM students WHERE id = $1 AND tenant_id = $3) AS "studentId",
              (SELECT id FROM groups WHERE id = $2 AND tenant_id = $3) AS "groupId"`,
      [id, groupId, tenantId]
    );
    if (!check.rows[0]?.studentId || !check.rows[0]?.groupId) {
      return reply.code(404).send({ error: "Not found" });
    }

    await pool.query(`DELETE FROM group_members WHERE group_id = $1 AND student_id = $2`, [groupId, id]);
    return { ok: true };
  });
}
