import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@chess-school/ui";
import { LessonReviewModal } from "../../components/LessonReviewModal.js";
import { StreakModal } from "../../components/StreakModal.js";
import { useAuthStore } from "../../lib/auth-store.js";
import { showError } from "../../lib/errorToast.js";
import {
  type ScheduleSlot, useAttendanceHistory, useJoinLesson, useMyPackages, useMyXp, useNextLesson,
  usePendingLessonReviews, useSchedule,
} from "../../lib/queries.js";

const LEVEL_NAMES = ["Yangi boshlovchi", "Boshlang'ich", "O'rta", "Ilg'or", "Usta"];
const DAY_SHORT = ["Du", "Se", "Chor", "Pay", "Ju", "Sha", "Yak"]; // 0=Mon (matches DB convention)
const MONTH_UP = ["YAN", "FEV", "MAR", "APR", "MAY", "IYUN", "IYUL", "AVG", "SEN", "OKT", "NOY", "DEK"];
const MONTH_FULL = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

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
  const diff = (dayOfWeek - (today.getDay() + 6) % 7 + 7) % 7;
  const d = new Date(today); d.setDate(today.getDate() + diff);
  return d;
}

function mondayOfThisWeek(): Date {
  const today = new Date();
  const d = new Date(today);
  d.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return d;
}

function addMins(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const tot = h * 60 + m + mins;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
}

function slotStatus(slot: ScheduleSlot): "live" | "done" | "upcoming" {
  const slotDate = getDateForDay(slot.dayOfWeek);
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const slotOnly = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());
  if (slotOnly < todayOnly) return "done";
  if (slotOnly.getTime() === todayOnly.getTime()) {
    if (slot.endedToday) return "done";
    if (isLessonLiveNow(slot.startTime)) return "live";
    const [h, m] = slot.startTime.split(":").map(Number);
    const start = new Date(now); start.setHours(h, m, 0, 0);
    if (now > start) return "done";
  }
  return "upcoming";
}

/** aylana progress halqasi */
function RingProgress({ pct, size = 40, stroke = 5, color = "#3b82f6", track = "#1e1e22" }: {
  pct: number; size?: number; stroke?: number; color?: string; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset .6s ease" }} />
    </svg>
  );
}

function StatCard({ iconBg, icon, value, label, sub, ghost }: {
  iconBg: string; icon: React.ReactNode; value: React.ReactNode; label: string; sub?: React.ReactNode; ghost: string;
}) {
  return (
    <div style={{
      position: "relative", background: "#141417", border: "1px solid #232328",
      borderRadius: 14, padding: 18, overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle, ${iconBg}33, transparent 70%)` }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${iconBg}59` }}>
          {icon}
        </div>
      </div>
      <div style={{ position: "relative", color: "#f5f5f6", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ position: "relative", color: "#a3a4ad", fontSize: 12, marginTop: 6, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ position: "relative", marginTop: 10 }}>{sub}</div>}
      <div style={{ position: "absolute", right: -6, bottom: -14, fontSize: 70, opacity: .05, pointerEvents: "none", lineHeight: 1, userSelect: "none", color: "#fff" }}>
        {ghost}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: xpData } = useMyXp();
  const { data: nextLesson, isLoading: nextLessonLoading } = useNextLesson();
  const { data: attendance } = useAttendanceHistory();
  const { data: schedule } = useSchedule();
  const { data: packages = [] } = useMyPackages();
  const { data: pendingReviews = [] } = usePendingLessonReviews();
  const joinLesson = useJoinLesson();
  const [reviewTarget, setReviewTarget] = useState<typeof pendingReviews[number] | null>(null);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  const activePkg = packages.find((p) => p.status === "active");
  const remainingLessons = activePkg ? activePkg.totalLessons - activePkg.usedLessons : null;
  const creditPct = activePkg ? Math.round(((activePkg.totalLessons - activePkg.usedLessons) / activePkg.totalLessons) * 100) : 0;

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
  const liveNow = nextLesson?.isLive ?? false;
  const isNextLessonToday = nextLesson ? new Date(nextLesson.nextAt).toDateString() === new Date().toDateString() : false;
  const pendingReview = pendingReviews[0] ?? null;
  const noLessonToday = !nextLessonLoading && !liveNow && !isNextLessonToday && !pendingReview;

  const today = (new Date().getDay() + 6) % 7; // 0=Mon
  const weekSchedule = [...(schedule ?? [])]
    .sort((a, b) => ((a.dayOfWeek - today + 7) % 7) - ((b.dayOfWeek - today + 7) % 7))
    .slice(0, 5);

  const dayStrip = useMemo(() => {
    const monday = mondayOfThisWeek();
    const daysWithLesson = new Set((schedule ?? []).map((s) => s.dayOfWeek));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      return { dow: i, date: d, hasLesson: daysWithLesson.has(i), isToday: i === today };
    });
  }, [schedule, today]);

  const streakBars = useMemo(() => Array.from({ length: 7 }, (_, i) => i < Math.min(streak, 7)), [streak]);

  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* HERO */}
      <div className="sdash-hero" style={{
        position: "relative", background: "linear-gradient(120deg,#0f1220 0%,#151a2e 50%,#1a1530 100%)",
        border: "1px solid #232840", borderRadius: 18, marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,.22) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -120, left: "20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,.15) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: 40, fontSize: 120, lineHeight: 1, opacity: .05, color: "#fff", pointerEvents: "none" }}>♞</div>
        <div style={{ position: "absolute", bottom: 10, right: 180, fontSize: 70, lineHeight: 1, opacity: .04, color: "#fff", pointerEvents: "none" }}>♛</div>

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            {streak > 0 && (
              <div onClick={() => setStreakModalOpen(true)} className="sdash-streak-badge">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 8px #f97316", flexShrink: 0 }} />
                {streak} kunlik streak · Davom ettir
              </div>
            )}
            <div className="sdash-greet">
              Salom, {user?.fullName?.split(" ")[0] ?? "do'stim"} 👋
            </div>
            <div className="sdash-sub">Bugun shaxmat o'rganamizmi?</div>

            <div className="sdash-btn-row">
              <button onClick={() => navigate("/student/pvp")} className="sdash-btn sdash-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                O'ynash
              </button>
              <button onClick={() => navigate("/student/videos")} className="sdash-btn sdash-btn-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></svg>
                Video dars
              </button>
              <button onClick={() => navigate("/student/puzzles")} className="sdash-btn sdash-btn-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 10l3 3 6-6" /></svg>
                Masala
              </button>
            </div>
          </div>

          <div className="sdash-stats">
            {[
              { v: elo, l: "ELO" },
              { v: solvedCount, l: "MASALA" },
              { v: `${attendancePercent}%`, l: "DAVOMAT" },
            ].map((s) => (
              <div key={s.l} className="sdash-stat">
                <div className="sdash-stat-value">{s.v}</div>
                <div className="sdash-stat-label">{s.l}</div>
              </div>
            ))}
            <div className="sdash-stat sdash-stat-streak">
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f97316" stroke="none"><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1.5-1-2.5-1-2.5 1.5 1 3 3 3 5.5a5 5 0 01-10 0c0-5 5-6 5-12z" /></svg>
                <div className="sdash-stat-value">{streak}</div>
              </div>
              <div className="sdash-stat-label">STREAK</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="grid cols-4" style={{ gap: 16, marginBottom: 16 }}>
        <StatCard
          iconBg="#3b82f6" ghost="♛"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M5 20l2-8-4-3h5l2-6 2 6h5l-4 3 2 8-5-3z" /></svg>}
          value={elo} label="ELO Reyting"
          sub={<div style={{ color: "#65666f", fontSize: 10.5 }}>PvP o'yinlardan</div>}
        />
        <StatCard
          iconBg="#f97316" ghost="♞"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1.5-1-2.5-1-2.5 1.5 1 3 3 3 5.5a5 5 0 01-10 0c0-5 5-6 5-12z" /></svg>}
          value={<span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>{streak}<span style={{ color: "#65666f", fontSize: 12, fontWeight: 600 }}>kun</span></span>}
          label="Kun streak"
          sub={
            <div style={{ display: "flex", gap: 3 }}>
              {streakBars.map((on, i) => (
                <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: on ? "#22c55e" : "#1e1e22" }} />
              ))}
            </div>
          }
        />
        <StatCard
          iconBg="#22c55e" ghost="♝"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>}
          value={solvedCount} label="Masalalar"
          sub={<div style={{ color: "#4ade80", fontSize: 10.5, fontWeight: 600 }}>Jami yechilgan</div>}
        />
        <StatCard
          iconBg="#eab308" ghost="♚"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 21h8M12 17v4" /><path d="M6 4h12v3a6 6 0 01-12 0V4z" /><path d="M6 5H3v1a4 4 0 004 4M18 5h3v1a4 4 0 01-4 4" /></svg>}
          value={`${level}-daraja`} label={levelName}
          sub={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
                <RingProgress pct={levelPct} size={32} stroke={4} color="#eab308" />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 8.5, fontWeight: 800, color: "#eab308" }}>{levelPct}%</div>
              </div>
              <div style={{ color: "#eab308", fontSize: 10.5, fontWeight: 700 }}>Keyingi: {level + 1}-daraja</div>
            </div>
          }
        />
      </div>

      {/* 2-COL GRID */}
      <div className="grid l-2-1" style={{ gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* LIVE / rate lesson card */}
          {liveNow && nextLesson && (
            <div style={{
              background: "linear-gradient(135deg,rgba(239,68,68,.08),rgba(20,20,23,1))",
              border: "1px solid #2a1f1f", borderRadius: 14, padding: "18px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: nextLesson.teacherJoined ? "rgba(239,68,68,.15)" : "rgba(234,179,8,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: nextLesson.teacherJoined ? "#ef4444" : "#eab308" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {nextLesson.teacherJoined ? (
                      <div style={{ background: "rgba(239,68,68,.15)", color: "#f87171", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8 }}>● LIVE hozir</div>
                    ) : (
                      <div style={{ background: "rgba(234,179,8,.15)", color: "#facc15", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8 }}>⏳ O'qituvchi hali kelmadi</div>
                    )}
                    <div style={{ color: "#8b8d98", fontSize: 12.5 }}>{nextLesson.startTime.slice(0, 5)}</div>
                  </div>
                  <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 700, marginTop: 4 }}>{nextLesson.groupName ?? nextLesson.customName ?? "Dars"}</div>
                  {nextLesson.teacherName && <div style={{ color: "#65666f", fontSize: 12.5, marginTop: 2 }}>{nextLesson.teacherName}</div>}
                </div>
              </div>
              {/* O'qituvchi hali darsga kirmagan bo'lsa, o'quvchi ham kira olmaydi —
                  backend /me/attendance/join ham buni tekshiradi. "Hali kelmadi"
                  xabari onlayn/offlayn darsdan qat'i nazar ko'rsatiladi (bu sof
                  ma'lumot), lekin "Kirish" tugmasi faqat haqiqiy havola (meetingUrl)
                  bor onlayn darslarda chiqadi — offlayn darsda bosadigan joy yo'q. */}
              {!nextLesson.teacherJoined ? (
                <div style={{ color: "#8b8d98", fontSize: 12.5, fontWeight: 600, fontStyle: "italic" }}>
                  Dars boshlandi, lekin o'qituvchi hali kelmadi
                </div>
              ) : (nextLesson.meetingUrl || nextLesson.teacherDefaultMeetingUrl) && (
                <button onClick={async () => {
                    const res = await joinLesson.mutateAsync(nextLesson.id);
                    if (res?.ok !== false) {
                      window.open((nextLesson.meetingUrl || nextLesson.teacherDefaultMeetingUrl)!, "_blank", "noreferrer");
                    } else if (res.reason === "package_expired") {
                      showError("Sizning paketingiz muddati tugagan. Darsga kirish uchun yangi paket sotib oling.");
                    } else if (res.reason === "teacher_not_joined") {
                      showError("O'qituvchi hali darsga kelmagan.");
                    }
                  }}
                  disabled={joinLesson.isPending}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 9, border: "none", cursor: joinLesson.isPending ? "default" : "pointer", opacity: joinLesson.isPending ? 0.7 : 1 }}>
                  ● Darsga kirish →
                </button>
              )}
            </div>
          )}

          {!liveNow && pendingReview && (
            <div onClick={() => setReviewTarget(pendingReview)} style={{
              background: "linear-gradient(135deg,rgba(234,179,8,.1),rgba(20,20,23,1))",
              border: "1px solid #3a3320", borderRadius: 14, padding: "18px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer", flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(234,179,8,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="star" size={18} style={{ color: "#eab308" }} />
                </div>
                <div>
                  <div style={{ background: "rgba(107,114,128,.2)", color: "#9ca3af", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, display: "inline-block" }}>DARS TUGADI</div>
                  <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 700, marginTop: 4 }}>{pendingReview.topic ?? "Dars"}</div>
                  <div style={{ color: "#65666f", fontSize: 12.5, marginTop: 2 }}>{pendingReview.teacherName}</div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setReviewTarget(pendingReview); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#eab308", color: "#1a1305", fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 9, border: "none", cursor: "pointer" }}>
                ★ Baho berish
              </button>
            </div>
          )}

          {/* Bugungi (hali boshlanmagan) darsning to'liq ko'rinishi endi faqat
              "Darslarim" bo'limida — bu yerda takrorlanmaydi. */}

          {noLessonToday && !pendingReview && (
            <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "rgba(63,140,255,.1)", display: "grid", placeItems: "center", fontSize: 18 }}>📅</div>
              <div>
                <div style={{ color: "#f5f5f6", fontWeight: 800, fontSize: 15 }}>Bugun dars yo'q</div>
                <div style={{ color: "#65666f", fontSize: 13, marginTop: 3 }}>Guruhingiz uchun bugunga rejalashtirilgan dars mavjud emas</div>
              </div>
            </div>
          )}

          {/* Haftalik jadval */}
          <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(59,130,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
                </div>
                <div>
                  <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>Haftalik jadval</div>
                  <div style={{ color: "#65666f", fontSize: 11.5, lineHeight: 1.3, marginTop: 2 }}>
                    {dayStrip[0].date.getDate()}–{dayStrip[6].date.getDate()} {MONTH_FULL[dayStrip[6].date.getMonth()]} {dayStrip[6].date.getFullYear()}
                  </div>
                </div>
              </div>
              <button onClick={() => navigate("/student/lessons")} style={{ background: "transparent", border: "none", color: "#d4d4d8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {schedule?.length ?? 0} dars/hafta
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #1e1e22" }}>
              {dayStrip.map((d) => (
                <div key={d.dow} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 4px", borderRadius: 9,
                  background: d.isToday ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "#18181c",
                  boxShadow: d.isToday ? "0 4px 14px rgba(59,130,246,.35)" : "none",
                }}>
                  <div style={{ color: d.isToday ? "#dbeafe" : "#65666f", fontSize: 10.5, fontWeight: d.isToday ? 700 : 600 }}>{DAY_SHORT[d.dow]}</div>
                  <div style={{ color: d.isToday ? "#fff" : "#d4d4d8", fontSize: 13, fontWeight: d.isToday ? 800 : 700 }}>{d.date.getDate()}</div>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: d.isToday ? "#fff" : d.hasLesson ? "#3b82f6" : "transparent" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weekSchedule.length === 0 && (
                <div style={{ color: "#65666f", fontSize: 13, padding: "8px 0" }}>Darslar topilmadi</div>
              )}
              {weekSchedule.map((slot) => {
                const st = slotStatus(slot);
                const slotDate = getDateForDay(slot.dayOfWeek);
                const isLive = st === "live";
                return (
                  <div key={slot.id} style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 56, flexShrink: 0 }}>
                      <div style={{ color: "#65666f", fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em" }}>{MONTH_UP[slotDate.getMonth()]}</div>
                      <div style={{ color: isLive ? "#f87171" : "#d4d4d8", fontSize: 20, fontWeight: 800, lineHeight: 1, marginTop: 2 }}>{slotDate.getDate()}</div>
                      <div style={{ color: isLive ? "#f87171" : "#65666f", fontSize: 10.5, fontWeight: 700, marginTop: 2 }}>{DAY_SHORT[slot.dayOfWeek].toUpperCase()}</div>
                    </div>
                    <div style={{ width: 2, background: isLive ? "linear-gradient(180deg,#ef4444,rgba(239,68,68,.1))" : "#232328", borderRadius: 2 }} />
                    <div style={{
                      flex: 1, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                      background: isLive ? "linear-gradient(135deg,rgba(239,68,68,.1),transparent)" : "#18181c",
                      border: isLive ? "1px solid rgba(239,68,68,.25)" : "1px solid #232328",
                      opacity: st === "done" ? 0.55 : 1,
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.3 }}>
                          <div style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 700 }}>{slot.groupName ?? slot.customName ?? "Dars"}</div>
                          {isLive && <div style={{ background: "rgba(239,68,68,.2)", color: "#f87171", fontSize: 9.5, fontWeight: 800, padding: "2px 6px", borderRadius: 5, letterSpacing: ".04em" }}>LIVE</div>}
                          {st === "done" && <Icon name="check" size={12} style={{ color: "#65666f" }} />}
                        </div>
                        <div style={{ color: "#8b8d98", fontSize: 11.5, lineHeight: 1.3, marginTop: 3 }}>{slot.teacherName ?? "—"}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: "#f5f5f6", fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{slot.startTime.slice(0, 5)}</div>
                        <div style={{ color: "#65666f", fontSize: 10.5, lineHeight: 1.3 }}>{addMins(slot.startTime, slot.durationMinutes ?? 90)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Dars krediti */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activePkg ? (
            <div style={{ background: "linear-gradient(135deg,#141417 0%,#161620 100%)", border: "1px solid #232328", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 70%)", pointerEvents: "none" }} />

              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(59,130,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
                  </div>
                  <div>
                    <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700 }}>Dars krediti</div>
                    <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 2 }}>{activePkg.packageName}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,.12)", color: "#4ade80", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                  {creditPct > 30 ? "Faol" : "Kam qoldi"}
                </div>
              </div>

              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
                  <RingProgress pct={creditPct} size={96} stroke={9} color={creditPct > 30 ? "#60a5fa" : "#ef4444"} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ color: "#f5f5f6", fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{remainingLessons}</div>
                    <div style={{ color: "#65666f", fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>/ {activePkg.totalLessons} dars</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#18181c", border: "1px solid #232328", borderRadius: 9 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                      <div style={{ color: "#a3a4ad", fontSize: 11.5, fontWeight: 600 }}>Qoldi</div>
                    </div>
                    <div style={{ color: "#f5f5f6", fontSize: 14, fontWeight: 800 }}>{remainingLessons}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#18181c", border: "1px solid #232328", borderRadius: 9 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a4b52" }} />
                      <div style={{ color: "#a3a4ad", fontSize: 11.5, fontWeight: 600 }}>Ishlatildi</div>
                    </div>
                    <div style={{ color: "#f5f5f6", fontSize: 14, fontWeight: 800 }}>{activePkg.usedLessons}</div>
                  </div>
                </div>
              </div>

              {activePkg.expiresAt && (
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px", background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.15)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    <div>
                      <div style={{ color: "#d4d4d8", fontSize: 11.5, fontWeight: 600 }}>Paket muddati</div>
                      <div style={{ color: "#65666f", fontSize: 10.5, marginTop: 1 }}>
                        {(() => { const d = new Date(activePkg.expiresAt!); return `${d.getDate()} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`; })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: "28px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎫</div>
              <div style={{ color: "#f5f5f6", fontSize: 13, fontWeight: 700 }}>Aktiv paket topilmadi</div>
              <div style={{ color: "#65666f", fontSize: 12, marginTop: 4 }}>Admin orqali paket sotib oling</div>
            </div>
          )}
        </div>
      </div>

      {reviewTarget && <LessonReviewModal review={reviewTarget} onClose={() => setReviewTarget(null)} />}
      {streakModalOpen && <StreakModal onClose={() => setStreakModalOpen(false)} />}
    </div>
  );
}
