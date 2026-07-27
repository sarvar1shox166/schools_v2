import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkPuzzleMove, validateAndApplyMateStep, findAnyMateMove } from "@chess-school/chess-engine";
import { pool } from "../../db/pool.js";

// mot1/mot2 — "erkin yechim" tekshiruvi (mate-solver): Lichess'ning bitta
// kanonik yo'lidan tashqari, belgilangan xod sonida haqiqatan mot beruvchi
// har qanday muqobil yurish ham qabul qilinadi. mot3'da bu qidiruv 3
// chuqurlikda amaliy jihatdan juda sekin (o'nlab soniya) bo'lgani uchun
// faqat kanonik yo'l (checkPuzzleMove) ishlatiladi.
const MATE_SECTIONS = new Set(["mot1", "mot2"]);
const MATE_SECTION_DEPTH: Record<string, number> = { mot1: 1, mot2: 2 };
import { awardXp } from "./xp.js";
import { notifyStudent } from "../notifications/notify.js";

const PUZZLE_SECTIONS = ["mot1", "mot2", "mot3", "mot4", "mot5"] as const;

const createPuzzleSchema = z.object({
  fen: z.string().min(6),
  solution: z.array(z.string().min(4)).min(1),
  difficulty: z.enum(["oson", "orta", "qiyin"]).default("oson"),
  xpReward: z.number().int().positive().default(50),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  groupId: z.string().uuid().optional(),
  section: z.enum(PUZZLE_SECTIONS).default("mot1"),
});

async function getTeacherIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM teachers WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

const attemptSchema = z.object({
  moveIndex: z.number().int().nonnegative().optional(),
  move: z.string().min(4),
  // mot1/mot2 (erkin yechim) uchun — mijoz joriy taxta holatini va qolgan
  // xod sonini kuzatib boradi (o'rganish/pvp-vs-kompyuter'dagi kabi
  // "shaffof ishonch" naqshi — past xavfli mashq, to'liq server-tarafi
  // qayta tekshiruv qurilmagan).
  fen: z.string().optional(),
  movesRemaining: z.number().int().positive().optional(),
});

const awardXpSchema = z.object({
  amount: z.number().int().min(1).max(500),
  note: z.string().max(200).optional(),
});

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function gamificationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // ---- Puzzles ----

  app.get("/puzzles", async (request) => {
    const { section } = request.query as { section?: string };
    const { rows } = await pool.query(
      section
        ? `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, section, rating,
                  (created_by IS NOT NULL) AS "createdByTeacher",
                  (SELECT count(*) FROM puzzle_attempts WHERE puzzle_id = puzzles.id)::int AS "attemptCount"
           FROM puzzles WHERE section = $1 ORDER BY random()`
        : `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, section, rating,
                  (created_by IS NOT NULL) AS "createdByTeacher",
                  (SELECT count(*) FROM puzzle_attempts WHERE puzzle_id = puzzles.id)::int AS "attemptCount"
           FROM puzzles ORDER BY random()`,
      section ? [section] : []
    );
    return rows;
  });

  // Bo'limlar endi yuz minglab-millionlab qatorga ega bo'lishi mumkin
  // (to'liq Lichess mateIn1..5 importi) — shuning uchun butun ro'yxatni
  // yuklash o'rniga har safar FAQAT BITTA tasodifiy masala so'raladi.
  // `excludeId` — ketma-ket ikki marta AYNAN bir xil masala qaytmasligi
  // uchun (juda katta bo'limda amalda deyarli imkonsiz, lekin kichik
  // bo'limlar — masalan mot5 — uchun ham himoya bo'lsin).
  app.get("/puzzles/random", async (request, reply) => {
    const { section, difficulty, excludeId } = request.query as {
      section?: string; difficulty?: string; excludeId?: string;
    };
    if (!section) return reply.code(400).send({ error: "section required" });

    const conditions = ["section = $1"];
    const params: unknown[] = [section];
    if (difficulty && difficulty !== "hammasi") {
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }
    if (excludeId) {
      params.push(excludeId);
      conditions.push(`id != $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, section, rating,
              (created_by IS NOT NULL) AS "createdByTeacher",
              (SELECT count(*) FROM puzzle_attempts WHERE puzzle_id = puzzles.id)::int AS "attemptCount"
       FROM puzzles WHERE ${conditions.join(" AND ")} ORDER BY random() LIMIT 1`,
      params
    );
    if (rows.length === 0) return reply.code(404).send({ error: "No puzzles" });
    return rows[0];
  });

  app.get("/puzzles/section-counts", async () => {
    const { rows } = await pool.query(
      `SELECT section, COUNT(*)::int AS count FROM puzzles GROUP BY section`
    );
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.section] = row.count;
    return counts;
  });

  app.get("/puzzles/:id/hint", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { moveIndex, fen, movesRemaining } = request.query as { moveIndex?: string; fen?: string; movesRemaining?: string };

    const { rows } = await pool.query(`SELECT fen, solution, section FROM puzzles WHERE id = $1`, [id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    const puzzle = rows[0];

    if (MATE_SECTIONS.has(puzzle.section)) {
      const currentFen = fen ?? puzzle.fen;
      const remaining = movesRemaining ? Number(movesRemaining) : MATE_SECTION_DEPTH[puzzle.section];
      const move = findAnyMateMove(currentFen, remaining);
      if (!move) return reply.code(404).send({ error: "No hint" });
      return { from: move.slice(0, 2) };
    }

    const idx = Number(moveIndex ?? 0);
    const move = puzzle.solution[idx];
    if (!move) return reply.code(404).send({ error: "No hint" });
    return { from: move.slice(0, 2) };
  });

  // "Yechimni ko'rish" — saqlangan yechimning TO'LIQ ketma-ketligini
  // ochib beradi. Bu urinish emas, taslim bo'lish — puzzle_attempts'ga
  // yozilmaydi va XP berilmaydi (mavjud "hint" faqat bitta yurishning
  // boshlanish katagini ochadi, bu esa butun yechimni).
  app.get("/puzzles/:id/solution", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(`SELECT fen, solution FROM puzzles WHERE id = $1`, [id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return { fen: rows[0].fen, moves: rows[0].solution as string[] };
  });

  app.get("/puzzles/daily", async () => {
    const { rows } = await pool.query(
      `SELECT id, fen, difficulty, xp_reward AS "xpReward", title
       FROM puzzles ORDER BY md5(id::text || current_date::text) LIMIT 1`
    );
    return rows[0] ?? null;
  });

  app.get("/puzzles/mine", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });
    const { rows } = await pool.query(
      `SELECT id, fen, solution, difficulty, xp_reward AS "xpReward", title, description, section, created_at AS "createdAt"
       FROM puzzles WHERE created_by = $1 ORDER BY created_at DESC`,
      [teacherId]
    );
    return rows;
  });

  app.get("/puzzles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(
      `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, description FROM puzzles WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });
    return rows[0];
  });

  app.get("/puzzles/:id/analytics", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const ownRes = await pool.query(`SELECT id FROM puzzles WHERE id = $1 AND created_by = $2`, [id, teacherId]);
    if (ownRes.rows.length === 0) return reply.code(404).send({ error: "Not found" });

    const statsRes = await pool.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE correct)::int AS correct
       FROM puzzle_attempts WHERE puzzle_id = $1`,
      [id]
    );
    const recentRes = await pool.query(
      `SELECT u.full_name AS "fullName", pa.correct, pa.attempted_at AS "attemptedAt"
       FROM puzzle_attempts pa
       JOIN students s ON s.id = pa.student_id
       JOIN users u ON u.id = s.user_id
       WHERE pa.puzzle_id = $1
       ORDER BY pa.attempted_at DESC LIMIT 20`,
      [id]
    );
    return { ...statsRes.rows[0], attempts: recentRes.rows };
  });

  app.post("/puzzles", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "teacher")] }, async (request, reply) => {
    const body = createPuzzleSchema.parse(request.body);

    // Duplicate FEN check (compare first 4 FEN fields — position, turn, castling, ep)
    const normFen = body.fen.split(" ").slice(0, 4).join(" ");
    const dupCheck = await pool.query(
      `SELECT id FROM puzzles
       WHERE (split_part(fen,' ',1)||' '||split_part(fen,' ',2)||' '||split_part(fen,' ',3)||' '||split_part(fen,' ',4)) = $1
       LIMIT 1`,
      [normFen]
    );
    if (dupCheck.rows.length > 0) return reply.code(409).send({ error: "duplicate_fen" });

    let createdBy: string | null = null;
    if (request.user.role === "teacher") {
      createdBy = await getTeacherIdForUser(request.user.sub);
    }
    const { rows } = await pool.query(
      `INSERT INTO puzzles (fen, solution, difficulty, xp_reward, title, description, section, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [body.fen, body.solution, body.difficulty, body.xpReward, body.title ?? null, body.description ?? null, body.section, createdBy]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.delete("/puzzles/:id", { onRequest: [app.requireRole("teacher")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const teacherId = await getTeacherIdForUser(request.user.sub);
    if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

    const result = await pool.query(`DELETE FROM puzzles WHERE id = $1 AND created_by = $2`, [id, teacherId]);
    if (result.rowCount === 0) return reply.code(404).send({ error: "Not found" });
    return reply.code(204).send();
  });

  app.post("/puzzles/:id/attempt", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = attemptSchema.parse(request.body);

    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const puzzleRes = await pool.query(
      `SELECT fen, solution, xp_reward AS "xpReward", section FROM puzzles WHERE id = $1`,
      [id]
    );
    if (puzzleRes.rows.length === 0) return reply.code(404).send({ error: "Puzzle not found" });
    const puzzle = puzzleRes.rows[0];

    const isMate = MATE_SECTIONS.has(puzzle.section);
    let result: { correct: boolean; finished: boolean; fenAfter: string };
    let movesRemainingAfter: number | undefined;

    if (isMate) {
      const currentFen = body.fen ?? puzzle.fen;
      const movesRemaining = body.movesRemaining ?? MATE_SECTION_DEPTH[puzzle.section];
      result = validateAndApplyMateStep(currentFen, body.move, movesRemaining);
      if (result.correct && !result.finished) movesRemainingAfter = movesRemaining - 1;
    } else {
      result = checkPuzzleMove(puzzle.fen, puzzle.solution, body.moveIndex ?? 0, body.move);
    }

    if (!result.correct) {
      await pool.query(
        `INSERT INTO puzzle_attempts (student_id, puzzle_id, correct) VALUES ($1, $2, false)`,
        [studentId, id]
      );
      return { correct: false, finished: false, fenAfter: result.fenAfter };
    }

    if (!result.finished) {
      return { correct: true, finished: false, fenAfter: result.fenAfter, movesRemaining: movesRemainingAfter };
    }

    // Bu masalani ilgari to'g'ri yechgan bo'lsa — qayta XP berilmaydi
    // (masalar random tartibda takrorlanishi mumkin, lekin XP faqat
    // birinchi marta yechilganda beriladi).
    const priorSolveRes = await pool.query(
      `SELECT 1 FROM puzzle_attempts WHERE student_id = $1 AND puzzle_id = $2 AND correct = true LIMIT 1`,
      [studentId, id]
    );
    const alreadySolved = priorSolveRes.rows.length > 0;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO puzzle_attempts (student_id, puzzle_id, correct) VALUES ($1, $2, true)`,
        [studentId, id]
      );
      const xpResult = alreadySolved ? null : await awardXp(client, studentId, puzzle.xpReward);
      await client.query("COMMIT");

      return {
        correct: true,
        finished: true,
        fenAfter: result.fenAfter,
        xpAwarded: alreadySolved ? 0 : puzzle.xpReward,
        ...xpResult,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ---- O'qituvchi tomonidan qo'lda XP berish (masalan jonli dars davomida) ----

  app.post(
    "/teacher/students/:studentId/xp",
    { onRequest: [app.requireRole("teacher")] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const body = awardXpSchema.parse(request.body);
      const teacherId = await getTeacherIdForUser(request.user.sub);
      if (!teacherId) return reply.code(404).send({ error: "Teacher not found" });

      const ownRes = await pool.query(
        `SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
         WHERE gm.student_id = $1 AND g.teacher_id = $2 LIMIT 1`,
        [studentId, teacherId]
      );
      if (ownRes.rows.length === 0) return reply.code(403).send({ error: "Forbidden" });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await awardXp(client, studentId, body.amount);
        await notifyStudent(
          client,
          studentId,
          `O'qituvchingiz sizga ${body.amount} XP berdi${body.note ? `: ${body.note}` : ""}`,
          { title: "XP olindi!", type: "xp_earned", icon: "zap" }
        );
        await client.query("COMMIT");
        return { ...result, xpAwarded: body.amount };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // ---- Student XP / achievements ----

  app.get("/me/xp", { onRequest: [app.requireRole("student")] }, async (request) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return { xp: 0, level: 1, streak: 0, elo: 1200, achievements: [] };

    const xpRes = await pool.query(
      `SELECT xp, level, streak, elo FROM student_xp WHERE student_id = $1`,
      [studentId]
    );
    const xp = xpRes.rows[0] ?? { xp: 0, level: 1, streak: 0, elo: 1200 };

    const achRes = await pool.query(
      `SELECT a.code, a.name, a.description, a.icon, a.xp_threshold AS "xpThreshold",
              a.streak_threshold AS "streakThreshold",
              (sa.student_id IS NOT NULL) AS earned
       FROM achievements a
       LEFT JOIN student_achievements sa ON sa.achievement_id = a.id AND sa.student_id = $1
       ORDER BY a.code`,
      [studentId]
    );

    const correctRes = await pool.query(
      `SELECT count(*)::int AS cnt FROM puzzle_attempts WHERE student_id = $1 AND correct = true`,
      [studentId]
    );
    const correctAttempts = correctRes.rows[0].cnt as number;

    const achievements = achRes.rows.map((a) => {
      let current = 0;
      let threshold = 1;
      if (a.code === "first_solve") {
        current = correctAttempts;
        threshold = 1;
      } else if (a.xpThreshold !== null) {
        current = xp.xp;
        threshold = a.xpThreshold;
      } else if (a.streakThreshold !== null) {
        current = xp.streak;
        threshold = a.streakThreshold;
      }
      return {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        earned: a.earned,
        progress: { current: Math.min(current, threshold), threshold },
      };
    });

    return { ...xp, achievements };
  });

  // ---- Kunlik streak bonusi (12 kunlik tsikl) ----
  function streakCycleState(total: number, lastClaimDate: string | null, today: string) {
    const claimedToday = lastClaimDate === today;
    const claimedCount = claimedToday ? (total % 12 === 0 ? 12 : total % 12) : total % 12;
    const currentDay = claimedToday ? claimedCount : claimedCount + 1;
    const claimedDays = Array.from({ length: 12 }, (_, i) => i + 1).filter((d) => d <= claimedCount);
    return { claimedToday, currentDay, claimedDays };
  }
  function xpForCycleDay(day: number) {
    return day === 12 ? 60 : day * 5;
  }

  app.get("/me/streak", { onRequest: [app.requireRole("student")] }, async (request) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return { streak: 0, currentDay: 1, claimedToday: false, claimedDays: [] };

    const { rows } = await pool.query(
      `SELECT streak, total_streak_claims AS "total", last_streak_claim_date AS "lastClaimDate"
       FROM student_xp WHERE student_id = $1`,
      [studentId]
    );
    const row = rows[0] ?? { streak: 0, total: 0, lastClaimDate: null };
    const today = new Date().toISOString().slice(0, 10);
    const state = streakCycleState(row.total, row.lastClaimDate, today);
    return { streak: row.streak, ...state };
  });

  app.post("/me/streak/claim", { onRequest: [app.requireRole("student")] }, async (request, reply) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return reply.code(404).send({ error: "Student not found" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO student_xp (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING`,
        [studentId]
      );
      const { rows } = await client.query(
        `SELECT total_streak_claims AS "total", last_streak_claim_date AS "lastClaimDate"
         FROM student_xp WHERE student_id = $1 FOR UPDATE`,
        [studentId]
      );
      const today = new Date().toISOString().slice(0, 10);
      const { claimedToday, currentDay } = streakCycleState(rows[0].total, rows[0].lastClaimDate, today);
      if (claimedToday) {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "already_claimed", message: "Bugungi mukofot allaqachon olingan" });
      }

      const xpAmount = xpForCycleDay(currentDay);
      const result = await awardXp(client, studentId, xpAmount);
      await client.query(
        `UPDATE student_xp SET total_streak_claims = total_streak_claims + 1, last_streak_claim_date = $2 WHERE student_id = $1`,
        [studentId, today]
      );
      await client.query("COMMIT");
      return { cycleDay: currentDay, xpAwarded: xpAmount, ...result };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.get("/me/puzzle-stats", { onRequest: [app.requireRole("student")] }, async (request) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return { correct: 0, incorrect: 0, accuracyPct: 0, byDifficulty: [] };

    const totalsRes = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE correct)::int AS correct, COUNT(*) FILTER (WHERE NOT correct)::int AS incorrect
       FROM puzzle_attempts WHERE student_id = $1`,
      [studentId]
    );
    const { correct, incorrect } = totalsRes.rows[0] as { correct: number; incorrect: number };
    const total = correct + incorrect;
    const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;

    const byDiffRes = await pool.query(
      `SELECT p.difficulty, COUNT(*) FILTER (WHERE pa.correct)::int AS correct, COUNT(*)::int AS total
       FROM puzzle_attempts pa
       JOIN puzzles p ON p.id = pa.puzzle_id
       WHERE pa.student_id = $1
       GROUP BY p.difficulty`,
      [studentId]
    );

    return { correct, incorrect, accuracyPct, byDifficulty: byDiffRes.rows };
  });

  // ---- ELO history ----

  app.get("/me/elo-history", { onRequest: [app.requireRole("student")] }, async (request) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return [];

    const { rows } = await pool.query(
      `SELECT elo, recorded_at AS "recordedAt"
       FROM elo_history
       WHERE student_id = $1
       ORDER BY recorded_at ASC
       LIMIT 50`,
      [studentId]
    );
    return rows;
  });

  // ---- Game stats ----

  app.get("/me/game-stats", { onRequest: [app.requireRole("student")] }, async (request) => {
    const studentId = await getStudentIdForUser(request.user.sub);
    if (!studentId) return { wins: 0, draws: 0, losses: 0, total: 0, recent: [] };

    const totalsRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'win')::int AS wins,
         COUNT(*) FILTER (WHERE result = 'draw')::int AS draws,
         COUNT(*) FILTER (WHERE result = 'loss')::int AS losses,
         COUNT(*)::int AS total
       FROM game_results WHERE student_id = $1`,
      [studentId]
    );
    const totals = totalsRes.rows[0];

    const recentRes = await pool.query(
      `SELECT opponent_name AS "opponentName", result, elo_change AS "eloChange", played_at AS "playedAt"
       FROM game_results WHERE student_id = $1
       ORDER BY played_at DESC LIMIT 10`,
      [studentId]
    );

    return { ...totals, recent: recentRes.rows };
  });

  // ---- Leaderboard ----

  app.get("/leaderboard", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT u.id AS "userId", u.full_name AS "fullName", sx.xp, sx.level, sx.streak, sx.elo,
              COALESCE(gr.wins, 0) AS wins
       FROM student_xp sx
       JOIN students s ON s.id = sx.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN (
         SELECT student_id, COUNT(*) FILTER (WHERE result = 'win')::int AS wins
         FROM game_results
         GROUP BY student_id
       ) gr ON gr.student_id = s.id
       WHERE s.tenant_id = $1
       ORDER BY sx.xp DESC
       LIMIT 50`,
      [tenantId]
    );
    return rows;
  });
}
