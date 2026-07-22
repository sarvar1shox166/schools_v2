import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { assignedTeacherIds } from "../../lib/moderator.js";
import { pushNotificationPing } from "../notifications/notifications.ws.js";

const createSchema = z.object({
  scheduleSlotId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  conductedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic: z.string().optional(),
  homework: z.string().optional(),
  zoomLink: z.string().url().optional(),
});

const updateSchema = z.object({
  topic: z.string().optional(),
  homework: z.string().optional(),
  zoomLink: z.string().optional(),
  status: z.enum(["conducted", "cancelled"]).optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const endLessonSchema = z.object({
  scheduleSlotId: z.string().uuid(),
  topic: z.string().optional(),
  homework: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    xpReward: z.number().int().nonnegative().default(30),
  }).optional(),
});

export async function lessonsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // List lessons for a group (or all for admin)
  app.get(
    "/lessons",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const { groupId, from, to } = request.query as { groupId?: string; from?: string; to?: string };

      const params: unknown[] = [tenantId];
      let filter = "";

      if (groupId) {
        params.push(groupId);
        filter += ` AND l.group_id = $${params.length}`;
      }
      if (role === "teacher") {
        const tr = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
        if (tr.rows[0]) {
          params.push(tr.rows[0].id);
          filter += ` AND l.teacher_id = $${params.length}`;
        }
      }
      if (from) {
        params.push(from);
        filter += ` AND l.conducted_at >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        filter += ` AND l.conducted_at <= $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT l.id, l.group_id AS "groupId", g.name AS "groupName", g.color,
                l.teacher_id AS "teacherId", tu.full_name AS "teacherName",
                l.conducted_at AS "conductedAt", l.topic, l.homework, l.zoom_link AS "zoomLink",
                l.status,
                COUNT(ar.id)::int AS "totalStudents",
                COUNT(ar.id) FILTER (WHERE ar.status = 'p')::int AS "presentCount",
                COUNT(ar.id) FILTER (WHERE ar.status = 'ae')::int AS "excusedCount"
         FROM lessons l
         JOIN groups g ON g.id = l.group_id
         JOIN teachers t ON t.id = l.teacher_id
         JOIN users tu ON tu.id = t.user_id
         LEFT JOIN attendance_records ar ON ar.lesson_id = l.id
         WHERE l.tenant_id = $1 ${filter}
         GROUP BY l.id, g.name, g.color, tu.full_name
         ORDER BY l.conducted_at DESC
         LIMIT 100`,
        params
      );
      return rows;
    }
  );

  // Create a lesson
  app.post(
    "/lessons",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] },
    async (request, reply) => {
      const { tenantId, role, sub } = request.user;
      const body = createSchema.parse(request.body);

      const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
      let teacherId = teacherRes.rows[0]?.id;

      if (!teacherId && (role === "super_admin" || role === "admin")) {
        // For admin creating a lesson, require groupId to infer teacher
        if (body.groupId) {
          const gr = await pool.query(`SELECT teacher_id FROM groups WHERE id = $1`, [body.groupId]);
          teacherId = gr.rows[0]?.teacher_id;
        }
      }

      if (!teacherId) return reply.code(400).send({ error: "Teacher not found" });

      const { rows } = await pool.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, topic, homework, zoom_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tenantId, body.scheduleSlotId ?? null, body.groupId ?? null, teacherId,
         body.conductedAt, body.topic ?? null, body.homework ?? null, body.zoomLink ?? null]
      );
      return reply.code(201).send({ id: rows[0].id });
    }
  );

  // Get lesson detail with attendance
  app.get(
    "/lessons/:id",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = request.user;

      const lessonRes = await pool.query(
        `SELECT l.id, l.group_id AS "groupId", g.name AS "groupName",
                l.teacher_id AS "teacherId", tu.full_name AS "teacherName",
                l.conducted_at AS "conductedAt", l.topic, l.homework,
                l.zoom_link AS "zoomLink", l.status, l.schedule_slot_id AS "scheduleSlotId"
         FROM lessons l
         JOIN groups g ON g.id = l.group_id
         JOIN teachers t ON t.id = l.teacher_id
         JOIN users tu ON tu.id = t.user_id
         WHERE l.id = $1 AND l.tenant_id = $2`,
        [id, tenantId]
      );
      if (lessonRes.rows.length === 0) return reply.code(404).send({ error: "Lesson not found" });

      const attendanceRes = await pool.query(
        `SELECT ar.student_id AS "studentId", u.full_name AS "fullName",
                ar.status, ar.reason, ar.lesson_counted AS "lessonCounted"
         FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         JOIN users u ON u.id = s.user_id
         WHERE ar.lesson_id = $1
         ORDER BY u.full_name`,
        [id]
      );

      return { ...lessonRes.rows[0], attendance: attendanceRes.rows };
    }
  );

  // Update lesson
  app.patch(
    "/lessons/:id",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateSchema.parse(request.body);
      const { tenantId } = request.user;
      const { rowCount } = await pool.query(
        `UPDATE lessons SET
           topic = COALESCE($1, topic),
           homework = COALESCE($2, homework),
           zoom_link = COALESCE($3, zoom_link),
           status = COALESCE($4, status)
         WHERE id = $5 AND tenant_id = $6`,
        [body.topic ?? null, body.homework ?? null, body.zoomLink ?? null, body.status ?? null, id, tenantId]
      );
      if (!rowCount) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    }
  );

  // ── Student → teacher post-lesson reviews ─────────────────────────────────────

  // Lessons the student attended and hasn't reviewed yet (most recent first)
  app.get("/me/lessons/pending-reviews", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub } = request.user;
    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [sub]);
    const studentId = studentRes.rows[0]?.id;
    if (!studentId) return [];

    const { rows } = await pool.query(
      `SELECT l.id AS "lessonId", l.topic, l.conducted_at AS "conductedAt",
              tu.full_name AS "teacherName"
       FROM attendance_records ar
       JOIN lessons l ON l.id = ar.lesson_id
       JOIN teachers t ON t.id = l.teacher_id
       JOIN users tu ON tu.id = t.user_id
       WHERE ar.student_id = $1 AND ar.status IN ('p','l')
         AND NOT EXISTS (
           SELECT 1 FROM lesson_student_reviews r WHERE r.lesson_id = l.id AND r.student_id = $1
         )
       ORDER BY l.conducted_at DESC
       LIMIT 10`,
      [studentId]
    );
    return rows;
  });

  app.post("/lessons/:id/review", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = reviewSchema.parse(request.body);
    const { sub } = request.user;

    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [sub]);
    const studentId = studentRes.rows[0]?.id;
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const attended = await pool.query(
      `SELECT 1 FROM attendance_records WHERE lesson_id = $1 AND student_id = $2 AND status IN ('p','l')`,
      [id, studentId]
    );
    if (attended.rows.length === 0) return reply.code(403).send({ error: "Bu darsda qatnashmagansiz" });

    const lessonRes = await pool.query(`SELECT teacher_id AS "teacherId" FROM lessons WHERE id = $1`, [id]);
    const teacherId = lessonRes.rows[0]?.teacherId;
    if (!teacherId) return reply.code(404).send({ error: "Lesson not found" });

    // Raqamli baho darhol hisoblanadi; izoh matni esa moderator ko'rib chiqmaguncha
    // o'qituvchiga ko'rinmaydi (izohsiz bahoda ko'rib chiqiladigan narsa yo'q).
    const moderationStatus = body.comment ? "pending" : "approved";

    await pool.query(
      `INSERT INTO lesson_student_reviews (lesson_id, student_id, teacher_id, rating, comment, moderation_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (lesson_id, student_id) DO UPDATE
       SET rating = EXCLUDED.rating, comment = EXCLUDED.comment,
           moderation_status = EXCLUDED.moderation_status, moderated_by = NULL, moderated_at = NULL`,
      [id, studentId, teacherId, body.rating, body.comment ?? null, moderationStatus]
    );
    return reply.code(201).send({ ok: true });
  });

  // Admin-only: student reviews for a given teacher
  app.get("/teachers/:id/student-reviews", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at AS "createdAt",
              r.moderation_status AS "moderationStatus",
              su.full_name AS "studentName", l.topic, l.conducted_at AS "conductedAt"
       FROM lesson_student_reviews r
       JOIN students s ON s.id = r.student_id
       JOIN users su ON su.id = s.user_id
       JOIN lessons l ON l.id = r.lesson_id
       JOIN teachers t ON t.id = r.teacher_id
       WHERE r.teacher_id = $1 AND t.tenant_id = $2
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [id, tenantId]
    );
    return rows;
  });

  // ── O'quvchi uchun: dars tarixi + tafsilot (davomat + o'zi qoldirgan baho/izoh) ──
  app.get("/me/lessons/history", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub } = request.user;
    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [sub]);
    const studentId = studentRes.rows[0]?.id;
    if (!studentId) return [];

    const { rows } = await pool.query(
      `SELECT l.id AS "lessonId", l.topic, l.conducted_at AS "conductedAt",
              tu.full_name AS "teacherName", ar.status AS "attendanceStatus", ar.reason,
              r.rating, r.comment
       FROM attendance_records ar
       JOIN lessons l ON l.id = ar.lesson_id
       JOIN teachers t ON t.id = l.teacher_id
       JOIN users tu ON tu.id = t.user_id
       LEFT JOIN lesson_student_reviews r ON r.lesson_id = l.id AND r.student_id = ar.student_id
       WHERE ar.student_id = $1
       ORDER BY l.conducted_at DESC
       LIMIT 100`,
      [studentId]
    );
    return rows;
  });

  // ── O'qituvchi uchun: dars tarixi + tafsilot (davomat + tasdiqlangan baho/izohlar) ──
  app.get("/teachers/me/lessons/history", { onRequest: [app.requireRole("teacher")] }, async (request) => {
    const { sub } = request.user;
    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
    const teacherId = teacherRes.rows[0]?.id;
    if (!teacherId) return [];

    const { rows } = await pool.query(
      `SELECT l.id AS "lessonId", l.topic, l.conducted_at AS "conductedAt",
              g.name AS "groupName",
              att."totalStudents", att."presentCount", att."lateCount", att."absentCount", att."excusedCount",
              rev."avgRating", rev."reviewCount", rev.reviews
       FROM lessons l
       LEFT JOIN groups g ON g.id = l.group_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS "totalStudents",
                COUNT(*) FILTER (WHERE ar.status = 'p')::int AS "presentCount",
                COUNT(*) FILTER (WHERE ar.status = 'l')::int AS "lateCount",
                COUNT(*) FILTER (WHERE ar.status = 'a')::int AS "absentCount",
                COUNT(*) FILTER (WHERE ar.status = 'ae')::int AS "excusedCount"
         FROM attendance_records ar
         WHERE ar.lesson_id = l.id
       ) att ON true
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(r.rating)::numeric, 1) AS "avgRating",
                COUNT(*)::int AS "reviewCount",
                COALESCE(
                  json_agg(
                    json_build_object(
                      'studentName', su.full_name,
                      'rating', r.rating,
                      'comment', CASE WHEN r.moderation_status = 'approved' THEN r.comment ELSE NULL END
                    ) ORDER BY r.created_at DESC
                  ),
                  '[]'::json
                ) AS reviews
         FROM lesson_student_reviews r
         JOIN students s ON s.id = r.student_id
         JOIN users su ON su.id = s.user_id
         WHERE r.lesson_id = l.id
       ) rev ON true
       WHERE l.teacher_id = $1
       ORDER BY l.conducted_at DESC
       LIMIT 100`,
      [teacherId]
    );
    return rows;
  });

  // ── Moderatsiya navbati: kutilayotgan (pending) o'quvchi izohlari ───────────────
  app.get(
    "/moderator/lesson-reviews",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "moderator")] },
    async (request) => {
      const { tenantId, role, sub } = request.user;
      const params: unknown[] = [tenantId];
      let teacherFilter = "";
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        teacherFilter = "AND r.teacher_id = ANY($2::uuid[])";
        params.push(ids);
      }
      const { rows } = await pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at AS "createdAt",
                su.full_name AS "studentName", tu.full_name AS "teacherName",
                l.topic, l.conducted_at AS "conductedAt"
         FROM lesson_student_reviews r
         JOIN teachers t ON t.id = r.teacher_id
         JOIN users tu ON tu.id = t.user_id
         JOIN students s ON s.id = r.student_id
         JOIN users su ON su.id = s.user_id
         JOIN lessons l ON l.id = r.lesson_id
         WHERE t.tenant_id = $1 AND r.moderation_status = 'pending' ${teacherFilter}
         ORDER BY r.created_at ASC`,
        params
      );
      return rows;
    }
  );

  // Izohni tasdiqlash — o'qituvchiga ko'rinadigan bo'ladi
  app.post(
    "/moderator/lesson-reviews/:id/approve",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "moderator")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId, role, sub } = request.user;
      let teacherFilter = "";
      const params: unknown[] = [sub, id, tenantId];
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        teacherFilter = "AND r.teacher_id = ANY($4::uuid[])";
        params.push(ids);
      }
      const { rowCount } = await pool.query(
        `UPDATE lesson_student_reviews r SET moderation_status = 'approved', moderated_by = $1, moderated_at = now()
         FROM teachers t
         WHERE r.id = $2 AND r.teacher_id = t.id AND t.tenant_id = $3 ${teacherFilter}`,
        params
      );
      if (!rowCount) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    }
  );

  // Izohni rad etish — o'qituvchiga hech qachon ko'rsatilmaydi
  app.post(
    "/moderator/lesson-reviews/:id/reject",
    { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "moderator")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tenantId, role, sub } = request.user;
      let teacherFilter = "";
      const params: unknown[] = [sub, id, tenantId];
      if (role === "moderator") {
        const ids = await assignedTeacherIds(tenantId!, sub);
        teacherFilter = "AND r.teacher_id = ANY($4::uuid[])";
        params.push(ids);
      }
      const { rowCount } = await pool.query(
        `UPDATE lesson_student_reviews r SET moderation_status = 'rejected', moderated_by = $1, moderated_at = now()
         FROM teachers t
         WHERE r.id = $2 AND r.teacher_id = t.id AND t.tenant_id = $3 ${teacherFilter}`,
        params
      );
      if (!rowCount) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    }
  );

  // ── Darsni tugatish — teacher_attendance orqali boshlangan darsni yakunlaydi ──
  // Ixtiyoriy ravishda uyga vazifa ham beriladi (faqat "guruh" turidagi darslarda)
  app.post("/lessons/end", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { sub, tenantId } = request.user;
    const body = endLessonSchema.parse(request.body);
    const today = new Date().toISOString().slice(0, 10);

    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [sub]);
    const teacherId = teacherRes.rows[0]?.id;
    if (!teacherId) return reply.code(403).send({ error: "Forbidden" });

    const slotRes = await pool.query(
      `SELECT sl.id, sl.group_id AS "groupId", sl.lesson_type AS "lessonType",
              sl.meeting_url AS "zoomLink", COALESCE(sl.teacher_id, g.teacher_id) AS "teacherId",
              sl.start_time AS "startTime", sl.duration_minutes AS "durationMinutes"
       FROM schedule_slots sl LEFT JOIN groups g ON g.id = sl.group_id
       WHERE sl.id = $1 AND sl.tenant_id = $2`,
      [body.scheduleSlotId, tenantId]
    );
    const slot = slotRes.rows[0];
    if (!slot || slot.teacherId !== teacherId) return reply.code(403).send({ error: "Forbidden" });

    // Dars rejalashtirilgan davomiyligi tugamasdan yakunlanishiga yo'l qo'yilmaydi —
    // frontend'dagi cheklov faqat UX, haqiqiy tekshiruv shu yerda bo'lishi kerak.
    const [startH, startM] = String(slot.startTime).split(":").map(Number);
    const scheduledStart = new Date();
    scheduledStart.setHours(startH, startM, 0, 0);
    const scheduledEnd = new Date(scheduledStart.getTime() + slot.durationMinutes * 60000);
    if (Date.now() < scheduledEnd.getTime()) {
      return reply.code(400).send({
        error: "Dars hali tugamagan",
        endsAt: scheduledEnd.toISOString(),
      });
    }

    const client = await pool.connect();
    let lessonId: string | null = null;
    let homeworkId: string | null = null;
    try {
      await client.query("BEGIN");
      const lessonRes = await client.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, topic, zoom_link, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'conducted')
         ON CONFLICT (schedule_slot_id, conducted_at) WHERE schedule_slot_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [tenantId, slot.id, slot.groupId, teacherId, today, body.topic ?? null, slot.zoomLink]
      );
      lessonId = lessonRes.rows[0]?.id ?? null;
      if (!lessonId) {
        // ON CONFLICT DO NOTHING — dars bugun uchun allaqachon yaratilgan, o'sha yozuvni olamiz.
        const existing = await client.query(
          `SELECT id FROM lessons WHERE schedule_slot_id = $1 AND conducted_at = $2`,
          [slot.id, today]
        );
        lessonId = existing.rows[0]?.id ?? null;
      }

      // Davomat odatda dars tugashidan oldin (jonli darsda) belgilanadi — o'sha payt
      // hali lessons yozuvi yo'q edi, shuning uchun attendance_records.lesson_id bo'sh
      // qolgan bo'lishi mumkin. Endi dars yaratilgach, shu kunga tegishli davomat
      // yozuvlarini shu darsga bog'lab qo'yamiz (baholash/dars tarixi shunga tayanadi).
      if (lessonId) {
        await client.query(
          `UPDATE attendance_records SET lesson_id = $1
           WHERE schedule_slot_id = $2 AND date = $3 AND lesson_id IS NULL`,
          [lessonId, slot.id, today]
        );
      }

      if (body.homework && lessonRes.rows.length > 0 && slot.lessonType === "guruh" && slot.groupId) {
        const hwRes = await client.query(
          `INSERT INTO homework (tenant_id, group_id, title, description, due_date, xp_reward)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [tenantId, slot.groupId, body.homework.title, body.homework.description ?? null,
           body.homework.dueDate ?? null, body.homework.xpReward]
        );
        homeworkId = hwRes.rows[0].id;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Darsda qatnashgan (p/l) o'quvchilarga real-time signal — ular ilovada bo'lsa,
    // ustozni baholash oynasi darhol ochiladi (AutoLessonReviewPrompt).
    if (lessonId) {
      const attendees = await pool.query(
        `SELECT u.id AS "userId" FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         JOIN users u ON u.id = s.user_id
         WHERE ar.lesson_id = $1 AND ar.status IN ('p', 'l')`,
        [lessonId]
      );
      for (const row of attendees.rows) pushNotificationPing(row.userId, "lessonEnded");
    }

    return reply.code(201).send({ lessonId, homeworkId });
  });
}
