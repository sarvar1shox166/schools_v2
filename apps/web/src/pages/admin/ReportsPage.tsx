import { Card, fmtSom, Icon, PageHead, StatCard, StatusBadge } from "@chess-school/ui";
import { useReportsOverview, useStudentGrowth } from "../../lib/queries.js";

const MONTH_NAMES = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

function monthLabel(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_NAMES[Number(m) - 1];
}

const REPORT_CARDS = [
  { icon: "income", title: "Moliyaviy hisobot", desc: "Daromad, xarajat, qarzdorlik", status: "Tayyor" },
  { icon: "students", title: "O'quvchilar hisoboti", desc: "Qabul, chiqish, faollik", status: "Tayyor" },
  { icon: "attendance", title: "Davomat hisoboti", desc: "Guruh va individual", status: "Tayyor" },
  { icon: "trendingUp", title: "O'sish tahlili", desc: "Oylik / yillik dinamika", status: "Yangi" },
  { icon: "teacher", title: "O'qituvchilar hisoboti", desc: "Maosh va samaradorlik", status: "Tayyorlanmoqda" },
  { icon: "groups", title: "Guruhlar hisoboti", desc: "To'ldirilish va dinamika", status: "Tayyorlanmoqda" },
];

export default function ReportsPage() {
  const { data: overview, isLoading } = useReportsOverview();
  const { data: growth } = useStudentGrowth();

  const maxGrowth = Math.max(1, ...(growth?.map((g) => g.count) ?? [1]));
  const totalNew = growth?.reduce((sum, g) => sum + g.count, 0) ?? 0;
  const avgPerMonth = growth && growth.length > 0 ? Math.round(totalNew / growth.length) : 0;
  const lastMonth = growth?.[growth.length - 1]?.count ?? 0;
  const prevMonth = growth?.[growth.length - 2]?.count ?? 0;
  const momChange = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

  return (
    <div>
      <PageHead title="Hisobotlar" />

      <div className="kpi-grid">
        <StatCard icon="students" tone="a" value={String(overview?.studentsCount ?? 0)} label="O'quvchilar" />
        <StatCard icon="teacher" tone="b" value={String(overview?.teachersCount ?? 0)} label="O'qituvchilar" />
        <StatCard icon="groups" tone="c" value={String(overview?.groupsCount ?? 0)} label="Guruhlar" />
        <StatCard icon="income" tone="d" value={`${fmtSom(overview?.monthIncome ?? 0)} so'm`} label="Bu oy daromad" />
      </div>

      <div className="cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        {REPORT_CARDS.map((r) => (
          <Card className="fade-up" key={r.title}>
            <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div className="head-ic" style={{ width: 46, height: 46, borderRadius: 13 }}>
                <Icon name={r.icon} size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 750, fontSize: 15 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>{r.desc}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <StatusBadge status={r.status} />
                <button className="btn sm" disabled>
                  <Icon name="download" size={14} /> Yuklab olish
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head"><div className="ttl">Oylik qiyoslash</div></div>
        <div style={{ padding: "0 16px 20px" }}>
          <div className="bars">
            {growth?.map((g) => (
              <div className="bar-col" key={g.month}>
                <div className="bar" style={{ height: `${Math.max(6, (g.count / maxGrowth) * 100)}%` }}>
                  {g.count > 0 && <div className="cap">{g.count}</div>}
                </div>
                <div className="bar-x">{monthLabel(g.month)}</div>
              </div>
            ))}
            {(!growth || growth.length === 0) && (
              <div className="empty"><Icon name="search" size={24} /><div>Ma'lumot yo'q</div></div>
            )}
          </div>
          <div className="kpi-grid" style={{ marginTop: "var(--gap)" }}>
            <div className="kpi"><div className="v">{totalNew}</div><div className="l">Jami yangi o'quvchilar (6 oy)</div></div>
            <div className="kpi"><div className="v">{avgPerMonth}</div><div className="l">O'rtacha / oy</div></div>
            <div className="kpi"><div className="v">{lastMonth}</div><div className="l">Joriy oy</div></div>
            <div className="kpi"><div className="v">{momChange > 0 ? "+" : ""}{momChange}%</div><div className="l">O'tgan oyga nisbatan</div></div>
          </div>
        </div>
      </Card>

      <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head">
          <div className="ttl">Davomat</div>
        </div>
        <div style={{ padding: "0 16px 20px" }}>
          <div className="kpi-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="kpi">
              <div className="v">{isLoading ? "..." : `${overview?.attendanceRate ?? 0}%`}</div>
              <div className="l">So'nggi 30 kun davomat foizi</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
