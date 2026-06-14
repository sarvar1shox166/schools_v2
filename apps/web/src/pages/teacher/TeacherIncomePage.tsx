import { useState } from "react";
import { Card, fmtSom, Icon, PageHead, StatCard } from "@chess-school/ui";
import { useMyIncome } from "../../lib/queries.js";

const LESSON_TYPE_LABEL: Record<string, string> = {
  group: "Guruh",
  individual: "Individual",
  diagnostic: "Diagnostika",
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function TeacherIncomePage() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = useMyIncome(period);

  return (
    <div>
      <PageHead title="Daromad">
        <input className="inp" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </PageHead>

      <div className="kpi-grid">
        <StatCard icon="groups" tone="a" value={`${fmtSom(data?.groupAmount ?? 0)} so'm`} label="Guruh darslari" />
        <StatCard icon="user" tone="i" value={`${fmtSom(data?.individualAmount ?? 0)} so'm`} label="Individual trening" />
        <StatCard icon="target" tone="w" value={`${fmtSom(data?.diagnosticAmount ?? 0)} so'm`} label="Diagnostika" />
        <StatCard icon="wallet" tone="s" value={`${fmtSom(data?.totalAmount ?? 0)} so'm`} label="Jami" />
      </div>

      <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head"><div className="ttl">Darslar</div></div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Sana</th><th>Guruh</th><th>Turi</th><th>O'quvchilar</th><th>Summa</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5}>Yuklanmoqda...</td></tr>}
              {data?.sessions.map((s) => (
                <tr key={s.id}>
                  <td className="cell-sub">{new Date(s.date).toLocaleDateString("uz-UZ")}</td>
                  <td className="cell-main">{s.groupName}</td>
                  <td>{LESSON_TYPE_LABEL[s.lessonType]}</td>
                  <td>{s.studentsCount}</td>
                  <td className="tnum">{fmtSom(s.amount)} so'm</td>
                </tr>
              ))}
              {!isLoading && (data?.sessions.length ?? 0) === 0 && (
                <tr><td colSpan={5}><div className="empty"><Icon name="search" size={28} /><div>Bu oy uchun darslar yo'q</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
