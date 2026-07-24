import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTodaySchedule, useGroupStudents,
  useEndLesson, useJoinTeacherLesson,
} from "../../lib/queries.js";

function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TLiveLessonPage() {
  const { scheduleSlotId } = useParams<{ scheduleSlotId: string }>();
  const navigate = useNavigate();

  const { data: todaySchedule, isLoading: schedLoading } = useTodaySchedule();
  const slot = todaySchedule?.find((s) => s.id === scheduleSlotId) ?? null;

  const joinTeacherLesson = useJoinTeacherLesson();
  const endLesson = useEndLesson();

  const { data: students = [] } = useGroupStudents(slot?.groupId ?? null);

  const [ending, setEnding] = useState(false);
  const [err, setErr] = useState("");

  // Sahifaga kirilganda dars "boshlangan" deb belgilanadi (agar hali belgilanmagan bo'lsa) —
  // backend ON CONFLICT DO NOTHING ishlatgani uchun qayta chaqirish xavfsiz.
  useEffect(() => {
    if (scheduleSlotId && slot && !slot.isStarted) {
      joinTeacherLesson.mutate(scheduleSlotId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSlotId, slot?.isStarted]);

  // Sekundiga yangilanadi — tugash sanog'i sahifani yangilamasdan real vaqtda ko'rinishi kerak.
  const [, setTick] = useState(0);
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
      await endLesson.mutateAsync({ scheduleSlotId });
      navigate("/teacher");
    } catch {
      setErr("Darsni tugatishda xatolik yuz berdi");
      setEnding(false);
    }
  }

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
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        borderRadius: 18, padding: "20px 24px",
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
            {slot.isOnline && slot.meetingUrl && (
              <button className="btn" style={{ background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.35)", color: "#fff" }}
                onClick={() => window.open(slot.meetingUrl!, "_blank", "noreferrer")}>
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

      <div style={{ marginTop: 16, color: "var(--text-faint)", fontSize: 13.5 }}>
        Davomat va uy vazifasi berish "Uy vazifalari" bo'limidagi bugungi guruh kartasi orqali amalga oshiriladi.
      </div>
    </div>
  );
}
