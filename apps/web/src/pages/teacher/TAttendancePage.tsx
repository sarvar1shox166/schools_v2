import { useEffect, useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  useTeacherSchedule, useGroupStudents, useAttendance, useMarkAttendance,
  useAttendanceHistoryMatrix,
} from "../../lib/queries.js";

type AttStatus = "p" | "l" | "a" | "ae";

const STATUS_CONFIG: Record<AttStatus, { label: string; icon: string; bg: string; color: string; border: string; title: string }> = {
  p:  { label: "✓", icon: "✓", bg: "#d1fae5", color: "#059669", border: "#059669", title: "Keldi" },
  l:  { label: "–", icon: "–", bg: "#fef3c7", color: "#d97706", border: "#d97706", title: "Kechikdi" },
  a:  { label: "✗", icon: "✗", bg: "#fee2e2", color: "#dc2626", border: "#dc2626", title: "Kelmadi" },
  ae: { label: "S", icon: "S", bg: "#e0e7ff", color: "#4338ca", border: "#4338ca", title: "Sababli" },
};

const AVATAR_COLORS = [
  "#6366f1","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#ec4899","#14b8a6",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

export default function TAttendancePage() {
  const { data: scheduleData, isLoading: schedLoading } = useTeacherSchedule();
  const groups = scheduleData?.groups ?? [];
  const slots = scheduleData?.slots ?? [];

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;
  const effectiveGroupId = activeGroup?.id ?? null;

  // Slots for the active group
  const groupSlots = slots.filter((s) => s.groupId === effectiveGroupId);

  // Pick slot matching the selected date's day-of-week (DB: 0=Monday...6=Sunday)
  const selectedDow = (new Date(date + "T00:00:00").getDay() + 6) % 7;
  const activeSlot = groupSlots.find((s) => s.dayOfWeek === selectedDow) ?? groupSlots[0] ?? null;

  const { data: students = [], isLoading: studLoading } = useGroupStudents(effectiveGroupId);
  const { data: existingAtt = [] } = useAttendance(activeSlot?.id ?? null, date);
  const markAttendance = useMarkAttendance();
  const { data: history } = useAttendanceHistoryMatrix(effectiveGroupId, 5);

  const [attMap, setAttMap] = useState<Record<string, AttStatus>>({});
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [excusedInput, setExcusedInput] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize attendance from existing records
  useEffect(() => {
    const init: Record<string, AttStatus> = {};
    for (const s of students) init[s.id] = "p";
    for (const r of existingAtt) init[r.studentId] = r.status as AttStatus;
    setAttMap(init);
  }, [students, existingAtt]);

  // When group changes, reset
  useEffect(() => {
    setSaved(false);
    setExcusedInput(null);
  }, [effectiveGroupId, date]);

  // Auto-select first group
  useEffect(() => {
    if (!activeGroupId && groups.length > 0) setActiveGroupId(groups[0].id);
  }, [groups, activeGroupId]);

  function changeAtt(id: string, status: AttStatus) {
    setAttMap((prev) => ({ ...prev, [id]: status }));
    if (status !== "ae") setExcusedInput(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!activeSlot) return;
    const records = students.map((s) => ({
      studentId: s.id,
      status: attMap[s.id] ?? "p",
      reason: attMap[s.id] === "ae" ? (reasonMap[s.id] || undefined) : undefined,
    }));
    await markAttendance.mutateAsync({ scheduleSlotId: activeSlot.id, date, records });
    setSaved(true);
  }

  const presentCount = students.filter((s) => attMap[s.id] === "p").length;
  const lateCount = students.filter((s) => attMap[s.id] === "l").length;
  const absentCount = students.filter((s) => attMap[s.id] === "a").length;
  const excusedCount = students.filter((s) => attMap[s.id] === "ae").length;
  const pct = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  if (schedLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)" }}>
        Sizga biriktirilgan guruh topilmadi.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, margin: 0 }}>Davomat belgilash</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Group tabs */}
          <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 10, padding: 3, gap: 2 }}>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: activeGroupId === g.id ? 700 : 500,
                  background: activeGroupId === g.id ? "#3b82f6" : "transparent",
                  color: activeGroupId === g.id ? "#fff" : "var(--text-faint)",
                  transition: "all 0.15s",
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <input
            type="date"
            className="inp"
            value={date}
            max={todayStr()}
            onChange={(e) => { setDate(e.target.value); setSaved(false); }}
            style={{ padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "58% 1fr", gap: 20, alignItems: "start" }}>
        {/* Main attendance card */}
        <Card style={{ borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="check-square" size={20} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {activeGroup?.name ?? "Guruh"} — {activeGroup?.studentsCount ?? 0} ta o'quvchi
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
                {formatDate(date)}
                {activeSlot ? ` · ${String(activeSlot.startTime).slice(0, 5)}` : ""}
              </div>
            </div>
          </div>

          {!activeSlot && (
            <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--text-faint)" }}>
              Bu guruh uchun jadval slot topilmadi
            </div>
          )}

          {studLoading && (
            <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--text-faint)" }}>
              O'quvchilar yuklanmoqda...
            </div>
          )}

          {activeSlot && !studLoading && students.length === 0 && (
            <div style={{ padding: "32px 22px", textAlign: "center", color: "var(--text-faint)" }}>
              Bu guruhda o'quvchilar yo'q
            </div>
          )}

          {activeSlot && !studLoading && students.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              {students.map((s, idx) => {
                const status = attMap[s.id] ?? "p";
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initials = s.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div key={s.id}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 22px", borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: avatarColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>
                        {initials}
                      </div>

                      <div style={{ flex: 1, fontWeight: 650, fontSize: 13.5 }}>{s.fullName}</div>

                      <div style={{ display: "flex", gap: 5 }}>
                        {(["p", "l", "a", "ae"] as const).map((k) => {
                          const cfg = STATUS_CONFIG[k];
                          const selected = status === k;
                          return (
                            <button
                              key={k}
                              title={cfg.title}
                              onClick={() => changeAtt(s.id, k)}
                              style={{
                                width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                                border: selected ? `1px solid ${cfg.border}` : "1px solid var(--border)",
                                background: selected ? cfg.bg : "var(--surface-2)",
                                color: selected ? cfg.color : "var(--text-faint)",
                                fontSize: 13, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.12s",
                              }}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reason input for excused */}
                    {status === "ae" && excusedInput === s.id && (
                      <div style={{ padding: "8px 22px 10px 70px", background: "#eef2ff" }}>
                        <input
                          className="inp"
                          placeholder="Sabab (ixtiyoriy)..."
                          style={{ width: "100%", fontSize: 12 }}
                          value={reasonMap[s.id] ?? ""}
                          onChange={(e) => setReasonMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        />
                      </div>
                    )}
                    {status === "ae" && excusedInput !== s.id && (
                      <div style={{ padding: "4px 22px 8px 70px", background: "#eef2ff" }}>
                        <button
                          style={{ fontSize: 12, color: "#4338ca", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          onClick={() => setExcusedInput(s.id)}
                        >
                          + Sabab qo'shish
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
            {/* Legend */}
            <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {(["p", "l", "a", "ae"] as const).map((k) => {
                const cfg = STATUS_CONFIG[k];
                return (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: cfg.color }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: cfg.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {cfg.title}
                  </span>
                );
              })}
            </div>

            <button style={{
              padding: "9px 20px", borderRadius: 10, border: "1px solid var(--border)",
              background: "#fff", color: "var(--text)", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
              onClick={() => { const init: Record<string, AttStatus> = {}; for (const s of students) init[s.id] = "p"; setAttMap(init); setSaved(false); }}>
              <span>↺</span> Qayta
            </button>
            <button
              disabled={!activeSlot || markAttendance.isPending}
              onClick={handleSave}
              style={{
                padding: "9px 24px", borderRadius: 10, border: "none",
                background: saved ? "#10b981" : "#3b82f6", color: "#fff",
                fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                opacity: !activeSlot ? 0.5 : 1,
              }}>
              {markAttendance.isPending ? "Saqlanmoqda..." : saved ? "✓ Saqlandi" : "✓ Saqlash"}
            </button>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats */}
          <Card style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="bar-chart-2" size={18} style={{ color: "#fff" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Bugungi statistika</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)" }}>
              {[
                { value: `${presentCount}/${students.length}`, label: "Keldilar", color: "#059669" },
                { value: String(lateCount),    label: "Kechikdi",  color: "#d97706" },
                { value: String(absentCount),  label: "Kelmadi",   color: "#dc2626" },
                { value: String(excusedCount), label: "Sababli",   color: "#4338ca" },
              ].map((item, i) => (
                <div key={i} style={{ background: "var(--surface)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Davomat</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
              </div>
            </div>
          </Card>

          {/* History (last 5 lessons) */}
          <Card style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="trending-up" size={18} style={{ color: "#fff" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Oxirgi {history?.dates.length ?? 0} dars</span>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {!history || history.dates.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
                  Hali davomat ma'lumoti yo'q
                </div>
              ) : (
                history.dates.map((d, i) => {
                  const total = history.students.length;
                  const present = history.students.filter((s) => s.days[i] === "p").length;
                  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                  return (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-faint)", width: 55, flexShrink: 0 }}>
                        {new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, width: 36, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
