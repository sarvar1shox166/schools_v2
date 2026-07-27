import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { awardXp } from "../gamification/xp.js";
import { buildFenPlacement, type SimplePiece } from "@chess-school/chess-engine";
import { generateLevel } from "./generator.js";

const completeSchema = z.object({
  mistakes: z.number().int().min(0),
});

async function getStudentIdForUser(userId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [userId]);
  return rows[0]?.id ?? null;
}

function starsForMistakes(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

const HINT_INSTRUCTIONS = ["Ko'rsatilgan katakka yuring!"];
const NO_HINT_INSTRUCTIONS = [
  "Barcha donalarni urib oling!",
  "Nishonlarni ketma-ket uring!",
  "Diqqat bilan yo'l toping — ba'zi yo'nalishlar band!",
  "Qaysi yo'nalish ochiq ekanini payqang!",
];

function pickInstruction(levelNumber: number, hasHint: boolean): string {
  const pool = hasHint ? HINT_INSTRUCTIONS : NO_HINT_INSTRUCTIONS;
  return pool[levelNumber % pool.length];
}

export async function learnRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/learn/topics", async (request) => {
    const { category } = request.query as { category?: string };
    const { role, sub } = request.user;
    const studentId = role === "student" ? await getStudentIdForUser(sub) : null;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: topics } = await pool.query(
      `SELECT id, category, piece_type AS "pieceType", key, title, subtitle, icon, description,
              xp_reward AS "xpReward", sort_order AS "sortOrder"
       FROM learn_topics ${where} ORDER BY category, sort_order`,
      params
    );

    if (!studentId) return topics.map((t) => ({ ...t, bestLevel: 0, totalLevels: null }));

    const topicIds = topics.map((t) => t.id);
    if (topicIds.length === 0) return topics;

    const { rows: progressRows } = await pool.query(
      `SELECT topic_id AS "topicId", MAX(level_number)::int AS "bestLevel"
       FROM learn_progress WHERE student_id = $1 AND topic_id = ANY($2::uuid[])
       GROUP BY topic_id`,
      [studentId, topicIds]
    );
    const { rows: levelCounts } = await pool.query(
      `SELECT topic_id AS "topicId", count(*)::int AS "totalLevels"
       FROM learn_levels WHERE topic_id = ANY($1::uuid[]) GROUP BY topic_id`,
      [topicIds]
    );
    const bestByTopic = new Map(progressRows.map((r) => [r.topicId, r.bestLevel]));
    const countByTopic = new Map(levelCounts.map((r) => [r.topicId, r.totalLevels]));

    return topics.map((t) => ({
      ...t,
      bestLevel: bestByTopic.get(t.id) ?? 0,
      totalLevels: countByTopic.get(t.id) ?? 0,
    }));
  });

  app.get("/learn/topics/:topicId", async (request, reply) => {
    const { topicId } = request.params as { topicId: string };
    const { role, sub } = request.user;

    const topicRes = await pool.query(
      `SELECT id, category, piece_type AS "pieceType", key, title, subtitle, icon, description,
              xp_reward AS "xpReward"
       FROM learn_topics WHERE id = $1`,
      [topicId]
    );
    const topic = topicRes.rows[0];
    if (!topic) return reply.code(404).send({ error: "Mavzu topilmadi" });

    const { rows: levels } = await pool.query(
      `SELECT level_number AS "levelNumber" FROM learn_levels WHERE topic_id = $1 ORDER BY level_number`,
      [topicId]
    );

    let progressByLevel = new Map<number, { stars: number; mistakes: number }>();
    if (role === "student") {
      const studentId = await getStudentIdForUser(sub);
      if (studentId) {
        const { rows } = await pool.query(
          `SELECT level_number AS "levelNumber", stars, mistakes
           FROM learn_progress WHERE student_id = $1 AND topic_id = $2`,
          [studentId, topicId]
        );
        progressByLevel = new Map(rows.map((r) => [r.levelNumber, { stars: r.stars, mistakes: r.mistakes }]));
      }
    }

    return {
      ...topic,
      levels: levels.map((l, idx) => {
        const done = progressByLevel.get(l.levelNumber);
        const prevDone = idx === 0 || progressByLevel.has(levels[idx - 1].levelNumber);
        return {
          levelNumber: l.levelNumber,
          stars: done?.stars ?? null,
          locked: role === "student" ? !prevDone : false,
        };
      }),
    };
  });

  app.get("/learn/topics/:topicId/levels/:levelNumber/play", async (request, reply) => {
    const { topicId, levelNumber } = request.params as { topicId: string; levelNumber: string };

    const topicRes = await pool.query(`SELECT key, category FROM learn_topics WHERE id = $1`, [topicId]);
    const topic = topicRes.rows[0];
    if (!topic) return reply.code(404).send({ error: "Mavzu topilmadi" });

    const levelRes = await pool.query(
      `SELECT config FROM learn_levels WHERE topic_id = $1 AND level_number = $2`,
      [topicId, Number(levelNumber)]
    );
    const level = levelRes.rows[0];
    if (!level) return reply.code(404).send({ error: "Bosqich topilmadi" });

    const config = level.config as Record<string, unknown>;

    if (config.mode === "generated") {
      const pieceType = config.pieceType as SimplePiece;
      const generated = generateLevel(
        pieceType,
        config.targetCount as number,
        config.obstacleCount as number,
        config.showHint as boolean,
        (config.minSpread as number) ?? 1,
        (config.cluttered as boolean) ?? false
      );
      const pieces = [
        { square: generated.from, piece: pieceType.toUpperCase() },
        ...generated.path.map((sq) => ({ square: sq, piece: "p" })),
        ...generated.obstacles.map((sq) => ({ square: sq, piece: "p" })),
      ];
      return {
        mode: "generated",
        pieceType,
        fen: buildFenPlacement(pieces),
        from: generated.from,
        targets: generated.path,
        hintSquare: generated.hintSquare,
        instruction: pickInstruction(Number(levelNumber), !!generated.hintSquare),
      };
    }

    // fixed
    const pieceType = (config.pieceType as string).toUpperCase();
    const enemies = config.enemies as { square: string; piece: string }[];
    const pieces = [
      { square: config.from as string, piece: pieceType },
      ...enemies,
    ];
    return {
      mode: "fixed",
      pieceType: (config.pieceType as string).toLowerCase(),
      fen: buildFenPlacement(pieces),
      from: config.from,
      to: config.to,
      targets: [config.to],
      hintSquare: null,
      instruction: config.instruction,
      specialMove: config.specialMove ?? null,
    };
  });

  app.post(
    "/learn/topics/:topicId/levels/:levelNumber/complete",
    { onRequest: [app.requireRole("student")] },
    async (request, reply) => {
      const { topicId, levelNumber } = request.params as { topicId: string; levelNumber: string };
      const body = completeSchema.parse(request.body);
      const studentId = await getStudentIdForUser(request.user.sub);
      if (!studentId) return reply.code(404).send({ error: "O'quvchi topilmadi" });

      const topicRes = await pool.query(`SELECT xp_reward AS "xpReward" FROM learn_topics WHERE id = $1`, [topicId]);
      const topic = topicRes.rows[0];
      if (!topic) return reply.code(404).send({ error: "Mavzu topilmadi" });

      const levelExists = await pool.query(
        `SELECT 1 FROM learn_levels WHERE topic_id = $1 AND level_number = $2`,
        [topicId, Number(levelNumber)]
      );
      if (!levelExists.rows[0]) return reply.code(404).send({ error: "Bosqich topilmadi" });

      const stars = starsForMistakes(body.mistakes);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`,
          [`learn-level:${studentId}:${topicId}:${levelNumber}`]
        );

        const already = await client.query(
          `SELECT stars FROM learn_progress WHERE student_id = $1 AND topic_id = $2 AND level_number = $3`,
          [studentId, topicId, Number(levelNumber)]
        );
        const wasCompleted = already.rows.length > 0;
        const bestStars = wasCompleted ? Math.max(already.rows[0].stars, stars) : stars;

        await client.query(
          `INSERT INTO learn_progress (student_id, topic_id, level_number, stars, mistakes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (student_id, topic_id, level_number)
           DO UPDATE SET stars = $4, mistakes = $5, completed_at = now()`,
          [studentId, topicId, Number(levelNumber), bestStars, body.mistakes]
        );

        let xpResult: Awaited<ReturnType<typeof awardXp>> | undefined;
        let xpAwarded: number | undefined;
        if (!wasCompleted && topic.xpReward > 0) {
          xpResult = await awardXp(client, studentId, topic.xpReward);
          xpAwarded = topic.xpReward;
        }

        await client.query("COMMIT");
        return { stars: bestStars, xpAwarded, ...xpResult };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  );
}
