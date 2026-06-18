import { useNavigate } from "react-router-dom";
import { Card, CardHead } from "@chess-school/ui";
import { ChessBoard } from "../../components/ChessBoard.js";
import { useAuthStore } from "../../lib/auth-store.js";
import { type ScheduleSlot, useAttendanceHistory, useDailyPuzzle, useMyXp, useNextLesson, useSchedule } from "../../lib/queries.js";

const LEVEL_NAMES = ["Yangi boshlovchi", "Boshlang'ich", "O'rta", "Ilg'or", "Usta"];
const DAY_SHORT = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"];

function xpForLevel(level: number) { return level * 200; }

function isLessonLiveNow(startTime: string, durationMin = 90): boolean {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(now); start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  return now >= start && now <= end;
}

function getDateForDay(dayOfWeek: number): Date {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const d = new Date(today); d.setDate(today.getDate() + diff);
  return d;
}

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function slotStatus(slot: ScheduleSlot): "live" | "done" | "upcoming" {
  const slotDate = getDateForDay(slot.dayOfWeek);
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slotOnly = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());
  if (slotOnly < todayOnly) return "done";
  if (slotOnly.getTime() === todayOnly.getTime()) {
    if (isLessonLiveNow(slot.startTime)) return "live";
    const [h, m] = slot.startTime.split(":").map(Number);
    const start = new Date(now); start.setHours(h, m, 0, 0);
    if (now > start) return "done";
  }
  return "upcoming";
}

function KidStatCard({ emoji, value, label, delta, deltaUp, ghost, valueColor }: {
  emoji: string; value: string; label: string; delta: string;
  deltaUp?: boolean; ghost: string; valueColor?: string;
}) {
  return (
    <div style={{
      background: "var(--kcard, var(--surface))",
      border: "1px solid var(--kborder, var(--border))",
      borderRadius: 16, padding: 18,
      position: "relative", overflow: "hidden",
      transition: "transform .18s",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,.08)", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 12 }}>
        {emoji}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: "-.02em", color: valueColor ?? "var(--ktext, var(--text))" }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--kdim, var(--text-faint))", marginTop: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 7, color: deltaUp ? "var(--ksuc, #10B981)" : "var(--kwarn, #F59E0B)" }}>
        {delta}
      </div>
      <div style={{ position: "absolute", right: -6, bottom: -14, fontSize: 70, opacity: .06, pointerEvents: "none", lineHeight: 1, userSelect: "none" }}>
        {ghost}
      </div>
    </div>
  );
}

const ACHIEVEMENT_EMOJIS: Record<string, string> = {
  first_win: "⭐",
  streak_7: "🔥",
  streak_30: "🔥",
  tournament_winner: "🏆",
  puzzles_10: "🧩",
  puzzles_50: "🎯",
};
const FALLBACK_EMOJIS = ["⭐", "🔥", "🏆", "🎯", "💎", "🏅"];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: xpData } = useMyXp();
  const { data: dailyPuzzle } = useDailyPuzzle();
  const { data: nextLesson } = useNextLesson();
  const { data: attendance } = useAttendanceHistory();
  const { data: schedule } = useSchedule();

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

  const today = new Date().getDay();
  const weekSchedule = [...(schedule ?? [])]
    .sort((a, b) => ((a.dayOfWeek - today + 7) % 7) - ((b.dayOfWeek - today + 7) % 7))
    .slice(0, 5);

  return (
    <div>
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
            <div className="hri"><div className="v">{elo}</div><div className="l">ELO</div></div>
            <div className="hri"><div className="v">{solvedCount}</div><div className="l">Masala</div></div>
            <div className="hri"><div className="v">{attendancePercent}%</div><div className="l">Davomat</div></div>
            <div className="hri"><div className="v">🔥{streak}</div><div className="l">Streak</div></div>
          </div>
          <div className="hbtns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn bw" onClick={() => navigate("/student/pvp")}>♟ O'ynash</button>
            <button className="btn bt" onClick={() => navigate("/student/videos")}>🎬 Video dars</button>
            <button className="btn bt" onClick={() => navigate("/student/puzzles")}>🧩 Masala</button>
          </div>
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <KidStatCard emoji="♛" value={String(elo)} label="ELO Reyting" delta="▲ +45 bu oy" deltaUp ghost="♛" valueColor="var(--kacc, #3F8CFF)" />
        <KidStatCard emoji="🔥" value={String(streak)} label="Kun streak" delta="Rekord: 14 kun" ghost="♞" valueColor="var(--kwarn, #F59E0B)" />
        <KidStatCard emoji="🎯" value={String(solvedCount)} label="Masalalar" delta="▲ +8 bu hafta" deltaUp ghost="♝" valueColor="var(--ksuc, #10B981)" />
        <KidStatCard emoji="🏆" value={`${level}-daraja`} label={levelName} delta={`${levelPct}% → keyingi`} ghost="♚" />
      </div>

      {/* 2-col grid */}
      <div className="grid l-2-1" style={{ marginBottom: "var(--gap)" }}>
        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {/* LIVE banner */}
          {liveNow && nextLesson && (
            <Card style={{ borderColor: "rgba(239,68,68,.3)" }}>
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
                  {nextLesson.teacherName && <div style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 3 }}>{nextLesson.teacherName}</div>}
                </div>
                {nextLesson.meetingUrl && (
                  <a className="btn primary" href={nextLesson.meetingUrl} target="_blank" rel="noreferrer">Kirish →</a>
                )}
              </div>
            </Card>
          )}

          {/* Haftalik jadval */}
          <Card>
            <CardHead
              icon="calendarCheck"
              title="Haftalik jadval"
              right={<button className="btn sm" onClick={() => navigate("/student/lessons")}>Barchasi →</button>}
            />
            <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column" }}>
              {weekSchedule.length === 0 && (
                <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "10px 0" }}>Darslar topilmadi</div>
              )}
              {weekSchedule.map((slot) => {
                const st = slotStatus(slot);
                const slotDate = getDateForDay(slot.dayOfWeek);
                return (
                  <div key={slot.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 0", borderBottom: "1px solid var(--border)",
                    opacity: st === "done" ? 0.5 : 1,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: st === "live" ? "rgba(239,68,68,.15)" : st === "done" ? "rgba(255,255,255,.04)" : "rgba(63,140,255,.1)",
                      display: "grid", placeItems: "center",
                      fontSize: 11, fontWeight: 700,
                      color: st === "live" ? "#ef4444" : st === "done" ? "var(--text-faint)" : "var(--kacc, #3F8CFF)",
                    }}>
                      {DAY_SHORT[slot.dayOfWeek]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {slot.groupName}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
                        {fmtDate(slotDate)} · {slot.startTime.slice(0, 5)}{slot.teacherName ? ` · ${slot.teacherName}` : ""}
                      </div>
                    </div>
                    {st === "live"     && <span className="badge dang" style={{ fontSize: 10, flexShrink: 0 }}>● LIVE</span>}
                    {st === "done"     && <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>✓ Bo'ldi</span>}
                    {st === "upcoming" && <span style={{ fontSize: 11, color: "var(--kacc, #3F8CFF)", flexShrink: 0 }}>● Kutilmoqda</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
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

          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 12 }}>📊 Mavzular bo'yicha natija</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "♟ Debyut", pct: 72, color: "var(--kacc, #3F8CFF)" },
                  { label: "⚔️ Taktika", pct: 55, color: "var(--kwarn, #F59E0B)" },
                  { label: "♔ Endshpil", pct: 38, color: "var(--ksuc, #10B981)" },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                      <span style={{ color: "var(--text-faint)" }}>{row.label}</span>
                      <b style={{ color: row.color }}>{row.pct}%</b>
                    </div>
                    <div className="pbar">
                      <span style={{ width: `${row.pct}%`, background: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* So'nggi yutuqlar */}
      <Card style={{ marginBottom: "var(--gap)" }}>
        <CardHead
          icon="award"
          title="So'nggi yutuqlar"
          right={<button className="btn sm" onClick={() => navigate("/student/profile")}>Barchasi →</button>}
        />
        <div style={{ padding: "14px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          {earnedAchievements.length === 0 && (
            <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "4px 0" }}>Hali yutuqlar yo'q. Mashq qil! 💪</div>
          )}
          {earnedAchievements.slice(0, 4).map((a, i) => {
            const emoji = ACHIEVEMENT_EMOJIS[a.code] ?? FALLBACK_EMOJIS[i % FALLBACK_EMOJIS.length];
            return (
              <div key={a.code} style={{
                display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 160,
                background: "var(--kcard2, var(--surface-2, rgba(255,255,255,.04)))",
                borderRadius: 12, padding: "10px 13px",
                border: "1px solid var(--kborder, var(--border))",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,.07)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{a.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Shaxmat Online maktabi promo */}
      <div style={{
        borderRadius: 18,
        background: "linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)",
        border: "1px solid rgba(255,255,255,.1)",
        padding: "22px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{ fontSize: 60, flexShrink: 0, filter: "drop-shadow(0 4px 14px rgba(0,0,0,.45))", lineHeight: 1 }}>♞</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>♟ Shaxmat Online maktabi</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginBottom: 14, lineHeight: 1.55, maxWidth: 480 }}>
            Siz bilan birga 7 dan 17 yoshgacha <b style={{ color: "#fff" }}>250+ o'quvchi</b> shaxmat o'rganmoqda!
            Har kuni mashq qil, reyting oshir, turnirda g'olib chiq! 🏆
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: "☀️", text: "250+ o'quvchi" },
              { icon: "👥", text: "8 ta murabbiy" },
              { icon: "🏆", text: "Oylik turnirlar" },
            ].map((pill) => (
              <div key={pill.text} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,.15)", borderRadius: 99,
                padding: "5px 13px", fontSize: 12.5, fontWeight: 600, color: "#fff",
                border: "1px solid rgba(255,255,255,.2)",
              }}>
                <span>{pill.icon}</span><span>{pill.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
          display: "flex", gap: 4, opacity: 0.65,
        }}>
          <span style={{ fontSize: 40, display: "inline-block", animation: "kFloat 2.5s ease-in-out infinite" }}>👦</span>
          <span style={{ fontSize: 40, display: "inline-block", animation: "kFloat 3s .3s ease-in-out infinite" }}>👧</span>
          <span style={{ fontSize: 40, display: "inline-block", animation: "kFloat 3.5s .6s ease-in-out infinite" }}>👦</span>
        </div>
      </div>
    </div>
  );
}
