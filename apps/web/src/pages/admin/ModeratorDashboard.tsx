import { useEffect, useMemo, useState } from "react";
import { Avatar, Card, CardHead, Icon } from "@chess-school/ui";
import { useTodaySchedule } from "../../lib/queries.js";
import { useAuthStore } from "../../lib/auth-store.js";

function nowMins(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

type LessonStatus = "live" | "upcoming" | "done";

function lessonStatus(startTime: string, durationMinutes: number | undefined, isEnded: boolean | undefined, nm: number): LessonStatus {
  const [h, m] = startTime.split(":").map(Number);
  const start = h * 60 + m;
  const dur = durationMinutes ?? 90;
  if (isEnded) return "done";
  if (nm >= start && nm < start + dur) return "live";
  if (nm < start) return "upcoming";
  return "done";
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  live: "HOZIR DAVOM ETMOQDA",
  upcoming: "Kutilmoqda",
  done: "Tugadi",
};

export default function ModeratorDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: todaySchedule, isLoading } = useTodaySchedule();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const nm = nowMins();
  const lessons = useMemo(() => {
    return [...(todaySchedule ?? [])]
      .map((s) => ({ ...s, status: lessonStatus(s.startTime, s.durationMinutes, s.isEnded, nm) }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySchedule, tick]);

  const liveCount = lessons.filter((l) => l.status === "live").length;
  const todayLabel = new Date().toLocaleDateString("uz-UZ", { day: "numeric", month: "long", weekday: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <div style={{
        borderRadius: 20, padding: "24px 28px",
        background: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)",
        color: "#fff",
      }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Assalomu alaykum, {user?.fullName?.split(" ")[0] ?? "Moderator"}! 👋</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
          Bugun {todayLabel} — biriktirilgan o'qituvchilarning {lessons.length} ta darsi bor
          {liveCount > 0 && <> · <strong>{liveCount} tasi hozir davom etmoqda</strong></>}
        </div>
      </div>

      <Card>
        <CardHead icon="calendar" title="Bugungi darslar" sub="Faqat sizga biriktirilgan o'qituvchilar" />
        <div style={{ padding: "6px 0" }}>
          {isLoading && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
          )}
          {!isLoading && lessons.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Bugun biriktirilgan o'qituvchilarda dars yo'q
            </div>
          )}
          {lessons.map((l) => (
            <div key={l.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", borderBottom: "1px solid var(--border)",
              opacity: l.status === "done" ? 0.55 : 1,
            }}>
              <div style={{ width: 54, flexShrink: 0, fontWeight: 700, fontSize: 13, color: "var(--text-faint)" }}>
                {l.startTime.slice(0, 5)}
              </div>
              <Avatar name={l.teacherName ?? "?"} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {l.groupName ?? l.customName ?? "Dars"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                  {l.teacherName}{l.durationMinutes ? ` · ${l.durationMinutes} daqiqa` : ""}
                </div>
              </div>
              {l.status === "live" ? (
                <span style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 800, color: "#22c55e", letterSpacing: 0.4,
                }}>
                  <span style={{ position: "relative", width: 8, height: 8 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", animation: "modPulseDot 1.6s ease-out infinite" }} />
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e" }} />
                  </span>
                  {STATUS_LABEL.live}
                </span>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
                  padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,.06)", border: "1px solid var(--border)",
                }}>
                  {STATUS_LABEL[l.status]}
                </span>
              )}
              {l.status === "live" && l.meetingUrl && l.meetingUrl !== "null" && (
                <button className="btn primary" style={{ background: "#22c55e", border: "none", flexShrink: 0 }}
                  onClick={() => window.open(l.meetingUrl!, "_blank", "noreferrer")}>
                  <Icon name="video" size={14} />
                  {l.meetingPlatform === "meet" ? "Meet ga kirish" : "Zoom ga kirish"}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <style>{`@keyframes modPulseDot { 0% { transform: scale(1); opacity: .6; } 70%,100% { transform: scale(2.6); opacity: 0; } }`}</style>
    </div>
  );
}
