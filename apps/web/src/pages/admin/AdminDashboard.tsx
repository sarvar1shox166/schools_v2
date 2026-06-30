import { Avatar, Card, CardHead, Delta, Icon, StatCard, StatusBadge } from "@chess-school/ui";
import { useApplications, useGroupFillRate, useReportsOverview, useStudentGrowth, useTodaySchedule } from "../../lib/queries.js";

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  const t = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Bugun ${t}`;
  if (diffDays === 1) return `Kecha ${t}`;
  return `${diffDays} kun oldin`;
}

const MOCK_SCHEDULE = [
  { id: "1", time: "09:00", name: "Boshlang'ich — A guruh", teacher: "Alisher K.", students: 12, room: "1-zal", color: "#3F8CFF" },
  { id: "2", time: "11:00", name: "Taktika — B guruh",      teacher: "Malika Y.",  students: 8,  room: "2-zal", color: "#10b981" },
  { id: "3", time: "14:00", name: "Bolalar kursi — C guruh",teacher: "Bobur R.",   students: 15, room: "1-zal", color: "#f59e0b" },
  { id: "4", time: "16:00", name: "Pozitsion — D guruh",    teacher: "Dilnoza E.", students: 10, room: "3-zal", color: "#3F8CFF" },
  { id: "5", time: "18:00", name: "Blitz klub — F guruh",   teacher: "Jasur T.",   students: 11, room: "2-zal", color: "#10b981" },
];

const MOCK_GROWTH = [
  { month: "Yan", count: 180 },
  { month: "Fev", count: 192 },
  { month: "Mar", count: 210 },
  { month: "Apr", count: 221 },
  { month: "May", count: 236 },
  { month: "Iyu", count: 248 },
];

const MOCK_GROUPS = [
  { id: "1", name: "Boshlang'ich — A", count: 12, capacity: 14, color: "#3F8CFF" },
  { id: "2", name: "Taktika — B",      count: 8,  capacity: 12, color: "#10b981" },
  { id: "3", name: "Bolalar kursi — C",count: 15, capacity: 16, color: "#f59e0b" },
  { id: "4", name: "Pozitsion — D",    count: 10, capacity: 12, color: "#ec4899" },
  { id: "5", name: "Pro Trening",      count: 6,  capacity: 8,  color: "#06b6d4" },
  { id: "6", name: "Blitz klub — F",   count: 11, capacity: 14, color: "#22c55e" },
];

function formatMoney(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

export default function AdminDashboard() {
  const { data: overview } = useReportsOverview();
  const { data: todaySchedule } = useTodaySchedule();
  const { data: growth } = useStudentGrowth();
  const { data: fillRate } = useGroupFillRate();
  const { data: applications } = useApplications("yangi");

  const growthData = (growth && growth.length > 0) ? growth.map((g, i) => ({
    month: ["Yan","Fev","Mar","Apr","May","Iyu","Iyl","Avg","Sen","Okt","Noy","Dek"][Number(g.month.slice(5)) - 1] ?? g.month.slice(5),
    count: g.count,
    last: i === growth.length - 1,
  })) : MOCK_GROWTH.map((g, i) => ({ ...g, last: i === MOCK_GROWTH.length - 1 }));

  const groupsData = fillRate && fillRate.length > 0 ? fillRate : MOCK_GROUPS;
  const scheduleData = todaySchedule && todaySchedule.length > 0 ? todaySchedule.map((l) => ({
    id: l.id,
    time: l.startTime?.slice(0, 5) ?? "",
    name: l.groupName,
    teacher: l.roomName ?? "",
    students: 0,
    room: "",
    color: l.color ?? "var(--accent)",
  })) : MOCK_SCHEDULE;

  const maxCount = Math.max(1, ...growthData.map((g) => g.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* KPI cards */}
      <div className="grid cols-4">
        <StatCard
          icon="students" tone="i"
          value={String(overview?.studentsCount ?? 248)}
          label="Jami o'quvchilar"
          delta={<Delta dir="up">+12 bu oy</Delta>}
        />
        <StatCard
          icon="teacher" tone="s"
          value={String(overview?.teachersCount ?? 8)}
          label="O'qituvchilar"
          delta={<Delta dir="up">+1 yangi</Delta>}
        />
        <StatCard
          icon="income" tone="s"
          value={formatMoney(overview?.monthIncome ?? 18_400_000)}
          label="Bu oy to'lov"
          delta={<Delta dir="up">+8% o'sish</Delta>}
        />
        <StatCard
          icon="alert" tone="d"
          value={String(overview?.groupsCount ?? 3)}
          label="To'liqsiz to'lov"
          delta={<Delta dir="bad">e'tibor bering</Delta>}
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
            {scheduleData.map((l) => (
              <div className="tl-item" key={l.id}>
                <div className="tl-time">{l.time}</div>
                <div className="tl-card" style={{ borderLeftColor: l.color }}>
                  <div className="ln-ttl">{l.name}</div>
                  <div className="ln-sub">
                    <Icon name="teacher" size={12} />
                    {l.teacher}
                    {l.students > 0 && <> &middot; {l.students} o'q</>}
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
            right={
              <span className="badge suc">
                <Icon name="trendingUp" size={12} /> +37.8%
              </span>
            }
          />
          <div className="card-pad">
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
          </div>
        </Card>

        <Card>
          <CardHead icon="groups" title="Guruh to'ldirilishi" />
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {groupsData.map((g) => (
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
