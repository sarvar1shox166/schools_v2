import type { PoolClient } from "pg";

export interface XpResult {
  xp: number;
  level: number;
  streak: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
}


export async function awardXp(client: PoolClient, studentId: string, amount: number): Promise<XpResult> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Atomic upsert avoids read-modify-write race when two concurrent calls
  // both see no existing row and race to insert for the first time.
  const res = await client.query(
    `INSERT INTO student_xp (student_id, xp, level, streak, last_active_date)
     VALUES ($1, $2, floor($2::numeric / 200) + 1, 1, $3)
     ON CONFLICT (student_id) DO UPDATE SET
       xp   = student_xp.xp + $2,
       level = floor((student_xp.xp + $2) / 200) + 1,
       streak = CASE
                  WHEN student_xp.last_active_date = $3 THEN student_xp.streak
                  WHEN student_xp.last_active_date = $4 THEN student_xp.streak + 1
                  ELSE 1
                END,
       last_active_date = $3
     RETURNING xp, level, streak`,
    [studentId, amount, today, yesterday]
  );

  const { xp, level, streak } = res.rows[0] as { xp: number; level: number; streak: number };
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
