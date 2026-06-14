import type { PoolClient } from "pg";

export interface XpResult {
  xp: number;
  level: number;
  streak: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
}

function levelForXp(xp: number) {
  return Math.floor(xp / 200) + 1;
}

export async function awardXp(client: PoolClient, studentId: string, amount: number): Promise<XpResult> {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await client.query(
    `SELECT xp, streak, last_active_date::text AS last_active_date FROM student_xp WHERE student_id = $1 FOR UPDATE`,
    [studentId]
  );

  let xp = 0;
  let streak = 0;
  let lastActive: string | null = null;
  if (existing.rows.length > 0) {
    xp = existing.rows[0].xp;
    streak = existing.rows[0].streak;
    lastActive = existing.rows[0].last_active_date
      ? String(existing.rows[0].last_active_date).slice(0, 10)
      : null;
  }

  if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = lastActive === yesterday ? streak + 1 : 1;
  }

  xp += amount;
  const level = levelForXp(xp);

  await client.query(
    `INSERT INTO student_xp (student_id, xp, level, streak, last_active_date)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id) DO UPDATE SET xp = $2, level = $3, streak = $4, last_active_date = $5`,
    [studentId, xp, level, streak, today]
  );

  const newAchievements = await checkAchievements(client, studentId, xp, streak);

  return { xp, level, streak, newAchievements };
}

async function checkAchievements(client: PoolClient, studentId: string, xp: number, streak: number) {
  const { rows: achievements } = await client.query(
    `SELECT a.id, a.code, a.name, a.description, a.icon, a.xp_threshold, a.streak_threshold
     FROM achievements a
     WHERE a.id NOT IN (SELECT achievement_id FROM student_achievements WHERE student_id = $1)`,
    [studentId]
  );

  const attemptCountRes = await client.query(
    `SELECT count(*)::int AS cnt FROM puzzle_attempts WHERE student_id = $1 AND correct = true`,
    [studentId]
  );
  const correctAttempts = attemptCountRes.rows[0].cnt as number;

  const earned: { code: string; name: string; description: string; icon: string }[] = [];
  for (const a of achievements) {
    let qualifies = false;
    if (a.code === "first_solve") qualifies = correctAttempts >= 1;
    else if (a.xp_threshold !== null) qualifies = xp >= a.xp_threshold;
    else if (a.streak_threshold !== null) qualifies = streak >= a.streak_threshold;

    if (qualifies) {
      await client.query(
        `INSERT INTO student_achievements (student_id, achievement_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [studentId, a.id]
      );
      earned.push({ code: a.code, name: a.name, description: a.description, icon: a.icon });
    }
  }

  return earned;
}
