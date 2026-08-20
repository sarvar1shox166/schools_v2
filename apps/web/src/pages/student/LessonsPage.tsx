import { useEffect, useMemo, useState } from "react";
import { Icon, showXp } from "@chess-school/ui";
import {
  useAttendanceHistory,
  useCancelledToday,
  useCompleteHomework,
  useHomework,
  useNextLesson,
  useStudentLessonHistory,
  type Homework,
} from "../../lib/queries.js";

/* ── Constants ─────────────────────────────────────────────────────────── */
const DAY_SHORT = ["Du", "Se", "Chor", "Pay", "Ju", "Sha", "Yak"]; // 0=Mon (matches DB convention)
const ATT_COLOR: Record<string, string> = { p: "#22c55e", l: "#f59e0b", a: "#ef4444", ae: "#8b5cf6" };
const ATT_ICON: Record<string, string> = { p: "✓", l: "!", a: "−", ae: "•" };
const ATT_LABEL: Record<string, string> = { p: "Darsga keldingiz", l: "Darsga kechikdingiz", a: "Darsga kelmadingiz", ae: "Sababli kelmadingiz" };

function HistoryStars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < rating ? "#f59e0b" : "#3a3a40" }}>★</span>
      ))}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDueDate(due: string | null): string {
  if (!due) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Bugun";
  if (diff === 1) return "Ertaga";
  if (diff < 0) return `${Math.abs(diff)} kun oldin`;
  return due;
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${DAY_SHORT[(d.getDay() + 6) % 7]}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** "20.08, 09:00" — vazifa qaysi dars uchun berilganini ko'rsatadi. */
function fmtLessonDateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  return time ? `${label}, ${time.slice(0, 5)}` : label;
}

// `[matn](https://...)` va oddiy "https://..." havolalarni bosiladigan
// <a> elementlarga aylantiradi — qolgan matn o'zgarishsiz qoladi.
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
function renderTextWithLinks(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const label = m[1] ?? m[3];
    const url = m[2] ?? m[3];
    nodes.push(
      <a key={key++} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>
        {label}
      </a>
    );
    lastIndex = LINK_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/* ── Uy vazifasi qatori — bosilsa "matn" (tavsifdan tashqari yozilgan
   qo'shimcha matn/havola) ochilib ko'rinadi ─────────────────────────────── */
export function HomeworkRow({ hw, onComplete }: { hw: Homework; onComplete: (id: string, xp: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = !!hw.description?.trim();
  const lessonLabel = fmtLessonDateTime(hw.lessonDate, hw.lessonTime);

  return (
    <div style={{
      borderTop: "1px solid #1e1e22", padding: "14px 22px",
      background: hw.done ? "linear-gradient(90deg,rgba(34,197,94,.05),transparent)" : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div onClick={(e) => { e.stopPropagation(); if (!hw.done) onComplete(hw.id, hw.xpReward); }} style={{
            width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: hw.done ? "default" : "pointer",
            background: hw.done ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#18181c", border: hw.done ? "none" : "1px solid #232328",
            boxShadow: hw.done ? "0 4px 12px rgba(34,197,94,.35)" : "none",
          }}>
            {hw.done && <Icon name="check" size={16} style={{ color: "#fff" }} />}
          </div>
          <div
            onClick={() => hasDescription && setExpanded((v) => !v)}
            style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, cursor: hasDescription ? "pointer" : "default" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <div style={{
                color: hw.done ? "#65666f" : "#f5f5f6", fontSize: 13.5, fontWeight: 600, textDecoration: hw.done ? "line-through" : "none", lineHeight: 1.3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
              }}>
                {hw.title}
              </div>
              {hasDescription && (
                <Icon name="chevronDown" size={12} style={{ color: "#65666f", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap", lineHeight: 1.3 }}>
              {lessonLabel && (
                <div style={{ background: "#18181c", border: "1px solid #232328", color: "#8b8d98", fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 8 }}>
                  📅 {lessonLabel}
                </div>
              )}
              {hw.groupName && (
                <div style={{ background: hw.groupColor ?? "#3b82f6", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 8 }}>
                  {hw.groupName}
                </div>
              )}
              {hw.dueDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#8b8d98", fontSize: 11.5 }}>
                  <Icon name="clock" size={11} />
                  {fmtDueDate(hw.dueDate)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#fbbf24", fontSize: 11.5, fontWeight: 700 }}>
                +{hw.xpReward} XP
              </div>
            </div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
          background: hw.done ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.06)", color: hw.done ? "#4ade80" : "#8b8d98",
        }}>
          {hw.done && <Icon name="check" size={12} />}
          {hw.done ? "Bajarildi" : "Qilinmagan"}
        </div>
      </div>

      {expanded && hasDescription && (
        <div style={{
          marginTop: 10, marginLeft: 46, padding: "10px 12px", background: "#18181c", border: "1px solid #232328",
          borderRadius: 10, fontSize: 12.5, color: "#c7c8d0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {renderTextWithLinks(hw.description!)}
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function LessonsPage() {
  const { data: next } = useNextLesson();
  const { data: attendance } = useAttendanceHistory();
  const { data: lessonHistory = [] } = useStudentLessonHistory();
  const { data: homework = [] } = useHomework();
  const { data: cancelledToday = [] } = useCancelledToday();
  const completeHW = useCompleteHomework();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 1000); return () => clearInterval(t); }, []);

  const countdownMs = useMemo(() => {
    if (!next) return 0;
    return Math.max(0, new Date(next.nextAt).getTime() - Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, next?.nextAt]);

  const countdown = {
    d: Math.floor(countdownMs / 86400000),
    h: Math.floor((countdownMs % 86400000) / 3600000),
    m: Math.floor((countdownMs % 3600000) / 60000),
    s: Math.floor((countdownMs % 60000) / 1000),
  };
  const isToday = next ? new Date(next.nextAt).toDateString() === new Date().toDateString() : false;
  // Ko'chirilgan darsda haftalik kun emas, aynan yangi sananing kuni ko'rsatilishi kerak.
  const nextDow = next ? (new Date(next.nextAt).getDay() + 6) % 7 : 0;

  async function handleComplete(id: string, xp: number) {
    const res = await completeHW.mutateAsync(id);
    if (!res.alreadyCompleted) showXp(res.xpAwarded ?? xp, "Uy vazifasi bajarildi!");
  }

  const doneHWCount = homework.filter((h) => h.done).length;
  const hwPct = homework.length > 0 ? Math.round((doneHWCount / homework.length) * 100) : 0;

  const monthLabel = new Date().toLocaleDateString("uz-UZ", { month: "long" });
  const selected = selectedDay != null ? attendance?.records[selectedDay] ?? null : null;

  return (
    <div>
      {/* ── Bugungi bekor qilingan darslar ────────────────────────────────── */}
      {cancelledToday.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 14, marginBottom: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "rgba(239,68,68,.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="x" size={17} style={{ color: "#f87171" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fca5a5" }}>
              Bugungi dars bekor qilindi
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
              {s.groupName ?? s.customName ?? "Dars"} · {s.startTime.slice(0, 5)}
            </div>
          </div>
        </div>
      ))}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {next ? (
        <div style={{
          position: "relative", background: "linear-gradient(120deg,#0b1226 0%,#132048 45%,#1a1440 100%)",
          border: "1px solid #2a3560", borderRadius: 18, padding: 28, marginBottom: 16, overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -140, right: -100, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.28) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -160, left: "40%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.2) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 24, right: 60, fontSize: 180, lineHeight: 1, opacity: .04, color: "#fff", pointerEvents: "none" }}>♞</div>

          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8,
                  background: next.isLive ? "rgba(239,68,68,.15)" : "rgba(96,165,250,.15)",
                  border: `1px solid ${next.isLive ? "rgba(248,113,113,.3)" : "rgba(96,165,250,.3)"}`,
                  color: next.isLive ? "#fca5a5" : "#93c5fd",
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", background: next.isLive ? "#ef4444" : "#60a5fa",
                    boxShadow: next.isLive ? "0 0 8px #ef4444" : "none",
                    animation: next.isLive ? "pulse-live 1.6s infinite" : "none",
                  }} />
                  {isToday ? "Bugun" : DAY_SHORT[nextDow]} · {next.startTime.slice(0, 5)}
                </div>
                {next.isRescheduled && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(234,179,8,.15)", border: "1px solid rgba(234,179,8,.35)", color: "#facc15", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>
                    <Icon name="refresh" size={11} />
                    Vaqti ko'chirildi
                  </div>
                )}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(139,92,246,.15)", border: "1px solid rgba(167,139,250,.3)", color: "#c4b5fd", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8 }}>
                  <Icon name="students" size={11} />
                  {next.groupName ?? next.customName ?? "Individual dars"}
                </div>
              </div>

              <div style={{ color: "#8b93b0", fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>
                {next.isLive ? "HOZIR DAVOM ETMOQDA" : "KEYINGI DARS"}
              </div>
              <div style={{ color: "#fff", fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>
                {next.groupName ?? next.customName ?? "Individual dars"}
              </div>

              {/* Vaqt doim to'liq (soniyagacha) ko'rsatiladi — dars boshlanib, "00:00:00"ga
                  yetgach ham dars tugashigacha shu holatda qoladi, alohida tugma yo'q. */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, flexWrap: "wrap" }}>
                {([
                  countdown.d > 0 ? { v: countdown.d, l: "KUN" } : null,
                  { v: countdown.h, l: "SOAT" },
                  { v: countdown.m, l: "DAQIQA" },
                  { v: countdown.s, l: "SONIYA" },
                ] as ({ v: number; l: string } | null)[]).filter(Boolean).map((item, i) =>
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "12px 16px", minWidth: 72 }}>
                    <div style={{ color: "#fff", fontSize: 32, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{String(item!.v).padStart(2, "0")}</div>
                    <div style={{ color: "#8b93b0", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", marginTop: 6 }}>{item!.l}</div>
                  </div>
                )}
                <div style={{ color: "#c7d0e8", fontSize: 14 }}>qoldi</div>
              </div>
            </div>

            {next.teacherName && (
              <div style={{
                position: "relative", background: "linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03))",
                border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "18px 20px 16px",
                display: "flex", flexDirection: "column", gap: 14, backdropFilter: "blur(14px)", flexShrink: 0, minWidth: 240,
                boxShadow: "0 10px 32px rgba(0,0,0,.3)", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, background: "radial-gradient(circle,rgba(236,72,153,.35),transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 100, height: 100, background: "radial-gradient(circle,rgba(139,92,246,.25),transparent 70%)", pointerEvents: "none" }} />

                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", inset: -3, borderRadius: 15, background: "linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)", opacity: .9, filter: "blur(6px)" }} />
                    <div style={{
                      position: "relative", width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#ec4899,#db2777)",
                      color: "#fff", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 6px 18px rgba(236,72,153,.5), inset 0 1px 0 rgba(255,255,255,.25)",
                    }}>
                      {next.teacherName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ position: "absolute", bottom: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#22c55e", border: "2.5px solid #1a1f3a", boxShadow: "0 0 10px rgba(34,197,94,.6)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(139,92,246,.2)", border: "1px solid rgba(167,139,250,.35)",
                      color: "#c4b5fd", fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 20, alignSelf: "flex-start", marginBottom: 5,
                    }}>
                      O'QITUVCHI
                    </div>
                    {next.teacherName.split(" ").map((w) => (
                      <div key={w} style={{ color: "#fff", fontSize: 15.5, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", letterSpacing: "-.01em" }}>{w}</div>
                    ))}
                  </div>
                </div>

                {(next.teacherRating != null || next.teacherStudentsCount > 0) && (
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    {next.teacherRating != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", padding: "5px 10px", borderRadius: 20 }}>
                        <Icon name="star" size={11} style={{ color: "#fbbf24" }} />
                        <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 800 }}>{next.teacherRating}</span>
                      </div>
                    )}
                    {next.teacherStudentsCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#c9cee0", fontSize: 11, fontWeight: 600 }}>
                        <Icon name="students" size={10} />
                        {next.teacherStudentsCount} shogird
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <style>{"@keyframes pulse-live { 0%,100% { opacity: 1; } 50% { opacity: .4; } }"}</style>
        </div>
      ) : (
        <div style={{
          background: "#141417", border: "1px solid #232328", borderRadius: 16,
          padding: 24, marginBottom: 16, textAlign: "center", color: "#65666f", fontSize: 14,
        }}>
          📅 Sizda mavjud darslar yo'q
        </div>
      )}

      {/* ── 2-col grid ───────────────────────────────────────────────────── */}
      <div className="grid l-2-1" style={{ gap: 16 }}>

        {/* LEFT: uy vazifalari */}
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="puzzle" size={18} style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>Uy vazifalari</div>
                <div style={{ color: "#65666f", fontSize: 12, lineHeight: 1.3, marginTop: 2 }}>Belgilab boring</div>
              </div>
            </div>
            {homework.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: "#f5f5f6", fontSize: 14, fontWeight: 800 }}>{doneHWCount} / {homework.length}</div>
                <div style={{ position: "relative", width: 34, height: 34 }}>
                  <svg width="34" height="34" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#1e1e22" strokeWidth="4" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={100.5} strokeDashoffset={100.5 - (hwPct / 100) * 100.5} style={{ transition: "stroke-dashoffset .5s" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontSize: 9, fontWeight: 800 }}>{hwPct}%</div>
                </div>
              </div>
            )}
          </div>

          {homework.length === 0 ? (
            <div style={{ borderTop: "1px solid #1e1e22", padding: "24px 22px", color: "#65666f", fontSize: 13, textAlign: "center" }}>
              Hali uy vazifasi yo'q
            </div>
          ) : homework.map((hw) => (
            <HomeworkRow key={hw.id} hw={hw} onComplete={handleComplete} />
          ))}
        </div>

        {/* RIGHT: davomat tarixi */}
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(34,197,94,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={16} style={{ color: "#4ade80" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap" }}>Davomat tarixi</div>
              <div style={{ color: "#65666f", fontSize: 11.5, lineHeight: 1.3, marginTop: 2, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                Bu oy · {attendance?.records.length ?? 0} dars
              </div>
            </div>
          </div>

          {!attendance ? (
            <div style={{ padding: "18px 0", color: "#65666f", fontSize: 13, textAlign: "center" }}>Yuklanmoqda...</div>
          ) : attendance.records.length === 0 ? (
            <div style={{ padding: "18px 0", color: "#65666f", fontSize: 13, textAlign: "center" }}>Hali davomat qayd etilmagan</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { v: attendance.totals.p, l: "Keldi", bg: "rgba(34,197,94,.12)", bg2: "rgba(34,197,94,.04)", bd: "rgba(34,197,94,.25)", clr: "#4ade80" },
                  { v: attendance.totals.l, l: "Kechikdi", bg: "rgba(245,158,11,.1)", bg2: "rgba(245,158,11,.03)", bd: "rgba(245,158,11,.2)", clr: "#f59e0b" },
                  { v: attendance.totals.a, l: "Kelmadi", bg: "rgba(239,68,68,.1)", bg2: "rgba(239,68,68,.03)", bd: "rgba(239,68,68,.2)", clr: "#f87171" },
                ].map((s) => (
                  <div key={s.l} style={{ background: `linear-gradient(135deg,${s.bg},${s.bg2})`, border: `1px solid ${s.bd}`, borderRadius: 10, padding: "12px 8px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ color: s.clr, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ color: s.clr, fontSize: 10.5, fontWeight: 600, marginTop: 5, letterSpacing: ".03em" }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "#65666f", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", marginBottom: 8 }}>DARSGA KELISH TARIXI</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {attendance.records.map((r, i) => {
                    const active = selectedDay === i;
                    return (
                      <div key={i} onClick={() => setSelectedDay(active ? null : i)} title={r.date}
                        style={{
                          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "#fff",
                          background: ATT_COLOR[r.status] ?? "#475569",
                          boxShadow: active ? "0 0 0 2px #f5f5f6" : "none",
                        }}>
                        {ATT_ICON[r.status]}
                      </div>
                    );
                  })}
                </div>
                {selected && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#18181c", border: "1px solid #232328", borderRadius: 9, padding: "8px 12px", marginTop: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ color: ATT_COLOR[selected.status], fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{ATT_LABEL[selected.status]}</div>
                      <div style={{ color: "#65666f", fontSize: 11, lineHeight: 1.3, marginTop: 2 }}>{fmtDayLabel(selected.date)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ color: "#8b8d98", fontSize: 11.5 }}>Umumiy davomat</div>
                  <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 800 }}>{attendance.percent}%</div>
                </div>
                <div style={{ height: 6, background: "#1e1e22", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${attendance.percent}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Darslar tarixi (tafsilot) ────────────────────────────────────── */}
      <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #1e1e22" }}>
          <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 700 }}>Darslar tarixi</div>
          <div style={{ color: "#65666f", fontSize: 12, marginTop: 2 }}>Mavzu, davomat va siz qoldirgan baho</div>
        </div>
        {lessonHistory.length === 0 ? (
          <div style={{ padding: "24px 22px", textAlign: "center", color: "#65666f", fontSize: 13 }}>
            Hali dars tarixi yo'q
          </div>
        ) : lessonHistory.map((l) => (
          <div key={l.lessonId} style={{ padding: "14px 22px", borderBottom: "1px solid #1e1e22", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: "#fff", background: ATT_COLOR[l.attendanceStatus] ?? "#475569",
            }}>
              {ATT_ICON[l.attendanceStatus]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 700 }}>{l.topic ?? "Dars"}</span>
                {l.rating != null && <HistoryStars rating={l.rating} />}
              </div>
              <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 3 }}>
                {fmtDayLabel(l.conductedAt)} · {l.teacherName} · {ATT_LABEL[l.attendanceStatus] ?? l.attendanceStatus}
                {l.reason && ` (${l.reason})`}
              </div>
              {l.comment && (
                <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#18181c", border: "1px solid #232328", fontSize: 12.5, color: "#a8a9b3" }}>
                  «{l.comment}»
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
