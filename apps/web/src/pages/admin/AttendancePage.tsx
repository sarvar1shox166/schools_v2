import { useMemo, useState } from "react";
import { Avatar, Card, CardHead, PageHead, StatCard } from "@chess-school/ui";
import {
  useAttendance,
  useAttendanceHistoryMatrix,
  useAttendanceStats,
  useMarkAttendance,
  useSchedule,
  useStudents,
} from "../../lib/queries.js";

const STATUS_LABEL: Record<string, string> = { p: "Keldi", a: "Kelmadi", l: "Kech qoldi" };
const DAY_STATUS_ICON: Record<"p" | "a" | "l", string> = { p: "✓", a: "✕", l: "•" };

export default function AttendancePage() {
  const { data: slots } = useSchedule();
  const { data: students } = useStudents();
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: records } = useAttendance(slotId || null, date);
  const markAttendance = useMarkAttendance();
  const { data: stats } = useAttendanceStats(date);

  const slot = slots?.find((s) => s.id === slotId);
  const { data: history } = useAttendanceHistoryMatrix(slot?.groupId ?? null, 8);

  const historyMap = useMemo(() => {
    const m = new Map<string, { days: ("p" | "a" | "l" | null)[]; percent: number }>();
    for (const s of history?.students ?? []) m.set(s.studentId, { days: s.days, percent: s.percent });
    return m;
  }, [history]);
  const groupStudents = useMemo(
    () => (students ?? []).filter((s) => s.groups.some((g) => g.id === slot?.groupId)),
    [students, slot]
  );

  const recordMap = useMemo(() => {
    const m = new Map<string, "p" | "a" | "l">();
    for (const r of records ?? []) m.set(r.studentId, r.status);
    return m;
  }, [records]);

  function setStatus(studentId: string, status: "p" | "a" | "l") {
    if (!slotId) return;
    const next = groupStudents.map((s) => ({
      studentId: s.id,
      status: s.id === studentId ? status : recordMap.get(s.id) ?? "p",
    }));
    markAttendance.mutate({ scheduleSlotId: slotId, date, records: next });
  }

  return (
    <div>
      <PageHead title="Davomat" />

      <div className="kpi-grid" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="check" value={`${stats?.avgPercent ?? 0}%`} label="O'rtacha davomat" />
        <StatCard icon="check" tone="b" value={stats?.present ?? 0} label="Keldi" />
        <StatCard icon="clock" tone="c" value={stats?.late ?? 0} label="Kech qoldi" />
        <StatCard icon="x" tone="d" value={stats?.absent ?? 0} label="Kelmadi" />
      </div>

      <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)", display: "flex", gap: 10 }}>
        <select className="inp" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          <option value="">Darsni tanlang</option>
          {slots?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.groupName} — {["Du", "Se", "Chor", "Pay", "Ju", "Sha", "Yak"][s.dayOfWeek]} {s.startTime.slice(0, 5)}
            </option>
          ))}
        </select>
        <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Card>

      {slotId && (
        <Card className="fade-up">
          <CardHead
            title="Davomat jadvali"
            right={
              <div className="legend" style={{ flexDirection: "row", gap: 14 }}>
                <div className="row"><span className="att p" style={{ width: 18, height: 18, fontSize: 11 }}>✓</span><span className="nm">Keldi</span></div>
                <div className="row"><span className="att l" style={{ width: 18, height: 18, fontSize: 11 }}>•</span><span className="nm">Kech qoldi</span></div>
                <div className="row"><span className="att a" style={{ width: 18, height: 18, fontSize: 11 }}>✕</span><span className="nm">Kelmadi</span></div>
                <div className="row"><span className="att n" style={{ width: 18, height: 18, fontSize: 11 }}>—</span><span className="nm">Belgilanmagan</span></div>
              </div>
            }
          />
          <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>O'quvchi</th>
                <th>Holat</th>
                {history?.dates.map((d) => (
                  <th key={d} style={{ textAlign: "center" }}>{new Date(d).getDate()}</th>
                ))}
                <th>Umumiy %</th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((s) => {
                const status = recordMap.get(s.id) ?? "p";
                const hist = historyMap.get(s.id);
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="with-av">
                        <Avatar name={s.fullName} size="sm" />
                        <div className="cell-main">{s.fullName}</div>
                      </div>
                    </td>
                    <td>
                      <div className="seg">
                        {(["p", "l", "a"] as const).map((opt) => (
                          <button
                            key={opt}
                            className={status === opt ? "on" : ""}
                            onClick={() => setStatus(s.id, opt)}
                          >
                            {STATUS_LABEL[opt]}
                          </button>
                        ))}
                      </div>
                    </td>
                    {(hist?.days ?? (Array(8).fill(null) as ("p" | "a" | "l" | null)[])).map((d, i) => (
                      <td key={i} style={{ textAlign: "center" }}>
                        <span className={`att ${d ?? "n"}`} style={{ width: 22, height: 22, fontSize: 11, margin: "0 auto" }} title={d ? STATUS_LABEL[d] : "Belgilanmagan"}>
                          {d ? DAY_STATUS_ICON[d] : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="tnum">{hist?.percent ?? 0}%</td>
                  </tr>
                );
              })}
              {groupStudents.length === 0 && (
                <tr><td colSpan={11}><div className="empty">Bu guruhda o'quvchi yo'q</div></td></tr>
              )}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}
