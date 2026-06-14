import { useNavigate } from "react-router-dom";
import { Card, CardHead, Icon, PageHead, StatCard } from "@chess-school/ui";
import { ChessBoard } from "../../components/ChessBoard.js";
import { useAuthStore } from "../../lib/auth-store.js";
import { useAttendanceHistory, useDailyPuzzle, useMyXp, useNextLesson } from "../../lib/queries.js";

const LEVEL_NAMES = ["Yangi boshlovchi", "Boshlang'ich", "O'rta", "Ilg'or", "Usta"];

function xpForLevel(level: number) {
  return level * 200;
}

/** Hozirgi LIVE darsni aniqlash: nextLesson bugungi kun va hozirgi vaqt orasida bo'lishi kerak. */
function isLessonLiveNow(startTime: string, durationMin = 60): boolean {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  return now >= start && now <= end;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: xpData } = useMyXp();
  const { data: dailyPuzzle } = useDailyPuzzle();
  const { data: nextLesson } = useNextLesson();
  const { data: attendance } = useAttendanceHistory();

  const elo = xpData?.elo ?? 1200;
  const streak = xpData?.streak ?? 0;
  const level = xpData?.level ?? 1;
  const xp = xpData?.xp ?? 0;
  const levelFloor = (level - 1) * 200;
  const levelCeil = xpForLevel(level);
  const levelPct = Math.max(0, Math.min(100, Math.round(((xp - levelFloor) / (levelCeil - levelFloor)) * 100)));
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? LEVEL_NAMES[0];

  const solvedCount = xpData?.achievements.find((a) => a.code === "puzzles_solved")?.progress.current
    ?? xpData?.achievements.reduce((max, a) => Math.max(max, a.progress.current), 0)
    ?? 0;

  const attendancePercent = attendance?.percent ?? 0;

  const earnedAchievements = (xpData?.achievements ?? []).filter((a) => a.earned);

  const liveNow = nextLesson && isLessonLiveNow(nextLesson.startTime);

  const ACHIEVEMENT_ANIMS = ["starPop .4s both", "bounce 2s infinite", "pulse 2s infinite", "wobble 2s infinite"];

  return (
    <div>
      <PageHead title="Mening sahifam" />

      {/* HERO */}
      <div className="kids-hero" style={{ marginBottom: "var(--gap)" }}>
        <div className="kids-hero-content">
          <h1>
            Salom, {user?.fullName?.split(" ")[0] ?? "do'stim"}! 👋
            <br />
            Bugun shaxmat o'rganamizmi? 🏆
          </h1>
          <p>
            Shaxmat Online maktabida <b>{streak} kunlik streak!</b> ♟ Davom ettir!
          </p>
          <div className="hrow">
            <div className="hri">
              <div className="v">{elo}</div>
              <div className="l">ELO</div>
            </div>
            <div className="hri">
              <div className="v">{solvedCount}</div>
              <div className="l">Masala</div>
            </div>
            <div className="hri">
              <div className="v">{attendancePercent}%</div>
              <div className="l">Davomat</div>
            </div>
            <div className="hri">
              <div className="v">🔥{streak}</div>
              <div className="l">Streak</div>
            </div>
          </div>
          <div className="hbtns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn bw" onClick={() => navigate("/student/pvp")}>♟ O'ynash</button>
            <button className="btn bt" onClick={() => navigate("/student/videos")}>🎬 Video dars</button>
            <button className="btn bt" onClick={() => navigate("/student/puzzles")}>🧩 Masala</button>
          </div>
        </div>
      </div>

      {/* 4-STAT GRID */}
      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="trendingUp" tone="a" value={String(elo)} label="ELO Reyting" />
        <StatCard icon="flag" tone="w" value={String(streak)} label="Kun streak" />
        <StatCard icon="target" tone="s" value={String(solvedCount)} label="Masalalar" />
        <StatCard icon="award" tone="i" value={`${level}-daraja`} label={levelName} />
      </div>

      <div className="grid l-2-1" style={{ marginBottom: "var(--gap)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {/* LIVE card */}
          {liveNow && nextLesson && (
            <Card style={{ borderColor: "rgba(239,68,68,.25)" }}>
              <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(90deg, rgba(239,68,68,.12), transparent)" }}>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="rgba(239,68,68,.15)" stroke="rgba(239,68,68,.4)" strokeWidth="1.5" />
                  <circle cx="20" cy="20" r="6" fill="#ef4444">
                    <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span className="badge dang" style={{ fontSize: 11 }}>🔴 LIVE hozir</span>
                    <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{nextLesson.startTime.slice(0, 5)}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{nextLesson.groupName}</div>
                  {nextLesson.teacherName && (
                    <div style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 3 }}>{nextLesson.teacherName}</div>
                  )}
                </div>
                {nextLesson.meetingUrl && (
                  <a className="btn primary" href={nextLesson.meetingUrl} target="_blank" rel="noreferrer">
                    Kirish →
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* Topic progress moved below for desktop layout balance handled via right col on small screens */}
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {/* Daily puzzle */}
          {dailyPuzzle && (
            <Card>
              <CardHead
                icon="puzzle"
                title="Kunlik masala"
                sub="Oq o'ynaydi va g'alaba qozonadi"
                right={<span className="badge warn">+{dailyPuzzle.xpReward} XP</span>}
              />
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ margin: "0 auto 12px", maxWidth: 200 }}>
                  <ChessBoard fen={dailyPuzzle.fen} onMove={() => {}} disabled />
                </div>
                <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(`/student/puzzles?id=${dailyPuzzle.id}`)}>
                  Masalani yechish ♟
                </button>
              </div>
            </Card>
          )}

          {/* Topic progress — statik: puzzle_attempts kategoriya bo'yicha guruhlanmagani uchun
              real per-topic progress hozircha mavjud emas. UI-parity uchun statik foizlar ko'rsatiladi. */}
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 12 }}>📊 Mavzular bo'yicha taraqqiyot</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "♟ Debyut", pct: 72 },
                  { label: "⚔️ Taktika", pct: 55 },
                  { label: "♔ Endshpil", pct: 38 },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                      <span style={{ color: "var(--text-faint)" }}>{row.label}</span>
                      <b>{row.pct}%</b>
                    </div>
                    <div className="pbar"><span style={{ width: `${row.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Level progress */}
      <Card style={{ marginBottom: "var(--gap)" }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span>🏆 {level}-daraja — {levelName}</span>
            <b>{levelPct}% → keyingi</b>
          </div>
          <div className="pbar"><span style={{ width: `${levelPct}%` }} /></div>
        </div>
      </Card>

      {/* Recent achievements */}
      <Card>
        <CardHead
          icon="award"
          title="So'nggi yutuqlar"
          right={<button className="btn sm" onClick={() => navigate("/student/profile")}>Barchasi →</button>}
        />
        <div style={{ padding: "14px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {earnedAchievements.length === 0 && (
            <div className="empty"><Icon name="award" size={28} /><div>Hali yutuqlar yo'q</div></div>
          )}
          {earnedAchievements.map((a, i) => (
            <div
              key={a.code}
              className="achievement-pill"
              style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 170, background: "var(--bg2, var(--surface-2))", borderRadius: 11, padding: "10px 13px" }}
            >
              <div style={{ fontSize: 26, animation: ACHIEVEMENT_ANIMS[i % ACHIEVEMENT_ANIMS.length] }}>
                <Icon name={a.icon} size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
