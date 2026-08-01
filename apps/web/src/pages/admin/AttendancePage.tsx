import { useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import {
  useGroups,
  useSchedule,
  useAttendanceStats,
  useAttendanceHistoryMatrix,
  useMarkAttendance,
  useStudents,
  useTeacherAttendanceStats,
  useTeacherAttendanceHistoryMatrix,
  useDaySlots,
  useMarkTeacherAttendance,
  useCreateScheduleException,
  useUnresolvedAbsences,
  type DaySlot,
  type UnresolvedAbsence,
} from "../../lib/queries.js";

/* ─── Types ─── */
type AttStatus = "keldi" | "kech" | "kelmadi";
type Tab = "student" | "teacher";

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

/* Hafta kuni: Yak(6) Du(0) Se(1) Chor(2) Pay(3) Ju(4) Sha(5) — DB convention 0=Mon..6=Sun */
const DOW_ORDER = [6, 0, 1, 2, 3, 4, 5];
const DOW_LABEL: Record<number, string> = { 0: "Du", 1: "Se", 2: "Chor", 3: "Pay", 4: "Ju", 5: "Sha", 6: "Yak" };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function todayDow() {
  return (new Date().getDay() + 6) % 7;
}

/** Shu hafta kunining eng yaqin o'tgan (yoki bugungi) sanasi */
function dateForDow(dow: number): string {
  const now = new Date();
  const diff = (todayDow() - dow + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function slotLabel(slot: DaySlot) {
  return slot.lessonType !== "guruh" ? (slot.customName ?? "Dars") : (slot.groupName ?? "Dars");
}

/* ─── Page ─── */
export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("student");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showModal, setShowModal] = useState(false);
  const [resolvingAbsence, setResolvingAbsence] = useState<UnresolvedAbsence | null>(null);

  const today = todayStr();
  const isToday = selectedDate === today;

  const { data: groups = [], isLoading: grpLoading } = useGroups();
  const { data: attStats } = useAttendanceStats(selectedDate);
  const { data: teacherStats } = useTeacherAttendanceStats(selectedDate);
  const { data: matrix, isLoading: matLoading } = useAttendanceHistoryMatrix(selectedGroupId, 8);
  const { data: teacherMatrix, isLoading: teacherMatLoading } = useTeacherAttendanceHistoryMatrix(8);
  const { data: daySlotsData } = useDaySlots(selectedDate);
  const { data: unresolvedAbsences = [] } = useUnresolvedAbsences();

  /* When groups load, auto-select the first */
  const activeGroupId = selectedGroupId ?? (groups[0]?.id ?? null);
  const daySlots = daySlotsData?.slots ?? [];
  const stats = tab === "student" ? attStats : teacherStats;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Davomat jurnali
        </h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="check" size={15} /> Davomat belgilash
        </button>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setTab("student")}
          style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            border: "none",
            background: tab === "student" ? "var(--accent)" : "var(--surface-2)",
            color: tab === "student" ? "#fff" : "var(--text-dim)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Icon name="user" size={14} /> O'quvchilar
        </button>
        <button
          onClick={() => setTab("teacher")}
          style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            border: "none",
            background: tab === "teacher" ? "var(--accent)" : "var(--surface-2)",
            color: tab === "teacher" ? "#fff" : "var(--text-dim)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Icon name="teacher" size={14} /> O'qituvchilar
          {unresolvedAbsences.length > 0 && (
            <span style={{
              background: "#ef4444", color: "#fff", fontSize: 10.5, fontWeight: 800,
              borderRadius: 99, padding: "1px 6px", minWidth: 16, textAlign: "center",
            }}>
              {unresolvedAbsences.length}
            </span>
          )}
        </button>
      </div>

      {/* Hal qilinmagan "kelmadi" belgilar — bekor qilish/ko'chirish kutmoqda */}
      {tab === "teacher" && unresolvedAbsences.length > 0 && (
        <Card style={{ padding: 0, borderColor: "rgba(239,68,68,.35)" }}>
          <div style={{
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: "rgba(239,68,68,.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="alert" size={16} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Hal qilinmagan darslar</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                O'qituvchi "kelmadi" deb belgilangan, lekin dars hali bekor qilinmagan yoki ko'chirilmagan
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {unresolvedAbsences.map((a) => (
              <div key={`${a.scheduleSlotId}:${a.date}`} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{a.groupLabel}</span>
                  <span style={{ color: "var(--text-faint)" }}> · {a.teacherName} · {fmtDate(a.date)} {a.startTime.slice(0, 5)}</span>
                </div>
                <button className="btn" style={{ fontSize: 12.5, padding: "6px 14px" }} onClick={() => setResolvingAbsence(a)}>
                  Hal qilish
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Day of week strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {DOW_ORDER.map((dow) => {
          const active = dateForDow(dow) === selectedDate;
          const isTodayDow = dow === todayDow();
          return (
            <button
              key={dow}
              onClick={() => setSelectedDate(dateForDow(dow))}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
                border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#fff" : "var(--text-dim)",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {DOW_LABEL[dow]}
              {isTodayDow && <span style={{ fontSize: 10, opacity: 0.85 }}>• Bugun</span>}
            </button>
          );
        })}
      </div>

      {/* Lesson chips for selected day */}
      {daySlots.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {daySlots.map((s) => {
            const local: AttStatus | null = s.status ? API_TO_LOCAL[s.status] : null;
            const cfg = local ? ST[local] : null;
            return (
              <div key={s.scheduleSlotId} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 10,
                border: cfg ? `1px solid ${cfg.color}44` : "1px solid var(--border)",
                background: cfg ? `${cfg.bg}` : "var(--surface-2)",
                fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)",
              }}>
                {cfg ? (
                  <Icon name={cfg.icon} size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                )}
                <span>{slotLabel(s)}</span>
                {s.teacherName && <span style={{ color: "var(--text-faint)" }}>· {s.teacherName}</span>}
                <span style={{ color: "var(--text-faint)" }}>· {s.startTime.slice(0, 5)}</span>
                {s.lessonType === "guruh" && <span style={{ color: "var(--text-faint)" }}>· {s.studentsCount} o'q</span>}
                {!cfg && <span style={{ color: "var(--text-faint)", fontStyle: "italic" }}>· belgilanmagan</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="percent" tone="s"
          value={stats ? `${stats.avgPercent}%` : "–"}
          label="O'rtacha davomat"
          delta={isToday ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>Bugun</span> : undefined}
        />
        <StatCard icon="check" tone="i"
          value={stats ? String(stats.present) : "–"}
          label="Kelganlar"
        />
        <StatCard icon="clock" tone="w"
          value={stats ? String(stats.late) : "–"}
          label="Kechikkanlar"
        />
        <StatCard icon="x" tone="d"
          value={stats ? String(stats.absent) : "–"}
          label="Kelmaganlar"
        />
      </div>

      {tab === "student" ? (
        <>
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
              title="O'quvchilar davomati"
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
        </>
      ) : (
        <Card style={{ padding: 0 }}>
          <CardHead
            icon="calendar"
            title="O'qituvchilar davomati"
            sub={teacherMatrix ? `Oxirgi ${teacherMatrix.dates.length} ish kuni` : ""}
          />

          {teacherMatLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : !teacherMatrix || teacherMatrix.rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Ma'lumot topilmadi</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ minWidth: 950 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 180 }}>O'QITUVCHI</th>
                    <th style={{ minWidth: 130 }}>GURUH</th>
                    {teacherMatrix.dates.map(d => (
                      <th key={d} style={{ textAlign: "center", minWidth: 60 }}>{fmtDate(d)}</th>
                    ))}
                    <th style={{ textAlign: "center", minWidth: 60 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherMatrix.rows.map((row, idx) => {
                    const pctColor = row.percent >= 80 ? "#16a34a" : row.percent >= 60 ? "#b45309" : "#ef4444";
                    const sameTeacherAsPrev = idx > 0 && teacherMatrix.rows[idx - 1].teacherId === row.teacherId;
                    return (
                      <tr key={row.scheduleSlotId}>
                        <td style={{ borderTop: sameTeacherAsPrev ? "none" : undefined }}>
                          {sameTeacherAsPrev ? null : (
                            <div className="with-av">
                              <div style={{ borderRadius: 9, flexShrink: 0, display: "inline-flex" }}><Avatar name={row.fullName} size="sm" /></div>
                              <span className="cell-main">{row.fullName}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--text-faint)" }}>{row.groupLabel}</td>
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
      )}

      {showModal && tab === "student" && (
        <MarkModal
          groups={groups}
          initialGroupId={activeGroupId}
          initialDate={selectedDate}
          onClose={() => setShowModal(false)}
        />
      )}

      {showModal && tab === "teacher" && (
        <TeacherMarkModal
          date={selectedDate}
          onClose={() => setShowModal(false)}
        />
      )}

      {resolvingAbsence && (
        <ResolveAbsenceModal
          scheduleSlotId={resolvingAbsence.scheduleSlotId}
          date={resolvingAbsence.date}
          defaultTime={resolvingAbsence.startTime.slice(0, 5)}
          label={`${resolvingAbsence.groupLabel} — ${resolvingAbsence.teacherName}`}
          onClose={() => setResolvingAbsence(null)}
        />
      )}
    </div>
  );
}

/* ─── Mark attendance modal (students) ─── */
function MarkModal({
  groups,
  initialGroupId,
  initialDate,
  onClose,
}: {
  groups: { id: string; name: string }[];
  initialGroupId: string | null;
  initialDate: string;
  onClose: () => void;
}) {
  const [groupId, setGroupId] = useState(initialGroupId ?? groups[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  const [err, setErr] = useState("");

  const today = todayStr();
  const [date, setDate] = useState(initialDate);

  const { data: schedule = [] } = useSchedule();
  const { data: students = [], isLoading: stuLoading } = useStudents();
  const markAtt = useMarkAttendance();

  /* Get slot for the selected group, matching the selected date's day of week.
     No fallback to "any slot for this group" — that would silently mark attendance
     against the wrong day's slot if the chosen date doesn't actually have a lesson. */
  const selectedDow = (new Date(date + "T00:00:00").getDay() + 6) % 7; // 0=Mon (DB convention)
  const slot = schedule.find(s => s.groupId === groupId && s.dayOfWeek === selectedDow);

  /* Filter students to the selected group */
  const groupStudents = students.filter(s => s.groups.some(g => g.id === groupId));

  function setStatus(id: string, s: AttStatus) {
    setStatuses(prev => ({ ...prev, [id]: s }));
  }

  async function handleSave() {
    if (!slot) { setErr("Bu guruhda tanlangan sanada (hafta kunida) dars yo'q"); return; }
    setErr("");
    try {
      const records = groupStudents.map(s => ({
        studentId: s.id,
        status: LOCAL_TO_API[statuses[s.id] ?? "keldi"],
      }));
      await markAtt.mutateAsync({ scheduleSlotId: slot.id, date, records });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return createPortal(
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
        <div style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
          <input
            type="date"
            className="inp"
            value={date}
            max={today}
            onChange={e => { if (e.target.value) setDate(e.target.value); }}
            style={{ fontSize: 13, fontWeight: 600, padding: "6px 10px" }}
          />
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {!slot && (
          <div style={{
            margin: "12px 24px 0", padding: "10px 12px", borderRadius: 8,
            background: "color-mix(in oklab, var(--danger) 10%, var(--surface))",
            color: "var(--danger)", fontSize: 13, fontWeight: 600,
          }}>
            Bu guruhda tanlangan sanada (hafta kunida) dars yo'q — boshqa sana tanlang
          </div>
        )}

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
                flexWrap: "wrap", rowGap: 8,
                padding: "12px 14px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface-2)",
              }}>
                <div style={{ borderRadius: 10, flexShrink: 0, display: "inline-flex" }}><Avatar name={s.fullName} size="sm" /></div>
                <div style={{ flex: 1, minWidth: 120 }}>
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
    </div>,
    document.body
  );
}

/* ─── Mark attendance modal (teachers) ─── */
function TeacherMarkModal({ date, onClose }: { date: string; onClose: () => void }) {
  const { data, isLoading } = useDaySlots(date);
  const markTeacherAtt = useMarkTeacherAttendance();
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [resolvingSlot, setResolvingSlot] = useState<DaySlot | null>(null);

  const slots = data?.slots ?? [];
  const dayLabel = DOW_LABEL[data?.dayOfWeek ?? todayDow()];

  // Har bir ustoz mustaqil, bosilgan zahoti saqlanadi — boshqalarga ta'sir qilmaydi.
  async function setStatus(s: DaySlot, status: AttStatus) {
    if (!s.teacherId) return;
    setErr("");
    setStatuses(prev => ({ ...prev, [s.scheduleSlotId]: status }));
    setSavingId(s.scheduleSlotId);
    try {
      await markTeacherAtt.mutateAsync({
        date,
        records: [{ scheduleSlotId: s.scheduleSlotId, teacherId: s.teacherId, status: LOCAL_TO_API[status] }],
      });
      // "Kelmadi" belgilanganda darhol taklif qilamiz: bekor qilinsinmi yoki
      // ko'chirilsinmi (2-variant — ixtiyoriy, "Keyinroq" bosilsa ham davomat
      // to'g'ri saqlanib qoladi, faqat "hal qilinmagan" ro'yxatida ko'rinadi).
      if (status === "kelmadi") setResolvingSlot(s);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSavingId(null);
    }
  }

  return createPortal(
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
        <div style={{ padding: "22px 24px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>O'qituvchilar — {dayLabel} davomati</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "0 24px 16px", fontSize: 13, color: "var(--text-faint)" }}>
          {dayLabel} kuni darsi bor o'qituvchilar
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Teachers */}
        <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 12 }}>Yuklanmoqda...</div>
          )}
          {!isLoading && slots.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 12 }}>Bu kunga rejalashtirilgan dars topilmadi</div>
          )}
          {slots.map(s => {
            // Belgilanmagan bo'lsa — hech qaysi tugma aktiv ko'rinmaydi (majburiy tanlov yo'q).
            const cur = statuses[s.scheduleSlotId] ?? (s.status ? API_TO_LOCAL[s.status] : undefined);
            const isSaving = savingId === s.scheduleSlotId;
            return (
              <div key={s.scheduleSlotId} style={{
                display: "flex", alignItems: "center", gap: 12,
                flexWrap: "wrap", rowGap: 8,
                padding: "12px 14px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface-2)",
                opacity: isSaving ? 0.6 : 1,
              }}>
                <div style={{ borderRadius: 10, flexShrink: 0, display: "inline-flex" }}>
                  <Avatar name={s.teacherName ?? "?"} size="sm" />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.teacherName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {s.teacherTitle ?? s.teacherSpec ?? ""} · {slotLabel(s)}({s.startTime.slice(0, 5)})
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <AttBtn label="Keldi"   icon="check" status="keldi"   active={cur === "keldi"}   onClick={() => setStatus(s, "keldi")}   />
                  <AttBtn label="Kech"    icon="clock" status="kech"    active={cur === "kech"}    onClick={() => setStatus(s, "kech")}    />
                  <AttBtn label="Kelmadi" icon="x"     status="kelmadi" active={cur === "kelmadi"} onClick={() => setStatus(s, "kelmadi")} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {err && (
          <div style={{ padding: "12px 24px 0", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>
        )}

        <div style={{ padding: "12px 24px", fontSize: 12, color: "var(--text-faint)" }}>
          Har bir ustoz mustaqil — bosgan zahotingiz saqlanadi, boshqalariga ta'sir qilmaydi.
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, padding: "0 24px 18px" }}>
          <button className="btn primary" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>

      {resolvingSlot && (
        <ResolveAbsenceModal
          scheduleSlotId={resolvingSlot.scheduleSlotId}
          date={date}
          defaultTime={resolvingSlot.startTime.slice(0, 5)}
          label={`${slotLabel(resolvingSlot)} — ${resolvingSlot.teacherName ?? ""}`}
          onClose={() => setResolvingSlot(null)}
        />
      )}
    </div>,
    document.body
  );
}

/* ─── O'qituvchi kelmagan darsni hal qilish: bekor qilish yoki ko'chirish ─── */
function ResolveAbsenceModal({ scheduleSlotId, date, defaultTime, label, onClose }: {
  scheduleSlotId: string; date: string; defaultTime: string; label: string; onClose: () => void;
}) {
  const createException = useCreateScheduleException();
  const [action, setAction] = useState<"cancelled" | "rescheduled">("cancelled");
  const [newDate, setNewDate] = useState(date);
  const [newTime, setNewTime] = useState(defaultTime);
  const [reason, setReason] = useState("O'qituvchi kelmadi");
  const [err, setErr] = useState("");

  async function handleSubmit() {
    setErr("");
    try {
      if (action === "cancelled") {
        await createException.mutateAsync({ scheduleSlotId, date, kind: "cancelled", reason: reason || undefined });
      } else {
        await createException.mutateAsync({
          scheduleSlotId, date, kind: "rescheduled",
          newDate, newStartTime: newTime, reason: reason || undefined,
        });
      }
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 260,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18, width: 420, maxWidth: "100%",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)", padding: 22,
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
          Dars bekor qilinsinmi yoki ko'chirilsinmi?
        </div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 18 }}>
          {label} — {fmtDate(date)}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["cancelled", "rescheduled"] as const).map((a) => (
            <button key={a} onClick={() => setAction(a)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer",
                border: action === a ? "none" : "1px solid var(--border)",
                background: action === a ? "var(--accent)" : "var(--surface-2)",
                color: action === a ? "#fff" : "var(--text-dim)",
                fontWeight: 700, fontSize: 12.5,
              }}>
              {a === "cancelled" ? "Bekor qilish" : "Ko'chirish"}
            </button>
          ))}
        </div>

        {action === "rescheduled" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>YANGI SANA</label>
              <input className="inp" type="date" style={{ width: "100%" }} value={newDate}
                onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>YANGI VAQT</label>
              <input className="inp" type="time" style={{ width: "100%" }} value={newTime}
                onChange={(e) => setNewTime(e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>SABAB</label>
          <input className="inp" style={{ width: "100%" }} value={reason}
            onChange={(e) => setReason(e.target.value)} />
        </div>

        {err && (
          <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Keyinroq</button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
            disabled={createException.isPending} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {createException.isPending ? "Saqlanmoqda..." : "Tasdiqlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
