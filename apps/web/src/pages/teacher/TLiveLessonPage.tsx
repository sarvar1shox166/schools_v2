import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTodaySchedule, useGroupStudents,
  useEndLesson, useJoinTeacherLesson,
  useAttendance, useMarkAttendance,
} from "../../lib/queries.js";

function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const AVATAR_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#06b6d4"];
function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// Dars davomida belgilangan (hali yuborilmagan) davomat localStorage'da
// saqlanadi — o'qituvchi sahifadan chiqib ketsa/qayta yuklasa ham
// yo'qolmasligi uchun. "Darsni tugatish" muvaffaqiyatli bo'lgach tozalanadi.
type AttStatus = "p" | "l" | "a" | "ae";
function attendanceStorageKey(scheduleSlotId: string, date: string) {
  return `dars_davomat:${scheduleSlotId}:${date}`;
}
function loadStagedAttendance(scheduleSlotId: string, date: string): Record<string, AttStatus> {
  try {
    const raw = localStorage.getItem(attendanceStorageKey(scheduleSlotId, date));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveStagedAttendance(scheduleSlotId: string, date: string, data: Record<string, AttStatus>) {
  try { localStorage.setItem(attendanceStorageKey(scheduleSlotId, date), JSON.stringify(data)); } catch { /* ignore */ }
}
function clearStagedAttendance(scheduleSlotId: string, date: string) {
  try { localStorage.removeItem(attendanceStorageKey(scheduleSlotId, date)); } catch { /* ignore */ }
}

const ATT_LABELS: { key: AttStatus; label: string; color: string }[] = [
  { key: "p", label: "Keldi", color: "#22c55e" },
  { key: "l", label: "Kechikdi", color: "#f59e0b" },
  { key: "a", label: "Kelmadi", color: "#ef4444" },
  { key: "ae", label: "Sababli", color: "#8b5cf6" },
];
function pillStyle(active: boolean, color: string): React.CSSProperties {
  return active
    ? { background: color, color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer" }
    : { background: "var(--surface-3)", color: "var(--text-faint)", fontSize: 11.5, fontWeight: 500, padding: "6px 10px", borderRadius: 7, cursor: "pointer" };
}

/* ── Dars jurnali: davomat ro'yxati — o'qituvchi belgilagan holat faqat
 *  MAHALLIY saqlanadi (hech kim avtomatik "keldi" deb belgilanmagan bo'ladi);
 *  haqiqiy yozuv va paket -1 FAQAT "Darsni tugatish" bosilganda, bir martada
 *  yuboriladi — dars davomida darhol ishlanmaydi. O'qituvchi umuman
 *  belgilamagan o'quvchiga hech narsa tegilmaydi. */
function AttendanceJournal({ scheduleSlotId, students, attendance, onSetStatus }: {
  scheduleSlotId: string;
  students: { id: string; fullName: string }[];
  attendance: Record<string, AttStatus>;
  onSetStatus: (studentId: string, status: AttStatus) => void;
}) {
  const date = todayStr();
  const { data: existing = [] } = useAttendance(scheduleSlotId, date);

  const existingMap = useMemo(() => {
    const m: Record<string, AttStatus> = {};
    for (const r of existing) m[r.studentId] = r.status;
    return m;
  }, [existing]);

  const markedCount = students.filter((st) => attendance[st.id] ?? existingMap[st.id]).length;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>Davomat</div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600 }}>{markedCount}/{students.length} belgilandi</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
        Belgilaganlaringiz "Darsni tugatish" bosilganda saqlanadi va paketdan yechiladi.
      </div>
      {students.length === 0 ? (
        <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Bu darsda o'quvchi yo'q.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {students.map((st, i) => {
            const status = attendance[st.id] ?? existingMap[st.id];
            return (
              <div key={st.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", rowGap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {initialsOf(st.fullName)}
                  </div>
                  <div style={{ color: "var(--text)", fontSize: 13.5, fontWeight: 500 }}>{st.fullName}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ATT_LABELS.map((a) => (
                    <div key={a.key} onClick={() => onSetStatus(st.id, a.key)} style={pillStyle(status === a.key, a.color)}>{a.label}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TLiveLessonPage() {
  const { scheduleSlotId } = useParams<{ scheduleSlotId: string }>();
  const navigate = useNavigate();

  const { data: todaySchedule, isLoading: schedLoading } = useTodaySchedule();
  const slot = todaySchedule?.find((s) => s.id === scheduleSlotId) ?? null;

  const joinTeacherLesson = useJoinTeacherLesson();
  const endLesson = useEndLesson();
  const markAttendance = useMarkAttendance();

  const { data: students = [] } = useGroupStudents(slot?.groupId ?? null);

  const [ending, setEnding] = useState(false);
  const [err, setErr] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>(() =>
    scheduleSlotId ? loadStagedAttendance(scheduleSlotId, todayStr()) : {}
  );

  function setStatus(studentId: string, status: AttStatus) {
    setAttendance((s) => {
      const next = { ...s, [studentId]: status };
      if (scheduleSlotId) saveStagedAttendance(scheduleSlotId, todayStr(), next);
      return next;
    });
  }

  // Sahifaga kirilganda dars "boshlangan" deb belgilanadi (agar hali belgilanmagan bo'lsa) —
  // backend ON CONFLICT DO NOTHING ishlatgani uchun qayta chaqirish xavfsiz.
  useEffect(() => {
    if (scheduleSlotId && slot && !slot.isStarted) {
      joinTeacherLesson.mutate(scheduleSlotId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSlotId, slot?.isStarted]);

  // Sekundiga yangilanadi — tugash sanog'i sahifani yangilamasdan real vaqtda ko'rinishi kerak.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const scheduledEndMs = useMemo(() => {
    if (!slot) return null;
    const [h, m] = slot.startTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    return start.getTime() + slot.durationMinutes * 60000;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.startTime, slot?.durationMinutes]);

  const msRemaining = scheduledEndMs != null ? scheduledEndMs - Date.now() : 0;
  const canEnd = scheduledEndMs != null && msRemaining <= 0;

  async function handleEndLesson() {
    if (!scheduleSlotId) return;
    setErr("");
    setEnding(true);
    try {
      // Dars davomida belgilangan davomat shu yerda, dars tugagach bir
      // martada yuboriladi — o'qituvchi teginmagan o'quvchiga hech narsa
      // tegilmaydi (paket ham yechilmaydi).
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }));
      if (records.length > 0) {
        await markAttendance.mutateAsync({ scheduleSlotId, date: todayStr(), records });
      }
      await endLesson.mutateAsync({ scheduleSlotId });
      clearStagedAttendance(scheduleSlotId, todayStr());
      navigate("/teacher");
    } catch {
      setErr("Darsni tugatishda xatolik yuz berdi");
      setEnding(false);
    }
  }

  // O'qituvchi "Darsni tugatish"ni bosmasa, rejalashtirilgan tugash
  // vaqtidan 1 soat o'tgach, brauzer ochiq bo'lsa shu yerdan o'zi
  // yuboradi (localStorage'dagi davomat bilan birga) — serverdagi
  // lesson-auto-end-sweep esa brauzer yopiq bo'lsa ham darsni yopadi,
  // lekin u davomatdan bexabar (u faqat shu sahifada saqlanadi).
  const AUTO_END_GRACE_MS = 60 * 60_000;
  useEffect(() => {
    if (!scheduleSlotId || !scheduledEndMs || ending || slot?.isEnded) return;
    if (Date.now() >= scheduledEndMs + AUTO_END_GRACE_MS) {
      handleEndLesson();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, scheduleSlotId, scheduledEndMs, ending, slot?.isEnded]);

  const displayName = slot ? (slot.lessonType !== "guruh" ? (slot.customName ?? "Dars") : (slot.groupName ?? "Dars")) : "";

  if (schedLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>;
  }

  if (!slot) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
        Dars topilmadi.
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => navigate("/teacher")}>← Bosh sahifaga qaytish</button>
        </div>
      </div>
    );
  }

  return (
    <div className="live-lesson-page" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="live-lesson-header" style={{
        borderRadius: 18,
        background: "linear-gradient(135deg, #059669 0%, #047857 55%, #065f46 100%)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <button className="btn" style={{ background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", marginBottom: 12, padding: "4px 12px", fontSize: 12 }}
            onClick={() => navigate("/teacher")}>
            ← Orqaga
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", opacity: 0.85, textTransform: "uppercase" }}>
              Jonli dars
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{displayName}</div>
          <div style={{ fontSize: 13.5, opacity: 0.85, marginTop: 4 }}>
            {slot.startTime.slice(0, 5)} · {students.length} o'quvchi
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {slot.isOnline && (slot.meetingUrl || slot.teacherDefaultMeetingUrl) && (
              <button className="btn" style={{ background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.35)", color: "#fff" }}
                onClick={() => window.open((slot.meetingUrl || slot.teacherDefaultMeetingUrl)!, "_blank", "noreferrer")}>
                🎥 Darsga kirish
              </button>
            )}
            <button className="btn primary" style={{ background: canEnd ? "#fff" : "rgba(255,255,255,.3)", color: "#065f46", cursor: canEnd ? "pointer" : "not-allowed" }}
              disabled={!canEnd || ending}
              title={canEnd ? "" : "Dars rejalashtirilgan vaqti tugamaguncha yakunlab bo'lmaydi"}
              onClick={handleEndLesson}>
              ⏹ {ending ? "Tugatilmoqda..." : "Darsni tugatish"}
            </button>
          </div>
          {!canEnd && (
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.18)",
              padding: "4px 12px", borderRadius: 8, fontVariantNumeric: "tabular-nums",
            }}>
              ⏱ Tugashiga: {fmtCountdown(msRemaining)}
            </div>
          )}
        </div>
      </div>

      {err && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 16 }}>
          {err}
        </div>
      )}

      {scheduleSlotId && (
        <AttendanceJournal
          scheduleSlotId={scheduleSlotId}
          students={students}
          attendance={attendance}
          onSetStatus={setStatus}
        />
      )}

      <div style={{ marginTop: 16, color: "var(--text-faint)", fontSize: 13.5 }}>
        Uy vazifasi berish "Uy vazifalari" bo'limidagi bugungi guruh kartasi orqali amalga oshiriladi.
      </div>
    </div>
  );
}
