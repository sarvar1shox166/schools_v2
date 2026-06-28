import { Card, Icon, StatCard } from "@chess-school/ui";
import {
  useReportsOverview, useIncomeSummary, useIncomeBreakdown,
  useStudentGrowth, useGroupFillRate, useIncomeExtra,
} from "../../lib/queries.js";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function BarChart({ data, color = "#3b82f6", label }: {
  data: { label: string; value: number }[];
  color?: string;
  label?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: "var(--text-faint)", fontWeight: 600 }}>{fmt(d.value)}</div>
            <div style={{
              width: "100%", borderRadius: "3px 3px 0 0",
              background: color, opacity: d.value === max ? 1 : 0.55,
              height: `${(d.value / max) * 60}px`, minHeight: 2,
              transition: "height .3s",
            }} />
            <div style={{ fontSize: 9, color: "var(--text-faint)" }}>{d.label.slice(-2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { data: overview } = useReportsOverview();
  const { data: incomeSummary = [] } = useIncomeSummary();
  const { data: incomeBreakdown = [] } = useIncomeBreakdown();
  const { data: studentGrowth = [] } = useStudentGrowth();
  const { data: groupFill = [] } = useGroupFillRate();
  const { data: extra } = useIncomeExtra();

  const incomeChartData = incomeSummary.map((p) => ({
    label: p.month,
    value: Number(p.amount),
  }));

  const growthChartData = studentGrowth.map((p) => ({
    label: p.month,
    value: p.count,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Hisobotlar</h2>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value={overview ? fmt(overview.monthIncome) : "—"}
          label="Bu oy daromadi"
        />
        <StatCard icon="students" tone="i"
          value={String(overview?.studentsCount ?? "—")}
          label="Jami o'quvchilar"
        />
        <StatCard icon="check" tone="w"
          value={overview ? `${overview.attendanceRate}%` : "—"}
          label="O'rtacha davomat (30k)"
        />
        <StatCard icon="alert" tone="d"
          value={String(overview?.pendingPayments ?? "—")}
          label="Kutilayotgan to'lovlar"
        />
      </div>

      {/* Extra KPI row */}
      <div className="grid cols-3">
        {[
          { label: "Yillik daromad",       value: extra ? `${fmt(extra.yearTotal)} so'm` : "—", icon: "trending-up", color: "#059669", bg: "#d1fae5" },
          { label: "Reja bajarilishi",     value: extra ? `${extra.planCompletionPct}%`  : "—", icon: "target",      color: "#2563eb", bg: "#dbeafe" },
          { label: "O'quvchi boshiga o'rt.",value: extra ? `${fmt(extra.avgPerStudent)} so'm` : "—", icon: "users", color: "#7c3aed", bg: "#ede9fe" },
        ].map((c) => (
          <Card key={c.label}>
            <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={c.icon as any} size={18} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>

        {/* Income chart */}
        <Card>
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Oylik daromad (so'm)</div>
            {incomeChartData.length > 0 ? (
              <BarChart data={incomeChartData} color="#3b82f6" />
            ) : (
              <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                Ma'lumot yo'q
              </div>
            )}
          </div>
        </Card>

        {/* Student growth chart */}
        <Card>
          <div style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Yangi o'quvchilar (oylik)</div>
            {growthChartData.length > 0 ? (
              <BarChart data={growthChartData} color="#10b981" />
            ) : (
              <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                Ma'lumot yo'q
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Income breakdown + group fill */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>

        {/* Income by package */}
        <Card>
          <div style={{ padding: "18px 20px 8px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Paket bo'yicha daromad</div>
            {incomeBreakdown.length === 0 ? (
              <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Ma'lumot yo'q</div>
            ) : incomeBreakdown.map((item, i) => {
              const maxAmt = incomeBreakdown[0]?.amount ?? 1;
              const pct = Math.round((item.amount / maxAmt) * 100);
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: "var(--text-faint)" }}>{fmt(item.amount)} so'm · {item.count} ta</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Group fill rate */}
        <Card>
          <div style={{ padding: "18px 20px 8px" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Guruh to'lishi</div>
            {groupFill.length === 0 ? (
              <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Guruh yo'q</div>
            ) : groupFill.map((g, i) => {
              const pct = g.capacity > 0 ? Math.round((g.count / g.capacity) * 100) : 0;
              const color = g.color ?? "#3b82f6";
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{g.name}</span>
                    <span style={{ color: "var(--text-faint)" }}>{g.count}/{g.capacity} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
