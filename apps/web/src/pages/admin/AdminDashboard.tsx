import { Avatar, Card, CardHead, Delta, Icon, StatCard, StatusBadge } from "@chess-school/ui";
import { useApplications, useGroupFillRate, useReportsOverview, useStudentGrowth, useTodaySchedule } from "../../lib/queries.js";

const MONTH_SHORT = ["Yan","Fev","Mar","Apr","May","Iyu","Iyl","Avg","Sen","Okt","Noy","Dek"];

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  const t = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Bugun ${t}`;
  if (diffDays === 1) return `Kecha ${t}`;
  return `${diffDays} kun oldin`;
}

function formatMoney(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

export default function AdminDashboard() {
  const { data: overview, isLoading: overviewLoading } = useReportsOverview();
  const { data: todaySchedule, isLoading: scheduleLoading } = useTodaySchedule();
  const { data: growth, isLoading: growthLoading } = useStudentGrowth();
  const { data: fillRate, isLoading: fillRateLoading } = useGroupFillRate();
  const { data: applications } = useApplications("diagnostika");

  const groupsData = fillRate ?? [];
  const growthData = (growth ?? []).map((g, i, arr) => ({
    month: MONTH_SHORT[Number(g.month.slice(5)) - 1] ?? g.month.slice(5),
    count: g.count,
    last: i === arr.length - 1,
  }));
  const scheduleData = (todaySchedule ?? []).map((l) => ({
    id: l.id,
    time: l.startTime?.slice(0, 5) ?? "",
    name: l.groupName,
    teacher: l.teacherName ?? "—",
    students: groupsData.find((g) => g.id === l.groupId)?.count ?? null,
    room: l.roomName ?? "",
    color: l.color ?? "var(--accent)",
  }));

  const maxCount = Math.max(1, ...growthData.map((g) => g.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* KPI cards */}
      <div className="grid cols-4">
        <StatCard
          icon="students" tone="i"
          value={overviewLoading ? "…" : String(overview?.studentsCount ?? 0)}
          label="Jami o'quvchilar"
        />
        <StatCard
          icon="teacher" tone="s"
          value={overviewLoading ? "…" : String(overview?.teachersCount ?? 0)}
          label="O'qituvchilar"
        />
        <StatCard
          icon="income" tone="s"
          value={overviewLoading ? "…" : formatMoney(overview?.monthIncome ?? 0)}
          label="Bu oy to'lov"
        />
        <StatCard
          icon="alert" tone="d"
          value={overviewLoading ? "…" : String(overview?.pendingPayments ?? 0)}
          label="To'liqsiz to'lov"
          delta={overview && overview.pendingPayments > 0 ? <Delta dir="bad">e'tibor bering</Delta> : undefined}
        />
      </div>

      {/* Applications + Schedule */}
      <div className="grid l-2-1">
        <Card>
          <CardHead
            icon="user"
            title="Yangi arizalar"
            sub="Operator tekshirishi kerak"
            right={
              <button className="btn sm">Barchasi &rarr;</button>
            }
          />
          <table className="tbl">
            <thead>
              <tr>
                <th>ISM</th>
                <th>TELEFON</th>
                <th>VAQT</th>
                <th>HOLAT</th>
              </tr>
            </thead>
            <tbody>
              {(applications ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-faint)", fontSize: 13 }}>
                    Yangi arizalar yo'q
                  </td>
                </tr>
              ) : (applications ?? []).map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="with-av">
                      <Avatar name={a.fullName} size="sm" />
                      <div>
                        <div className="cell-main">{a.fullName}</div>
                        <div className="cell-sub">{a.note ?? a.level ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>{a.phone}</td>
                  <td className="cell-sub">{formatRelativeDate(a.createdAt)}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHead
            icon="calendar"
            title="Bugungi darslar"
            sub={`${scheduleData.length} ta dars`}
            right={
              <button className="btn sm">Jadval</button>
            }
          />
          <div className="card-pad" style={{ paddingTop: 8, paddingBottom: 12 }}>
            {scheduleLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
            ) : scheduleData.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Bugun dars yo'q</div>
            ) : scheduleData.map((l) => (
              <div className="tl-item" key={l.id}>
                <div className="tl-time">{l.time}</div>
                <div className="tl-card" style={{ borderLeftColor: l.color }}>
                  <div className="ln-ttl">{l.name}</div>
                  <div className="ln-sub">
                    <Icon name="teacher" size={12} />
                    {l.teacher}
                    {l.students != null && l.students > 0 && <> &middot; {l.students} o'q</>}
                    {l.room && <> &middot; {l.room}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Growth chart + Fill rate */}
      <div className="grid l-2-1">
        <Card>
          <CardHead
            icon="trendingUp"
            title="O'quvchilar o'sishi"
            sub="Oxirgi 6 oy"
          />
          <div className="card-pad">
            {growthLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
            ) : growthData.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Hali ma'lumot yo'q</div>
            ) : (
              <div className="bars">
                {growthData.map((g) => (
                  <div className="bar-col" key={g.month}>
                    <div
                      className="bar"
                      style={{
                        height: `${(g.count / maxCount) * 100}%`,
                        background: g.last
                          ? "linear-gradient(180deg,#6aa8ff,#3F8CFF)"
                          : "linear-gradient(180deg,#93c5fd,#60a5fa)",
                      }}
                    >
                      <span className="cap tnum" style={{ fontWeight: g.last ? 900 : 700 }}>{g.count}</span>
                    </div>
                    <div className="bar-x">{g.month}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead icon="groups" title="Guruh to'ldirilishi" />
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {fillRateLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
            ) : groupsData.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-faint)", fontSize: 13 }}>Guruhlar yo'q</div>
            ) : groupsData.map((g) => (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: g.color ?? "var(--accent)", flexShrink: 0,
                    }} />
                    {g.name}
                  </span>
                  <span className="tnum" style={{ color: "var(--text-faint)", fontWeight: 700 }}>
                    {g.count}/{g.capacity}
                  </span>
                </div>
                <div className="pbar" style={{ height: 7 }}>
                  <span style={{
                    width: `${Math.min(100, (g.count / Math.max(1, g.capacity)) * 100)}%`,
                    background: g.color ?? "var(--accent)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
