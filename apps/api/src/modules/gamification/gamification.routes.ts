import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkPuzzleMove } from "@chess-school/chess-engine";
import { pool } from "../../db/pool.js";
import { awardXp } from "./xp.js";

const PUZZLE_SECTIONS = ["mot1", "mot2", "mot3", "series", "time"] as const;

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
  moveIndex: z.number().int().nonnegative(),
  move: z.string().min(4),
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
        ? `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, section, (created_by IS NOT NULL) AS "createdByTeacher"
           FROM puzzles WHERE section = $1 ORDER BY created_at`
        : `SELECT id, fen, difficulty, xp_reward AS "xpReward", title, section, (created_by IS NOT NULL) AS "createdByTeacher"
           FROM puzzles ORDER BY created_at`,
      section ? [section] : []
    );
    return rows;
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
    const { moveIndex } = request.query as { moveIndex?: string };
    const idx = Number(moveIndex ?? 0);

    const { rows } = await pool.query(`SELECT solution FROM puzzles WHERE id = $1`, [id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Not found" });

    const move = rows[0].solution[idx];
    if (!move) return reply.code(404).send({ error: "No hint" });
    return { from: move.slice(0, 2) };
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

  app.post("/puzzles", { onRequest: [app.requireRole("super_admin", "admin", "teacher")] }, async (request, reply) => {
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
      `SELECT fen, solution, xp_reward AS "xpReward" FROM puzzles WHERE id = $1`,
      [id]
    );
    if (puzzleRes.rows.length === 0) return reply.code(404).send({ error: "Puzzle not found" });
    const puzzle = puzzleRes.rows[0];

    const result = checkPuzzleMove(puzzle.fen, puzzle.solution, body.moveIndex, body.move);

    if (!result.correct) {
      await pool.query(
        `INSERT INTO puzzle_attempts (student_id, puzzle_id, correct) VALUES ($1, $2, false)`,
        [studentId, id]
      );
      return { correct: false, finished: false, fenAfter: result.fenAfter };
    }

    if (!result.finished) {
      return { correct: true, finished: false, fenAfter: result.fenAfter };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO puzzle_attempts (student_id, puzzle_id, correct) VALUES ($1, $2, true)`,
        [studentId, id]
      );
      const xpResult = await awardXp(client, studentId, puzzle.xpReward);
      await client.query("COMMIT");

      return {
        correct: true,
        finished: true,
        fenAfter: result.fenAfter,
        xpAwarded: puzzle.xpReward,
        ...xpResult,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

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
      `SELECT u.full_name AS "fullName", sx.xp, sx.level, sx.streak, sx.elo
       FROM student_xp sx
       JOIN students s ON s.id = sx.student_id
       JOIN users u ON u.id = s.user_id
       WHERE s.tenant_id = $1
       ORDER BY sx.xp DESC
       LIMIT 50`,
      [tenantId]
    );
    return rows;
  });
}
