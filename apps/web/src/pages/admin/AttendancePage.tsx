import { useState } from "react";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import {
  useGroups,
  useSchedule,
  useAttendanceStats,
  useAttendanceHistoryMatrix,
  useMarkAttendance,
  useStudents,
} from "../../lib/queries.js";

/* ─── Types ─── */
type AttStatus = "keldi" | "kech" | "kelmadi";

/* status config */
const ST: Record<AttStatus, { icon: string; bg: string; color: string }> = {
  keldi:   { icon: "check", bg: "#dcfce7", color: "#16a34a" },
  kech:    { icon: "clock", bg: "#fef3c7", color: "#d97706" },
  kelmadi: { icon: "x",    bg: "#fee2e2", color: "#ef4444" },
};

const API_TO_LOCAL: Record<"p" | "a" | "l", AttStatus> = {
  p: "keldi",
  a: "kelmadi",
  l: "kech",
};

const LOCAL_TO_API: Record<AttStatus, "p" | "a" | "l"> = {
  keldi:   "p",
  kelmadi: "a",
  kech:    "l",
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/* ─── Page ─── */
export default function AttendancePage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showModal, setShowModal]             = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: groups = [], isLoading: grpLoading } = useGroups();
  const { data: attStats } = useAttendanceStats(today);
  const { data: matrix, isLoading: matLoading } = useAttendanceHistoryMatrix(selectedGroupId, 8);

  /* When groups load, auto-select the first */
  const activeGroupId = selectedGroupId ?? (groups[0]?.id ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Davomat jurnali
        </h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="check" size={15} /> Davomat belgilash
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="percent" tone="s"
          value={attStats ? `${attStats.avgPercent}%` : "–"}
          label="O'rtacha davomat"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>Bugun</span>}
        />
        <StatCard icon="check" tone="i"
          value={attStats ? String(attStats.present) : "–"}
          label="Kelganlar"
        />
        <StatCard icon="clock" tone="w"
          value={attStats ? String(attStats.late) : "–"}
          label="Kechikkanlar"
        />
        <StatCard icon="x" tone="d"
          value={attStats ? String(attStats.absent) : "–"}
          label="Kelmaganlar"
        />
      </div>

      {/* Group selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dim)" }}>Guruh:</span>
        {grpLoading ? (
          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>Yuklanmoqda...</span>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                style={{
                  padding: "5px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: activeGroupId === g.id ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                  background: activeGroupId === g.id ? "var(--accent)" : "transparent",
                  color: activeGroupId === g.id ? "#fff" : "var(--text-dim)",
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal */}
      <Card style={{ padding: 0 }}>
        <CardHead
          icon="calendar"
          title="Davomat jadvali"
          sub={matrix ? `Oxirgi ${matrix.dates.length} dars` : "Guruh tanlanmagan"}
        />

        {matLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : !matrix || matrix.students.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
            {activeGroupId ? "Ma'lumot topilmadi" : "Guruhni tanlang"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>O'QUVCHI</th>
                  {matrix.dates.map(d => (
                    <th key={d} style={{ textAlign: "center", minWidth: 60 }}>{fmtDate(d)}</th>
                  ))}
                  <th style={{ textAlign: "center", minWidth: 60 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {matrix.students.map(row => {
                  const pctColor = row.percent >= 80 ? "#16a34a" : row.percent >= 60 ? "#b45309" : "#ef4444";
                  return (
                    <tr key={row.studentId}>
                      <td>
                        <div className="with-av">
                          <div style={{ borderRadius: 9, flexShrink: 0, display: "inline-flex" }}><Avatar name={row.fullName} size="sm" /></div>
                          <span className="cell-main">{row.fullName}</span>
                        </div>
                      </td>
                      {row.days.map((day, i) => {
                        const local: AttStatus | null = day ? API_TO_LOCAL[day] : null;
                        if (!local) {
                          return (
                            <td key={i} style={{ textAlign: "center" }}>
                              <div style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 32, borderRadius: 8,
                                background: "var(--surface-3)", color: "var(--text-faint)",
                                fontSize: 11,
                              }}>–</div>
                            </td>
                          );
                        }
                        const cfg = ST[local];
                        return (
                          <td key={i} style={{ textAlign: "center" }}>
                            <div style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 32, height: 32, borderRadius: 8,
                              background: cfg.bg, color: cfg.color,
                            }}>
                              <Icon name={cfg.icon} size={14} />
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px",
                          borderRadius: 99, background: pctColor + "1a",
                          color: pctColor, fontWeight: 800, fontSize: 13,
                        }}>
                          {row.percent} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <MarkModal
          groups={groups}
          initialGroupId={activeGroupId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Mark attendance modal ─── */
function MarkModal({
  groups,
  initialGroupId,
  onClose,
}: {
  groups: { id: string; name: string }[];
  initialGroupId: string | null;
  onClose: () => void;
}) {
  const [groupId, setGroupId] = useState(initialGroupId ?? groups[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  const [err, setErr] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });

  const { data: schedule = [] } = useSchedule();
  const { data: students = [], isLoading: stuLoading } = useStudents();
  const markAtt = useMarkAttendance();

  /* Get slot for the selected group (any slot — take first matching today's day) */
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Mon (DB convention)
  const slot = schedule.find(s => s.groupId === groupId && s.dayOfWeek === todayDow)
    ?? schedule.find(s => s.groupId === groupId);

  /* Filter students to the selected group */
  const groupStudents = students.filter(s => s.groups.some(g => g.id === groupId));

  function setStatus(id: string, s: AttStatus) {
    setStatuses(prev => ({ ...prev, [id]: s }));
  }

  async function handleSave() {
    if (!slot) { setErr("Bu guruh uchun jadval topilmadi"); return; }
    setErr("");
    try {
      const records = groupStudents.map(s => ({
        studentId: s.id,
        status: LOCAL_TO_API[statuses[s.id] ?? "keldi"],
      }));
      await markAtt.mutateAsync({ scheduleSlotId: slot.id, date: today, records });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Davomat belgilash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Guruh selector + date */}
        <div style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dim)" }}>Guruh:</span>
            <div style={{ position: "relative" }}>
              <select
                className="inp"
                value={groupId}
                onChange={e => { setGroupId(e.target.value); setStatuses({}); }}
                style={{ appearance: "none", paddingRight: 30, minWidth: 160, fontWeight: 700 }}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <Icon name="chevronDown" size={13} style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)",
              }} />
            </div>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 600 }}>{dateStr}</span>
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Students */}
        <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {stuLoading && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 12 }}>Yuklanmoqda...</div>
          )}
          {!stuLoading && groupStudents.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 12 }}>Bu guruhda o'quvchilar topilmadi</div>
          )}
          {groupStudents.map(s => {
            const cur = statuses[s.id] ?? "keldi";
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface-2)",
              }}>
                <div style={{ borderRadius: 10, flexShrink: 0, display: "inline-flex" }}><Avatar name={s.fullName} size="sm" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.fullName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{s.level ?? ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <AttBtn label="Keldi"   icon="check" status="keldi"   active={cur === "keldi"}   onClick={() => setStatus(s.id, "keldi")}   />
                  <AttBtn label="Kech"    icon="clock" status="kech"    active={cur === "kech"}    onClick={() => setStatus(s.id, "kech")}    />
                  <AttBtn label="Kelmadi" icon="x"     status="kelmadi" active={cur === "kelmadi"} onClick={() => setStatus(s.id, "kelmadi")} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {err && (
          <div style={{ padding: "12px 24px 0", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, padding: "18px 24px" }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button
            className="btn primary"
            style={{ flex: 2, justifyContent: "center" }}
            onClick={handleSave}
            disabled={markAtt.isPending}
          >
            <Icon name="check" size={15} />
            {markAtt.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttBtn({ label, icon, status, active, onClick }: {
  label: string; icon: string; status: AttStatus; active: boolean; onClick: () => void;
}) {
  const cfg = ST[status];
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 8,
        border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
        background: active ? cfg.bg : "transparent",
        color: active ? cfg.color : "var(--text-faint)",
        fontWeight: 700, fontSize: 12.5, cursor: "pointer",
        transition: "all .15s",
      }}
    >
      <Icon name={icon} size={12} /> {label}
    </button>
  );
}
