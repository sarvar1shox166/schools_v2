import path from "node:path";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { awardXp } from "../gamification/xp.js";
import { checkLessonCompletion, checkCourseCompletion } from "./course-completion.js";
import {
  uploadFile, uploadStream, deleteFile, keyFromUrl, looksLikeTextMarkup,
  assertAllowedMimeType, assertContentMatchesMimeType, UploadValidationError, UPLOAD_LIMITS,
} from "../../lib/storage.js";

const createCourseSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["zoom", "debyut", "taktika", "endshpil", "strategiya"]),
  thumbnailUrl: z.string().optional(),
  thumbnailColor: z.string().optional(),
  thumbnailIcon: z.string().optional(),
  lessonCompletionXp: z.number().int().min(0).optional(),
  courseCompletionXp: z.number().int().min(0).optional(),
});

const updateCourseSchema = createCourseSchema.partial();

const createLessonSchema = z.object({
  title: z.string().min(1),
  videoUrl: z.string().min(1),
  durationSeconds: z.number().int().positive().optional(),
  thumbnailUrl: z.string().optional(),
});

const updateLessonSchema = createLessonSchema.partial();

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
});

const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

const quizSubmitSchema = z.object({
  answers: z.array(z.number().int().min(0)),
});

const examQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
});

const examSubmitSchema = z.object({
  answers: z.array(z.number().int().min(0)),
});

const VIDEO_XP_REWARD = 20;
const QUIZ_XP_REWARD = 15;

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function videosRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // ── Kurslar ──────────────────────────────────────────────────────────────────

  app.get("/video-courses", async (request) => {
    const { tenantId, sub, role } = request.user;
    const { category } = request.query as { category?: string };

    const conditions: string[] = ["c.tenant_id = $1"];
    const params: unknown[] = [tenantId];
    if (category && category !== "hammasi") {
      conditions.push(`c.category = $${params.length + 1}`);
      params.push(category);
    }

    let progressJoin = "";
    let watchedSelect = "0";
    if (role === "student") {
      const studentId = await getStudentIdForUser(sub);
      params.push(studentId);
      progressJoin = `LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.student_id = $${params.length} AND vp.progress_pct >= 100`;
      watchedSelect = "COUNT(DISTINCT vp.video_id)::int";
    }

    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.category, c.thumbnail_url AS "thumbnailUrl", c.thumbnail_color AS "thumbnailColor",
              c.thumbnail_icon AS "thumbnailIcon",
              c.lesson_completion_xp AS "lessonCompletionXp", c.course_completion_xp AS "courseCompletionXp",
              COUNT(DISTINCT v.id)::int AS "videoCount",
              ${watchedSelect} AS "watchedCount"
       FROM video_courses c
       LEFT JOIN video_lessons v ON v.course_id = c.id
       ${progressJoin}
       WHERE ${conditions.join(" AND ")}
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      params
    );
    return rows;
  });

  app.get("/video-courses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId, sub, role } = request.user;

    const courseRes = await pool.query(
      `SELECT id, title, category, thumbnail_url AS "thumbnailUrl", thumbnail_color AS "thumbnailColor",
              thumbnail_icon AS "thumbnailIcon",
              lesson_completion_xp AS "lessonCompletionXp", course_completion_xp AS "courseCompletionXp"
       FROM video_courses WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    const course = courseRes.rows[0];
    if (!course) return reply.code(404).send({ error: "Kurs topilmadi" });

    let progressJoin = "";
    let progressSelect = "0";
    let lessonDoneSelect = "false";
    const params: unknown[] = [id];
    let studentId: string | null = null;
    if (role === "student") {
      studentId = await getStudentIdForUser(sub);
      params.push(studentId);
      progressJoin = `LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.student_id = $${params.length}`;
      progressSelect = "COALESCE(vp.progress_pct, 0)";
      lessonDoneSelect = "(vp.lesson_xp_awarded_at IS NOT NULL)";
    }

    const lessonsRes = await pool.query(
      `SELECT v.id, v.title, v.video_url AS "videoUrl", v.duration_seconds AS "durationSeconds",
              v.thumbnail_url AS "thumbnailUrl",
              ${progressSelect} AS "progressPct",
              ${lessonDoneSelect} AS "lessonDone"
       FROM video_lessons v
       ${progressJoin}
       WHERE v.course_id = $1
       ORDER BY v.created_at ASC`,
      params
    );

    let exam: { questionCount: number; completed: boolean; allLessonsDone: boolean } | undefined;
    if (role === "student" && studentId) {
      const examQRes = await pool.query(
        `SELECT count(*)::int AS n FROM video_course_exam_questions WHERE course_id = $1`, [id]
      );
      const completedRes = await pool.query(
        `SELECT 1 FROM video_course_completions WHERE student_id = $1 AND course_id = $2`, [studentId, id]
      );
      exam = {
        questionCount: examQRes.rows[0].n,
        completed: completedRes.rows.length > 0,
        allLessonsDone: lessonsRes.rows.length > 0 && lessonsRes.rows.every((r) => r.lessonDone),
      };
    }

    return { ...course, lessons: lessonsRes.rows, exam };
  });

  app.post("/video-courses", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const body = createCourseSchema.parse(request.body);
    const { tenantId, sub, role } = request.user;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });

    let teacherId: string | null = null;
    if (role === "teacher") teacherId = await getTeacherIdForUser(sub);

    const { rows } = await pool.query(
      `INSERT INTO video_courses (tenant_id, teacher_id, title, category, thumbnail_url, thumbnail_color, thumbnail_icon, lesson_completion_xp, course_completion_xp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [tenantId, teacherId, body.title, body.category,
       body.thumbnailUrl ?? null, body.thumbnailColor ?? null, body.thumbnailIcon ?? null,
       body.lessonCompletionXp ?? 0, body.courseCompletionXp ?? 0]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/video-courses/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCourseSchema.parse(request.body);
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(
      `UPDATE video_courses SET
         title = COALESCE($1, title),
         category = COALESCE($2, category),
         thumbnail_url = COALESCE($3, thumbnail_url),
         thumbnail_color = COALESCE($4, thumbnail_color),
         thumbnail_icon = COALESCE($5, thumbnail_icon),
         lesson_completion_xp = COALESCE($6, lesson_completion_xp),
         course_completion_xp = COALESCE($7, course_completion_xp)
       WHERE id = $8 AND tenant_id = $9`,
      [body.title ?? null, body.category ?? null, body.thumbnailUrl ?? null,
       body.thumbnailColor ?? null, body.thumbnailIcon ?? null,
       body.lessonCompletionXp ?? null, body.courseCompletionXp ?? null, id, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  app.delete("/video-courses/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const courseRes = await pool.query(
      `SELECT thumbnail_url AS "thumbnailUrl" FROM video_courses WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!courseRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const lessonsRes = await pool.query(
      `SELECT video_url AS "videoUrl", thumbnail_url AS "thumbnailUrl" FROM video_lessons WHERE course_id = $1`,
      [id]
    );

    const { rowCount } = await pool.query(
      `DELETE FROM video_courses WHERE id = $1 AND tenant_id = $2`, [id, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });

    // Kursning o'zi (cascade orqali darslari ham) DB'dan o'chdi — endi S3/diskdagi
    // haqiqiy fayllarni ham tozalaymiz, aks holda orfan fayllar qolib ketadi.
    const urls = [
      courseRes.rows[0].thumbnailUrl,
      ...lessonsRes.rows.flatMap((r) => [r.videoUrl, r.thumbnailUrl]),
    ].filter(Boolean) as string[];
    for (const url of urls) {
      const key = keyFromUrl(url);
      if (key) await deleteFile(key).catch(() => {});
    }
    return { ok: true };
  });

  // ── Kurs ichidagi video-darslar ──────────────────────────────────────────────

  app.post("/video-courses/:id/videos", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id: courseId } = request.params as { id: string };
    const body = createLessonSchema.parse(request.body);
    const { tenantId } = request.user;

    const courseRes = await pool.query(`SELECT id FROM video_courses WHERE id = $1 AND tenant_id = $2`, [courseId, tenantId]);
    if (!courseRes.rows[0]) return reply.code(404).send({ error: "Kurs topilmadi" });

    const { rows } = await pool.query(
      `INSERT INTO video_lessons (tenant_id, course_id, title, video_url, duration_seconds, thumbnail_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [tenantId, courseId, body.title, body.videoUrl, body.durationSeconds ?? null, body.thumbnailUrl ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  // Upload video file → returns { url }
  // Katta fayl (1 GB gacha) bo'lgani uchun butun faylni xotirada Buffer sifatida
  // ushlab turmasdan to'g'ridan-to'g'ri oqim (stream) sifatida S3/diskka yuboriladi.
  // Faqat birinchi bo'lakni (peek) HTML/skript sifatida yashirilgan fayllarni
  // aniqlash uchun tekshiramiz — bu butun faylni sniff qilishga teng emas, lekin
  // asosiy spoofing hujumini (masalan .html faylni video deb yuklash) to'xtatadi.
  app.post("/videos/upload", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { tenantId } = request.user;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });
    const data = await request.file({ limits: { fileSize: UPLOAD_LIMITS.video.maxBytes } });
    if (!data) return reply.code(400).send({ error: "Fayl topilmadi" });

    try {
      assertAllowedMimeType(data.mimetype, "video");
    } catch (err) {
      if (err instanceof UploadValidationError) return reply.code(400).send({ error: err.message });
      throw err;
    }

    const firstChunk: Buffer = await new Promise((resolve, reject) => {
      data.file.once("data", (chunk: Buffer) => { data.file.pause(); resolve(chunk); });
      data.file.once("end", () => resolve(Buffer.alloc(0)));
      data.file.once("error", reject);
    });
    if (looksLikeTextMarkup(firstChunk)) {
      return reply.code(400).send({ error: "Fayl mazmuni e'lon qilingan turga mos kelmadi" });
    }

    const combined = new PassThrough();
    combined.write(firstChunk);
    data.file.pipe(combined);

    const ext = path.extname(data.filename) || ".mp4";
    const key = `videos/${tenantId}/${randomUUID()}${ext}`;
    const upload = uploadStream(combined, key, data.mimetype);

    let clientAborted = false;
    request.raw.on("close", () => {
      if (!request.raw.complete && !clientAborted) {
        clientAborted = true;
        upload.abort();
      }
    });

    try {
      const url = await upload.done;
      if (data.file.truncated) {
        await upload.abort();
        return reply.code(413).send({ error: "Fayl hajmi juda katta (max 1 GB)" });
      }
      return { url };
    } catch (err) {
      if (clientAborted) return reply.code(499).send({ error: "Yuklash bekor qilindi" });
      request.log.error(err);
      return reply.code(500).send({ error: "Video yuklashda xatolik yuz berdi" });
    }
  });

  // Upload thumbnail image → returns { url }
  app.post("/upload/image", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { tenantId } = request.user;
    if (!tenantId) return reply.code(400).send({ error: "Tenant topilmadi" });
    const data = await request.file({ limits: { fileSize: UPLOAD_LIMITS.image.maxBytes } });
    if (!data) return reply.code(400).send({ error: "Fayl topilmadi" });

    try {
      assertAllowedMimeType(data.mimetype, "image");
    } catch (err) {
      if (err instanceof UploadValidationError) return reply.code(400).send({ error: err.message });
      throw err;
    }

    const ext = path.extname(data.filename) || ".jpg";
    const key = `images/${tenantId}/${randomUUID()}${ext}`;
    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch {
      return reply.code(413).send({ error: "Fayl hajmi juda katta (max 10 MB)" });
    }
    try {
      assertContentMatchesMimeType(data.mimetype, buffer);
    } catch (err) {
      if (err instanceof UploadValidationError) return reply.code(400).send({ error: err.message });
      throw err;
    }
    const url = await uploadFile(buffer, key, data.mimetype);
    return { url };
  });

  app.patch("/videos/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateLessonSchema.parse(request.body);
    const { tenantId } = request.user;

    const prevRes = await pool.query(
      `SELECT video_url AS "videoUrl", thumbnail_url AS "thumbnailUrl" FROM video_lessons WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!prevRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const previousVideoUrl = prevRes.rows[0].videoUrl as string;
    const previousThumbnailUrl = prevRes.rows[0].thumbnailUrl as string | null;

    const { rowCount } = await pool.query(
      `UPDATE video_lessons SET
         title = COALESCE($1, title),
         video_url = COALESCE($2, video_url),
         duration_seconds = COALESCE($3, duration_seconds),
         thumbnail_url = COALESCE($4, thumbnail_url)
       WHERE id = $5 AND tenant_id = $6`,
      [body.title ?? null, body.videoUrl ?? null, body.durationSeconds ?? null, body.thumbnailUrl ?? null, id, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });

    // Video/muqova fayli almashtirilgan bo'lsa — eskisini S3/diskdan ham o'chiramiz.
    if (body.videoUrl && body.videoUrl !== previousVideoUrl) {
      const oldKey = keyFromUrl(previousVideoUrl);
      if (oldKey) await deleteFile(oldKey).catch(() => {});
    }
    if (body.thumbnailUrl && body.thumbnailUrl !== previousThumbnailUrl) {
      const oldKey = keyFromUrl(previousThumbnailUrl ?? "");
      if (oldKey) await deleteFile(oldKey).catch(() => {});
    }
    return { ok: true };
  });

  app.delete("/videos/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const videoRes = await pool.query(
      `SELECT video_url AS "videoUrl", thumbnail_url AS "thumbnailUrl" FROM video_lessons WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!videoRes.rows[0]) return reply.code(404).send({ error: "Not found" });

    const { rowCount } = await pool.query(
      `DELETE FROM video_lessons WHERE id = $1 AND tenant_id = $2`, [id, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });

    for (const url of [videoRes.rows[0].videoUrl, videoRes.rows[0].thumbnailUrl].filter(Boolean)) {
      const key = keyFromUrl(url);
      if (key) await deleteFile(key).catch(() => {});
    }
    return { ok: true };
  });

  app.post("/videos/:id/progress", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = progressSchema.parse(request.body);
    const { tenantId } = request.user;
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const videoRes = await pool.query(
      `SELECT v.id FROM video_lessons v JOIN video_courses c ON c.id = v.course_id
       WHERE v.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );
    if (!videoRes.rows[0]) return reply.code(404).send({ error: "Not found" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Bir xil student/video uchun parallel so'rovlarni serializatsiya qilamiz —
      // aks holda ikkita bir vaqtdagi chaqiruv "hali tugallanmagan" holatni ikkalasi
      // ham ko'rib, VIDEO_XP_REWARD'ni ikki marta berishi mumkin edi.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`video-progress:${studentId}:${id}`]);

      const existing = await client.query(
        `SELECT progress_pct AS "progressPct" FROM video_progress WHERE student_id = $1 AND video_id = $2`,
        [studentId, id]
      );
      const wasCompleted = (existing.rows[0]?.progressPct ?? 0) >= 100;

      await client.query(
        `INSERT INTO video_progress (student_id, video_id, progress_pct, watched_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (student_id, video_id) DO UPDATE SET progress_pct = $3, watched_at = now()`,
        [studentId, id, body.progressPct]
      );

      let xpResult: Awaited<ReturnType<typeof awardXp>> | undefined;
      let xpAwarded: number | undefined;
      if (body.progressPct >= 100 && !wasCompleted) {
        xpResult = await awardXp(client, studentId, VIDEO_XP_REWARD);
        xpAwarded = VIDEO_XP_REWARD;
      }

      let completion: { lessonXpAwarded?: number; courseXpAwarded?: number } = {};
      if (body.progressPct >= 100) {
        completion = await checkLessonCompletion(client, studentId, id);
      }

      await client.query("COMMIT");
      if (xpResult) return { ...xpResult, xpAwarded, ...completion };
      if (completion.lessonXpAwarded || completion.courseXpAwarded) return { ...completion };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { progressPct: body.progressPct };
  });

  // ── Video quiz ──────────────────────────────────────────────────────────────

  app.get("/videos/:id/quiz", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role, tenantId } = request.user;
    const videoRes = await pool.query(
      `SELECT v.id FROM video_lessons v JOIN video_courses c ON c.id = v.course_id
       WHERE v.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );
    if (!videoRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const { rows } = await pool.query(
      `SELECT id, question, options, correct_index AS "correctIndex"
       FROM video_quiz_questions WHERE video_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );
    // Students shouldn't see the correct answer ahead of submitting
    if (role === "student") {
      return rows.map(({ id: qid, question, options }) => ({ id: qid, question, options }));
    }
    return rows;
  });

  app.post("/videos/:id/quiz", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = quizQuestionSchema.parse(request.body);
    const { tenantId } = request.user;
    const videoRes = await pool.query(
      `SELECT v.id FROM video_lessons v JOIN video_courses c ON c.id = v.course_id
       WHERE v.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );
    if (!videoRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const { rows } = await pool.query(
      `INSERT INTO video_quiz_questions (video_id, question, options, correct_index)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [id, body.question, JSON.stringify(body.options), body.correctIndex]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.delete("/videos/quiz/:questionId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { questionId } = request.params as { questionId: string };
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(
      `DELETE FROM video_quiz_questions q
       USING video_lessons v, video_courses c
       WHERE q.id = $1 AND v.id = q.video_id AND c.id = v.course_id AND c.tenant_id = $2`,
      [questionId, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  app.post("/videos/:id/quiz/submit", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = quizSubmitSchema.parse(request.body);
    const { tenantId } = request.user;
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const videoRes = await pool.query(
      `SELECT v.id FROM video_lessons v JOIN video_courses c ON c.id = v.course_id
       WHERE v.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );
    if (!videoRes.rows[0]) return reply.code(404).send({ error: "Not found" });

    const { rows: questions } = await pool.query(
      `SELECT id, correct_index AS "correctIndex" FROM video_quiz_questions
       WHERE video_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );
    if (questions.length === 0) return reply.code(400).send({ error: "Bu videoda test yo'q" });

    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (body.answers[i] === questions[i].correctIndex) score++;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Bir xil student/video uchun parallel submit'larni serializatsiya qilamiz.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`video-quiz:${studentId}:${id}`]);

      const already = await client.query(
        `SELECT 1 FROM video_quiz_attempts WHERE student_id = $1 AND video_id = $2`,
        [studentId, id]
      );
      await client.query(
        `INSERT INTO video_quiz_attempts (student_id, video_id, score, total)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, video_id) DO UPDATE SET score = $3, total = $4, created_at = now()`,
        [studentId, id, score, questions.length]
      );

      let xpResult: Awaited<ReturnType<typeof awardXp>> | undefined;
      if (already.rows.length === 0 && score === questions.length) {
        xpResult = await awardXp(client, studentId, QUIZ_XP_REWARD);
      }

      const completion = await checkLessonCompletion(client, studentId, id);

      await client.query("COMMIT");
      if (xpResult) return { score, total: questions.length, ...xpResult, xpAwarded: QUIZ_XP_REWARD, ...completion };
      return { score, total: questions.length, ...completion };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ── Kurs yakuniy testi ───────────────────────────────────────────────────────

  app.get("/video-courses/:id/exam", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role, tenantId } = request.user;
    const courseRes = await pool.query(`SELECT id FROM video_courses WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!courseRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const { rows } = await pool.query(
      `SELECT id, question, options, correct_index AS "correctIndex"
       FROM video_course_exam_questions WHERE course_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );
    if (role === "student") {
      return rows.map(({ id: qid, question, options }) => ({ id: qid, question, options }));
    }
    return rows;
  });

  app.post("/video-courses/:id/exam", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = examQuestionSchema.parse(request.body);
    const { tenantId } = request.user;
    const courseRes = await pool.query(`SELECT id FROM video_courses WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!courseRes.rows[0]) return reply.code(404).send({ error: "Not found" });
    const { rows } = await pool.query(
      `INSERT INTO video_course_exam_questions (course_id, question, options, correct_index)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [id, body.question, JSON.stringify(body.options), body.correctIndex]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.delete("/video-courses/exam/:questionId", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const { questionId } = request.params as { questionId: string };
    const { tenantId } = request.user;
    const { rowCount } = await pool.query(
      `DELETE FROM video_course_exam_questions q
       USING video_courses c
       WHERE q.id = $1 AND c.id = q.course_id AND c.tenant_id = $2`,
      [questionId, tenantId]
    );
    if (!rowCount) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  app.post("/video-courses/:id/exam/submit", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = examSubmitSchema.parse(request.body);
    const { tenantId } = request.user;
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const courseRes = await pool.query(`SELECT id FROM video_courses WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!courseRes.rows[0]) return reply.code(404).send({ error: "Not found" });

    const { rows: questions } = await pool.query(
      `SELECT id, correct_index AS "correctIndex" FROM video_course_exam_questions
       WHERE course_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );
    if (questions.length === 0) return reply.code(400).send({ error: "Bu kursda yakuniy test yo'q" });

    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      if (body.answers[i] === questions[i].correctIndex) score++;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`course-exam:${studentId}:${id}`]);

      await client.query(
        `INSERT INTO video_course_exam_attempts (student_id, course_id, score, total)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, course_id) DO UPDATE SET score = $3, total = $4, created_at = now()`,
        [studentId, id, score, questions.length]
      );

      const courseXpAwarded = await checkCourseCompletion(client, studentId, id);

      await client.query("COMMIT");
      return { score, total: questions.length, courseXpAwarded };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
