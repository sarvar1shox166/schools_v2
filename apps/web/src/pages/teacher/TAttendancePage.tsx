import { useMemo, useState } from "react";
import { Avatar, Card, Icon, PageHead, StatCard } from "@chess-school/ui";
import {
  useAttendance,
  useAttendanceStats,
  useMarkAttendance,
  useMyLessons,
  useMyStudents,
  useMyTeacherSchedule,
} from "../../lib/queries.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TAttendancePage() {
  const { data: schedule } = useMyTeacherSchedule();
  const { data: myStudents } = useMyStudents();
  const { data: lessons } = useMyLessons();
  const { data: stats } = useAttendanceStats();

  const groups = schedule?.groups ?? [];
  const [groupId, setGroupId] = useState<string | null>(null);
  const activeGroupId = groupId ?? groups[0]?.id ?? null;

  const slot = useMemo(
    () => schedule?.slots.find((s) => s.groupId === activeGroupId),
    [schedule, activeGroupId]
  );

  const date = todayStr();
  const { data: records } = useAttendance(slot?.id ?? null, date);
  const markAttendance = useMarkAttendance();

  const groupStudents = useMemo(
    () => (myStudents ?? []).filter((s) => s.groups.some((g) => g.id === activeGroupId)),
    [myStudents, activeGroupId]
  );

  const recordMap = useMemo(() => {
    const m = new Map<string, "p" | "a" | "l">();
    for (const r of records ?? []) m.set(r.studentId, r.status);
    return m;
  }, [records]);

  function setStatus(studentId: string, status: "p" | "a" | "l") {
    if (!slot) return;
    const next = groupStudents.map((s) => ({
      studentId: s.id,
      status: s.id === studentId ? status : recordMap.get(s.id) ?? "p",
    }));
    markAttendance.mutate({ scheduleSlotId: slot.id, date, records: next });
  }

  const recentLessons = (lessons ?? [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div>
      <PageHead title="Davomat belgilash" />

      <div className="grid l-2-1" style={{ marginTop: "var(--gap)" }}>
        <Card className="fade-up">
          <div className="card-head">
            <div className="head-ic"><Icon name="attendance" size={18} /></div>
            <div style={{ flex: 1 }}>
              <div className="ttl">Tezkor davomat</div>
              <div className="sub">{slot?.groupName ?? "Guruh tanlang"}</div>
            </div>
          </div>

          {groups.length > 0 && (
            <div className="card-pad" style={{ paddingBottom: 0 }}>
              <div className="seg" style={{ flexWrap: "wrap" }}>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    className={activeGroupId === g.id ? "on" : ""}
                    onClick={() => setGroupId(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card-pad" style={{ paddingTop: 8 }}>
            {!slot ? (
              <div className="cell-sub" style={{ padding: "20px 0", textAlign: "center" }}>
                Bu guruh uchun dars jadvali topilmadi.
              </div>
            ) : groupStudents.length === 0 ? (
              <div className="cell-sub" style={{ padding: "20px 0", textAlign: "center" }}>
                O'quvchilar topilmadi.
              </div>
            ) : (
              groupStudents.map((s) => {
                const status = recordMap.get(s.id);
                return (
                  <div className="att-row" key={s.id}>
                    <Avatar name={s.fullName} size="sm" />
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 650 }}>{s.fullName}</div>
                    <div className="att-btns">
                      {(["p", "l", "a"] as const).map((k) => (
                        <button
                          key={k}
                          className={"att-btn " + k + (status === k ? " sel" : "")}
                          onClick={() => setStatus(s.id, k)}
                          title={{ p: "Keldi", l: "Kechikdi", a: "Kelmadi" }[k]}
                        >
                          {{ p: "✓", l: "~", a: "✗" }[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <div className="kpi-grid">
            <StatCard icon="percent" tone="s" value={`${stats?.avgPercent ?? 0}%`} label="O'rtacha davomat" />
            <StatCard icon="check" tone="a" value={String(stats?.present ?? 0)} label="Keldi" />
            <StatCard icon="x" tone="d" value={String(stats?.absent ?? 0)} label="Kelmadi" />
          </div>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="clock" size={17} style={{ color: "var(--accent-text)" }} /> Oxirgi 5 dars
            </div>
            {recentLessons.length === 0 ? (
              <div className="cell-sub">Darslar topilmadi.</div>
            ) : (
              recentLessons.map((l) => (
                <div
                  key={l.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>{l.groupName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                      {new Date(l.date).toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })}
                    </div>
                  </div>
                  <span className="badge neut">{l.studentsCount} ta</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
