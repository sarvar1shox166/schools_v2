import type { Pool, PoolClient } from "pg";

// Ba'zi chaqiruvchilar tranzaksiya ichida (PoolClient), ba'zilari esa
// to'g'ridan-to'g'ri pool orqali (Pool) ishlaydi — ikkalasi ham bir xil
// `query()` imzosiga ega, shuning uchun bu yerda umumiy tur ishlatiladi.
type Queryable = Pool | PoolClient;

export interface AchievementUnlock { code: string; name: string; description: string; icon: string }

export interface XpResult {
  xp: number;
  level: number;
  streak: number;
  newAchievements: AchievementUnlock[];
}

export async function awardXp(client: Queryable, studentId: string, amount: number): Promise<XpResult> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Atomic upsert avoids read-modify-write race when two concurrent calls
  // both see no existing row and race to insert for the first time.
  // xp/level are INTEGER columns and $2 is always a whole number — plain
  // integer division (which truncates toward zero, equivalent to floor()
  // for non-negative values) avoids re-casting $2 to numeric elsewhere in
  // the same statement, which Postgres rejects as an inconsistent param type.
  const res = await client.query(
    `INSERT INTO student_xp (student_id, xp, level, streak, last_active_date)
     VALUES ($1, $2, ($2 / 200) + 1, 1, $3)
     ON CONFLICT (student_id) DO UPDATE SET
       xp   = student_xp.xp + $2,
       level = ((student_xp.xp + $2) / 200) + 1,
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
  const newAchievements = await checkAchievements(client, studentId);
  return { xp, level, streak, newAchievements };
}

/** Har bir yutuq mezoni turli hodisalarda o'zgaradi (XP berilganda, PvP
 *  o'yini tugaganda, davomat belgilanganda), shuning uchun bu funksiya shu
 *  uchala joydan ham chaqiriladi — hali qo'lga kiritilmagan yutuqlarning
 *  joriy holatini tekshirib, mos kelganlarini student_achievements'ga
 *  yozadi. */
export async function checkAchievements(client: Queryable, studentId: string): Promise<AchievementUnlock[]> {
  const { rows: pending } = await client.query(
    `SELECT a.id, a.code, a.name, a.description, a.icon
     FROM achievements a
     WHERE a.id NOT IN (SELECT achievement_id FROM student_achievements WHERE student_id = $1)`,
    [studentId]
  );
  if (pending.length === 0) return [];

  const { rows } = await client.query(
    `SELECT
       COALESCE(sx.xp, 0) AS xp,
       COALESCE(sx.attendance_streak, 0) AS "attendanceStreak",
       (SELECT count(*)::int FROM game_results WHERE student_id = $1) AS "gamesPlayed",
       (SELECT count(DISTINCT puzzle_id)::int FROM puzzle_attempts WHERE student_id = $1 AND correct) AS "puzzlesSolved",
       COALESCE(sx.elo, 1200) >= (
         SELECT COALESCE(MAX(sx2.elo), 0) FROM student_xp sx2
         JOIN students s2 ON s2.id = sx2.student_id
         WHERE s2.tenant_id = s.tenant_id
       ) AS "isRankOne"
     FROM students s
     LEFT JOIN student_xp sx ON sx.student_id = s.id
     WHERE s.id = $1`,
    [studentId]
  );
  const stats = rows[0] as {
    xp: number; attendanceStreak: number; gamesPlayed: number; puzzlesSolved: number; isRankOne: boolean;
  } | undefined;
  if (!stats) return [];

  const earned: AchievementUnlock[] = [];
  for (const a of pending) {
    let qualifies = false;
    switch (a.code) {
      case "games_100": qualifies = stats.gamesPlayed >= 100; break;
      case "xp_5000": qualifies = stats.xp >= 5000; break;
      case "puzzles_1000": qualifies = stats.puzzlesSolved >= 1000; break;
      case "rank_1": qualifies = stats.isRankOne; break;
      case "attendance_streak_7": qualifies = stats.attendanceStreak >= 7; break;
    }
    if (qualifies) {
      await client.query(
        `INSERT INTO student_achievements (student_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [studentId, a.id]
      );
      earned.push({ code: a.code, name: a.name, description: a.description, icon: a.icon });
    }
  }
  return earned;
}

/** Dars kuni davomat "keldi"/"kechikdi" deb belgilanganda ketma-ket kunlar
 *  streak'ini yangilaydi — sana taqqoslash DARS sanasi bo'yicha (belgilash
 *  vaqti emas), awardXp'dagi kunlik streak bilan bir xil naqsh. Faqat
 *  haqiqatan qatnashgan holatlar ('p'/'l') hisobga olinadi — 'a' (kelmadi)
 *  va 'ae' (sababli) streakni davom ettirmaydi. */
export async function bumpAttendanceStreak(
  client: Queryable, studentId: string, lessonDate: string, status: string
): Promise<void> {
  if (status !== "p" && status !== "l") return;
  await client.query(
    `INSERT INTO student_xp (student_id, attendance_streak, last_attendance_date)
     VALUES ($1, 1, $2::date)
     ON CONFLICT (student_id) DO UPDATE SET
       attendance_streak = CASE
                              WHEN student_xp.last_attendance_date = $2::date THEN student_xp.attendance_streak
                              WHEN student_xp.last_attendance_date = $2::date - 1 THEN student_xp.attendance_streak + 1
                              ELSE 1
                            END,
       last_attendance_date = $2::date`,
    [studentId, lessonDate]
  );
}
