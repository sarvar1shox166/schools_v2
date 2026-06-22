import { Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import {
  useIncomeSummary,
  useIncomeBreakdown,
  usePaymentMethodStats,
  useReportsOverview,
  useIncomeExtra,
} from "../../lib/queries.js";

function fmtM(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

const BREAKDOWN_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

const MONTH_SHORT: Record<string, string> = {
  "01": "Yan", "02": "Fev", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Iyu", "07": "Iyl", "08": "Avg",
  "09": "Sen", "10": "Okt", "11": "Noy", "12": "Dek",
};

function monthLabel(m: string) {
  // m is "YYYY-MM"
  const parts = m.split("-");
  return MONTH_SHORT[parts[1]] ?? m;
}

export default function IncomeReportPage() {
  const { data: summary = [], isLoading: sumLoading } = useIncomeSummary();
  const { data: breakdown = [], isLoading: bdLoading } = useIncomeBreakdown();
  const { data: methodStats = [] } = usePaymentMethodStats();
  const { data: overview } = useReportsOverview();
  const { data: extra } = useIncomeExtra();

  /* Bar chart */
  const maxBarVal = summary.reduce((mx, d) => Math.max(mx, d.amount), 0) || 1;

  /* Donut (breakdown) */
  const totalBreakdown = breakdown.reduce((s, d) => s + d.amount, 0) || 1;
  let acc = 0;
  const donutStops = breakdown.map((d, i) => {
    const pct = Math.round((d.amount / totalBreakdown) * 100);
    const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length];
    const part = `${color} ${acc}% ${acc + pct}%`;
    acc += pct;
    return part;
  });
  const donutBg = donutStops.length > 0
    ? `conic-gradient(${donutStops.join(", ")})`
    : "var(--surface-3)";

  /* Current month */
  const currentMonth = summary[summary.length - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Daromadlar tahlili</h2>
        <button className="btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="download" size={14} /> PDF
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value={overview ? fmtM(overview.monthIncome) : "–"}
          label="Oylik daromad"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>↗ bu oy</span>}
        />
        <StatCard icon="trendingUp" tone="i"
          value={extra ? fmtM(extra.yearTotal) : "–"}
          label="Yil boshidan"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>↗ YTD</span>}
        />
        <StatCard icon="target" tone="w"
          value={extra ? `${extra.planCompletionPct}%` : "–"}
          label="Reja bajarilishi"
        />
        <StatCard icon="percent" tone="d"
          value={extra ? fmtM(extra.avgPerStudent) : "–"}
          label="O'rtacha / o'quvchi"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "var(--gap)" }}>

        {/* Bar chart */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>Oylik daromad</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>So'mda</div>
            </div>
            {currentMonth && (
              <span style={{
                padding: "4px 12px", borderRadius: 99,
                background: "#dbeafe", color: "#2563eb",
                fontSize: 12.5, fontWeight: 800,
              }}>{fmtM(currentMonth.amount)}</span>
            )}
          </div>

          {sumLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : summary.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Ma'lumot yo'q</div>
          ) : (
            <div style={{
              padding: "24px 22px 20px",
              display: "flex", alignItems: "flex-end", gap: 12,
              height: 240,
            }}>
              {summary.map(b => {
                const h = Math.max(8, (b.amount / maxBarVal) * 160);
                return (
                  <div key={b.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>
                      {fmtM(b.amount)}
                    </div>
                    <div style={{
                      width: "100%", height: h, borderRadius: "6px 6px 0 0",
                      background: "#93c5fd",
                    }} />
                    <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600 }}>
                      {monthLabel(b.month)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Donut chart — breakdown by package */}
        <Card style={{ padding: 0 }}>
          <CardHead icon="layers" title="Paketlar bo'yicha" sub="Daromad taqsimoti" />

          {bdLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : (
            <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {/* Donut */}
              <div style={{
                width: 180, height: 180, borderRadius: "50%",
                background: donutBg, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 110, height: 110, borderRadius: "50%",
                  background: "var(--surface)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 2,
                }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtM(totalBreakdown === 1 ? 0 : totalBreakdown)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600 }}>jami</div>
                </div>
              </div>

              {/* Legend */}
              {breakdown.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Ma'lumot yo'q</div>
              ) : (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {breakdown.map((d, i) => {
                    const pct = Math.round((d.amount / totalBreakdown) * 100);
                    const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length];
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)" }}>{fmtM(d.amount)}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", minWidth: 28, textAlign: "right" }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Payment method stats */}
      {methodStats.length > 0 && (
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 8px", fontWeight: 800, fontSize: 15.5 }}>To'lov usullari</div>
          <div style={{ padding: "8px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            {methodStats.map(ms => {
              const pct = totalBreakdown > 1 ? Math.round((ms.amount / (totalBreakdown === 1 ? 1 : totalBreakdown)) * 100) : 0;
              return (
                <div key={ms.method} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "capitalize" }}>
                    {ms.method}
                  </div>
                  <div style={{ flex: 1, height: 10, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`, height: "100%",
                      borderRadius: 99, background: "#3b82f6",
                      transition: "width .5s",
                    }} />
                  </div>
                  <div style={{ minWidth: 70, textAlign: "right", fontSize: 13, fontWeight: 700 }}>
                    {fmtM(ms.amount)}
                  </div>
                  <div style={{ minWidth: 36, textAlign: "right", fontSize: 12, color: "var(--text-faint)" }}>
                    {ms.count} ta
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Overview numbers */}
      {overview && (
        <div className="grid cols-4">
          <StatCard icon="users" tone="i" value={String(overview.studentsCount)} label="Jami o'quvchilar" />
          <StatCard icon="teacher" tone="s" value={String(overview.teachersCount)} label="O'qituvchilar" />
          <StatCard icon="layers" tone="w" value={String(overview.groupsCount)} label="Guruhlar" />
          <StatCard icon="percent" tone="s" value={`${overview.attendanceRate}%`} label="Davomat foizi" />
        </div>
      )}
    </div>
  );
}
