import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

/** Video-XP oqimi: video ko'rish XP, test XP, dars-tugatish XP va kurs-tugatish XP —
 *  har biri faqat bir marta berilishi (idempotentlik) va to'g'ri shartlarda berilishi. */
describe("video XP pipeline", () => {
  let app: FastifyInstance;
  let t: TestTenant;
  let studentToken: string;
  let courseId: string;
  let video1: string;
  let video2: string;

  const LESSON_XP = 7;
  const COURSE_XP = 25;
  const VIDEO_XP = 20; // VIDEO_XP_REWARD
  const QUIZ_XP = 15;  // QUIZ_XP_REWARD

  async function getXp(): Promise<number> {
    const { rows } = await pool.query(`SELECT xp FROM student_xp WHERE student_id = $1`, [t.studentId]);
    return rows[0]?.xp ?? 0;
  }

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTestTenant("videoxp");
    studentToken = await loginAs(app, t.studentUser.phone);

    const courseRes = await pool.query(
      `INSERT INTO video_courses (tenant_id, title, category, lesson_completion_xp, course_completion_xp)
       VALUES ($1, 'Test kurs', 'taktika', $2, $3) RETURNING id`,
      [t.tenantId, LESSON_XP, COURSE_XP]
    );
    courseId = courseRes.rows[0].id;

    const v1 = await pool.query(
      `INSERT INTO video_lessons (tenant_id, course_id, title, video_url) VALUES ($1, $2, 'Dars 1', '#') RETURNING id`,
      [t.tenantId, courseId]
    );
    video1 = v1.rows[0].id;
    const v2 = await pool.query(
      `INSERT INTO video_lessons (tenant_id, course_id, title, video_url) VALUES ($1, $2, 'Dars 2', '#') RETURNING id`,
      [t.tenantId, courseId]
    );
    video2 = v2.rows[0].id;

    // Dars 1 da test bor (1 savol, to'g'ri javob = 1), dars 2 da test yo'q.
    await pool.query(
      `INSERT INTO video_quiz_questions (video_id, question, options, correct_index)
       VALUES ($1, 'Savol?', '["A","B","C"]', 1)`,
      [video1]
    );
    // Kurs yakuniy imtihoni (1 savol, to'g'ri javob = 2).
    await pool.query(
      `INSERT INTO video_course_exam_questions (course_id, question, options, correct_index)
       VALUES ($1, 'Imtihon?', '["A","B","C"]', 2)`,
      [courseId]
    );
  });

  afterAll(async () => {
    await destroyTestTenant(t.tenantId);
    await app.close();
  });

  it("video 100% ko'rilganda VIDEO_XP beriladi, qayta yuborilganda berilmaydi", async () => {
    const before = await getXp();

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video1}/progress`,
      headers: authHeader(studentToken),
      payload: { progressPct: 100 },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).xpAwarded).toBe(VIDEO_XP);
    expect(await getXp()).toBe(before + VIDEO_XP);

    // Takroriy 100% — XP o'zgarmasligi kerak
    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video1}/progress`,
      headers: authHeader(studentToken),
      payload: { progressPct: 100 },
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body).xpAwarded).toBeUndefined();
    expect(await getXp()).toBe(before + VIDEO_XP);
  });

  it("test noto'g'ri topshirilsa XP ham, dars-tugatish ham berilmaydi", async () => {
    const before = await getXp();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video1}/quiz/submit`,
      headers: authHeader(studentToken),
      payload: { answers: [0] }, // noto'g'ri (to'g'risi 1)
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.score).toBe(0);
    expect(body.xpAwarded).toBeUndefined();
    expect(body.lessonXpAwarded).toBeUndefined();
    expect(await getXp()).toBe(before);
  });

  it("test to'g'ri qayta topshirilganda dars-tugatish XP beriladi, lekin QUIZ_XP birinchi urinishda sarflangani uchun berilmaydi", async () => {
    const before = await getXp();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video1}/quiz/submit`,
      headers: authHeader(studentToken),
      payload: { answers: [1] }, // to'g'ri
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.score).toBe(1);
    // QUIZ_XP faqat BIRINCHI urinish mukammal bo'lsa beriladi — birinchi urinish 0/1 edi
    expect(body.xpAwarded).toBeUndefined();
    // Lekin dars endi to'liq (video 100% + test mukammal) — dars XP keladi
    expect(body.lessonXpAwarded).toBe(LESSON_XP);
    expect(await getXp()).toBe(before + LESSON_XP);
  });

  it("dars-tugatish XP takror berilmaydi", async () => {
    const before = await getXp();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video1}/quiz/submit`,
      headers: authHeader(studentToken),
      payload: { answers: [1] },
    });
    expect(JSON.parse(res.body).lessonXpAwarded).toBeUndefined();
    expect(await getXp()).toBe(before);
  });

  it("testsiz dars: video 100% bo'lishi bilan dars-tugatish XP ham birga beriladi", async () => {
    const before = await getXp();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/videos/${video2}/progress`,
      headers: authHeader(studentToken),
      payload: { progressPct: 100 },
    });
    const body = JSON.parse(res.body);
    expect(body.xpAwarded).toBe(VIDEO_XP);
    expect(body.lessonXpAwarded).toBe(LESSON_XP);
    // Imtihon hali topshirilmagan — kurs XP berilmasligi kerak
    expect(body.courseXpAwarded).toBeUndefined();
    expect(await getXp()).toBe(before + VIDEO_XP + LESSON_XP);
  });

  it("yakuniy imtihon mukammal topshirilganda kurs-tugatish XP beriladi va takrorlanmaydi", async () => {
    const before = await getXp();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/video-courses/${courseId}/exam/submit`,
      headers: authHeader(studentToken),
      payload: { answers: [2] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.score).toBe(1);
    expect(body.courseXpAwarded).toBe(COURSE_XP);
    expect(await getXp()).toBe(before + COURSE_XP);

    // Qayta topshirish — kurs XP ikkinchi marta berilmaydi
    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/video-courses/${courseId}/exam/submit`,
      headers: authHeader(studentToken),
      payload: { answers: [2] },
    });
    expect(JSON.parse(res2.body).courseXpAwarded).toBeUndefined();
    expect(await getXp()).toBe(before + COURSE_XP);
  });

  it("student quiz savollarida to'g'ri javob indeksini ko'rmaydi", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/videos/${video1}/quiz`,
      headers: authHeader(studentToken),
    });
    const body = JSON.parse(res.body) as Record<string, unknown>[];
    expect(body.length).toBe(1);
    expect(body[0].correctIndex).toBeUndefined();
  });
});
