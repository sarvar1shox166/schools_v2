import type { PoolClient } from "pg";
import { awardXp } from "../gamification/xp.js";

/** Butun kurs (barcha darslar + yakuniy test, agar bo'lsa) tugallanganligini
 *  tekshiradi va shunday bo'lsa kurs-tugatish XP'sini bir marta beradi.
 *  Ham dars tugallanganda, ham yakuniy test topshirilganda chaqiriladi —
 *  har ikkalasi ham "oxirgi qadam" bo'lishi mumkin. */
export async function checkCourseCompletion(
  client: PoolClient, studentId: string, courseId: string
): Promise<number | undefined> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`course-complete:${studentId}:${courseId}`]);

  const alreadyRes = await client.query(
    `SELECT 1 FROM video_course_completions WHERE student_id = $1 AND course_id = $2`,
    [studentId, courseId]
  );
  if (alreadyRes.rows.length > 0) return undefined;

  const lessonsRes = await client.query(
    `SELECT v.id, (vp.lesson_xp_awarded_at IS NOT NULL) AS "lessonDone"
     FROM video_lessons v
     LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.student_id = $1
     WHERE v.course_id = $2`,
    [studentId, courseId]
  );
  if (lessonsRes.rows.length === 0 || !lessonsRes.rows.every((r) => r.lessonDone)) return undefined;

  const examQRes = await client.query(
    `SELECT count(*)::int AS n FROM video_course_exam_questions WHERE course_id = $1`,
    [courseId]
  );
  const hasExam = examQRes.rows[0].n > 0;
  let examPassed = !hasExam;
  if (hasExam) {
    const attemptRes = await client.query(
      `SELECT score, total FROM video_course_exam_attempts WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    const attempt = attemptRes.rows[0];
    examPassed = !!attempt && attempt.score === attempt.total;
  }
  if (!examPassed) return undefined;

  const courseRes = await client.query(
    `SELECT course_completion_xp AS xp FROM video_courses WHERE id = $1`,
    [courseId]
  );
  const xp: number = courseRes.rows[0]?.xp ?? 0;

  await client.query(
    `INSERT INTO video_course_completions (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [studentId, courseId]
  );
  if (xp > 0) {
    await awardXp(client, studentId, xp);
    return xp;
  }
  return undefined;
}

/** Bitta dars (video 100% ko'rilgan + testi bor bo'lsa muvaffaqiyatli topshirilgan)
 *  tugallanganda dars-tugatish XP'sini bir marta beradi, so'ng butun kurs ham
 *  tugallanganligini tekshiradi. Video-progress yoki quiz-submit — ikkalasidan
 *  ham chaqiriladi, chunki har ikkisi ham darsni "yakunlaydigan oxirgi qadam" bo'lishi mumkin. */
export async function checkLessonCompletion(
  client: PoolClient, studentId: string, videoId: string
): Promise<{ lessonXpAwarded?: number; courseXpAwarded?: number }> {
  const result: { lessonXpAwarded?: number; courseXpAwarded?: number } = {};

  const videoRes = await client.query(
    `SELECT v.course_id AS "courseId", c.lesson_completion_xp AS "lessonXp"
     FROM video_lessons v JOIN video_courses c ON c.id = v.course_id
     WHERE v.id = $1`,
    [videoId]
  );
  const video = videoRes.rows[0];
  if (!video) return result;
  const courseId: string = video.courseId;

  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [`lesson-complete:${studentId}:${videoId}`]);

  const progressRes = await client.query(
    `SELECT progress_pct AS "progressPct", lesson_xp_awarded_at AS "awardedAt"
     FROM video_progress WHERE student_id = $1 AND video_id = $2`,
    [studentId, videoId]
  );
  const progress = progressRes.rows[0];
  if (!progress || progress.progressPct < 100 || progress.awardedAt) return result;

  const questionCountRes = await client.query(
    `SELECT count(*)::int AS n FROM video_quiz_questions WHERE video_id = $1`,
    [videoId]
  );
  const hasQuiz = questionCountRes.rows[0].n > 0;
  let quizPassed = !hasQuiz;
  if (hasQuiz) {
    const attemptRes = await client.query(
      `SELECT score, total FROM video_quiz_attempts WHERE student_id = $1 AND video_id = $2`,
      [studentId, videoId]
    );
    const attempt = attemptRes.rows[0];
    quizPassed = !!attempt && attempt.score === attempt.total;
  }
  if (!quizPassed) return result;

  await client.query(
    `UPDATE video_progress SET lesson_xp_awarded_at = now() WHERE student_id = $1 AND video_id = $2`,
    [studentId, videoId]
  );
  if (video.lessonXp > 0) {
    await awardXp(client, studentId, video.lessonXp);
    result.lessonXpAwarded = video.lessonXp;
  }

  const courseXp = await checkCourseCompletion(client, studentId, courseId);
  if (courseXp) result.courseXpAwarded = courseXp;

  return result;
}
