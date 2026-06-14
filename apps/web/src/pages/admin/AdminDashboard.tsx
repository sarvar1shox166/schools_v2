import { Avatar, Card, CardHead, Icon, PageHead, StatCard, StatusBadge } from "@chess-school/ui";
import { useGroupFillRate, useReportsOverview, useStudentGrowth, useTodaySchedule } from "../../lib/queries.js";

const MOCK_APPLICATIONS = [
  { id: "1", name: "Ozodbek Karimov", phone: "+998 90 123 45 67", when: "Bugun, 09:14", note: "Saytdan ariza", status: "yangi" },
  { id: "2", name: "Madina Yusupova", phone: "+998 91 234 56 78", when: "Bugun, 08:02", note: "Qo'ng'iroq qildi", status: "qongiroq" },
  { id: "3", name: "Jasur Tojiboyev", phone: "+998 93 345 67 89", when: "Kecha, 18:40", note: "Instagram orqali", status: "yangi" },
  { id: "4", name: "Sevinch Aliyeva", phone: "+998 94 456 78 90", when: "Kecha, 14:21", note: "Telegram bot", status: "faol" },
];

export default function AdminDashboard() {
  const { data: overview } = useReportsOverview();
  const { data: todaySchedule } = useTodaySchedule();
  const { data: growth } = useStudentGrowth();
  const { data: fillRate } = useGroupFillRate();

  const max = Math.max(1, ...(growth ?? []).map((g) => g.count));

  return (
    <div>
      <PageHead title="Dashboard" />
      <div className="kpi-grid">
        <StatCard icon="students" tone="a" value={String(overview?.studentsCount ?? 0)} label="O'quvchilar" />
        <StatCard icon="teacher" tone="b" value={String(overview?.teachersCount ?? 0)} label="O'qituvchilar" />
        <StatCard icon="groups" tone="c" value={String(overview?.groupsCount ?? 0)} label="Guruhlar" />
        <StatCard icon="income" tone="d" value={String(overview?.monthIncome ?? 0)} label="Daromad" />
      </div>

      <div className="grid l-2-1" style={{ marginTop: "var(--gap)" }}>
        <Card>
          <CardHead icon="user" title="Yangi arizalar" sub="Operator tekshirishi kerak" />
          <table className="tbl">
            <thead>
              <tr>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Vaqt</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_APPLICATIONS.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="with-av">
                      <Avatar name={a.name} size="sm" />
                      <div>
                        <div className="cell-main">{a.name}</div>
                        <div className="cell-sub">{a.note}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>{a.phone}</td>
                  <td className="cell-sub">{a.when}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHead icon="calendar" title="Bugungi darslar" sub={`${todaySchedule?.length ?? 0} ta dars rejalashtirilgan`} />
          <div className="card-pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {(todaySchedule ?? []).map((l) => (
              <div className="tl-item" key={l.id}>
                <div className="tl-time">{l.startTime?.slice(0, 5)}</div>
                <div className="tl-card" style={{ borderLeftColor: l.color ?? "var(--accent)" }}>
                  <div className="ln-ttl">{l.groupName}</div>
                  <div className="ln-sub">
                    <Icon name="teacher" size={13} /> {l.roomName ?? "-"}
                  </div>
                </div>
              </div>
            ))}
            {(!todaySchedule || todaySchedule.length === 0) && (
              <div className="cell-sub" style={{ padding: "12px 0" }}>Bugun dars rejalashtirilmagan</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid l-2-1" style={{ marginTop: "var(--gap)" }}>
        <Card>
          <CardHead icon="trendingUp" title="O'quvchilar o'sishi" sub="Oxirgi 6 oy" />
          <div className="card-pad">
            <div className="bars">
              {(growth ?? []).map((g, i) => (
                <div className="bar-col" key={g.month}>
                  <div
                    className="bar"
                    style={{
                      height: `${(g.count / max) * 100}%`,
                      opacity: i === (growth?.length ?? 1) - 1 ? 1 : 0.78,
                    }}
                  >
                    <span className="cap tnum">{g.count}</span>
                  </div>
                  <div className="bar-x">{g.month.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="groups" title="Guruh to'ldirilishi" sub="Joriy holatlar" />
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(fillRate ?? []).slice(0, 5).map((g) => (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                  <span style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: g.color ?? "var(--accent)" }} />
                    {g.name}
                  </span>
                  <span className="tnum" style={{ color: "var(--text-faint)", fontWeight: 700 }}>
                    {g.count}/{g.capacity}
                  </span>
                </div>
                <div className="pbar">
                  <span style={{ width: `${Math.min(100, (g.count / Math.max(1, g.capacity)) * 100)}%`, background: g.color ?? undefined }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
