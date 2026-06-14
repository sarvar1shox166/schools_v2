import { Card, fmtSom, Icon, PageHead, StatCard } from "@chess-school/ui";
import { useIncomeBreakdown, useIncomeExtra, useIncomeSummary, usePaymentMethodStats, useReportsOverview } from "../../lib/queries.js";

const MONTH_NAMES = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

const METHOD_LABEL: Record<string, string> = {
  click: "Click",
  payme: "Payme",
  naqd: "Naqd",
  uzcard: "Uzcard",
};

const METHOD_COLORS: Record<string, string> = {
  click: "#3F8CFF",
  payme: "#22c55e",
  naqd: "#f59e0b",
  uzcard: "#a855f7",
};

function monthLabel(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_NAMES[Number(m) - 1];
}

export default function IncomeReportPage() {
  const { data: overview } = useReportsOverview();
  const { data: summary } = useIncomeSummary();
  const { data: breakdown } = useIncomeBreakdown();
  const { data: methods } = usePaymentMethodStats();
  const { data: extra } = useIncomeExtra();

  const maxAmount = Math.max(1, ...(summary?.map((s) => s.amount) ?? [1]));
  const totalMethods = methods?.reduce((sum, m) => sum + m.amount, 0) ?? 0;

  let acc = 0;
  const gradientParts = (methods ?? []).map((m) => {
    const pct = totalMethods > 0 ? (m.amount / totalMethods) * 100 : 0;
    const part = `${METHOD_COLORS[m.method] ?? "#999"} ${acc}% ${acc + pct}%`;
    acc += pct;
    return part;
  });
  const donutBg = gradientParts.length > 0 ? `conic-gradient(${gradientParts.join(", ")})` : "var(--surface-3)";

  return (
    <div>
      <PageHead title="Daromadlar" />

      <div className="kpi-grid">
        <StatCard icon="income" tone="a" value={`${fmtSom(overview?.monthIncome ?? 0)} so'm`} label="Bu oy daromad" />
        <StatCard icon="clock" tone="w" value={String(overview?.pendingPayments ?? 0)} label="Kutilayotgan to'lovlar" />
        <StatCard icon="trendingUp" tone="s" value={`${fmtSom(extra?.yearTotal ?? 0)} so'm`} label="Yil boshidan jami" />
        <StatCard icon="target" tone="i" value={`${extra?.planCompletionPct ?? 0}%`} label="Reja bajarilishi" />
        <StatCard icon="percent" tone="d" value={`${fmtSom(extra?.avgPerStudent ?? 0)} so'm`} label="O'rtacha / o'quvchi" />
      </div>

      <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head"><div className="ttl">So'nggi 6 oy daromadi</div></div>
        <div style={{ padding: "0 16px 20px" }}>
          <div className="bars">
            {summary?.map((s) => (
              <div className="bar-col" key={s.month}>
                <div className="bar" style={{ height: `${Math.max(6, (s.amount / maxAmount) * 100)}%` }}>
                  {s.amount > 0 && <div className="cap">{fmtSom(s.amount)}</div>}
                </div>
                <div className="bar-x">{monthLabel(s.month)}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head"><div className="ttl">Usul bo'yicha taqsimot</div></div>
        <div style={{ padding: "0 16px 20px" }}>
          {["payme", "click", "uzcard", "naqd"].map((method) => {
            const m = methods?.find((x) => x.method === method);
            const amount = m?.amount ?? 0;
            const pct = totalMethods > 0 ? Math.round((amount / totalMethods) * 100) : 0;
            return (
              <div className="sp-row" key={method}>
                <div className="sp-name">
                  <div className="nm">{METHOD_LABEL[method] ?? method}</div>
                  <div className="sub">{fmtSom(amount)} so'm</div>
                </div>
                <div className="sp-bar">
                  <div className="pbar flat">
                    <span style={{ width: `${pct}%`, background: METHOD_COLORS[method] ?? "#999" }} />
                  </div>
                </div>
                <div className="sp-pct">{pct}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        <Card className="fade-up">
          <div className="card-head"><div className="ttl">To'lov usullari</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 16px 20px", flexWrap: "wrap" }}>
            <div className="donut" style={{ background: donutBg, position: "relative" }}>
              <div className="inner">
                <div className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{fmtSom(totalMethods)}</div>
                <div className="cell-sub">so'm</div>
              </div>
            </div>
            <div className="legend">
              {methods?.map((m) => (
                <div className="row" key={m.method}>
                  <div className="sw" style={{ background: METHOD_COLORS[m.method] ?? "#999" }} />
                  <div className="nm">{METHOD_LABEL[m.method] ?? m.method}</div>
                  <div className="vl">{fmtSom(m.amount)}</div>
                </div>
              ))}
              {(!methods || methods.length === 0) && <div className="empty"><Icon name="search" size={24} /><div>Ma'lumot yo'q</div></div>}
            </div>
          </div>
        </Card>

        <Card className="fade-up">
          <div className="card-head"><div className="ttl">Paketlar bo'yicha daromad</div></div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Paket</th><th>Sotilgan</th><th>Summa</th></tr></thead>
              <tbody>
                {breakdown?.map((b) => (
                  <tr key={b.name}>
                    <td className="cell-main">{b.name}</td>
                    <td className="tnum">{b.count}</td>
                    <td className="tnum">{fmtSom(b.amount)} so'm</td>
                  </tr>
                ))}
                {(!breakdown || breakdown.length === 0) && (
                  <tr><td colSpan={3}><div className="empty"><Icon name="search" size={24} /><div>Ma'lumot yo'q</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
