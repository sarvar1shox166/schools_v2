import { useMemo, useState } from "react";
import { Card, fmtSom, Icon, PageHead, Segmented, StatCard, StatusBadge } from "@chess-school/ui";
import {
  useAssignPackage,
  useCreatePackage,
  usePackages,
  usePaymentsStats,
  useStudents,
  useTransactions,
} from "../../lib/queries.js";

const METHOD_LABEL: Record<string, string> = {
  click: "Click",
  payme: "Payme",
  naqd: "Naqd",
  uzcard: "Uzcard",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "to'langan",
  pending: "kutilmoqda",
  failed: "xato",
  cancelled: "bekor qilingan",
};

export default function PaymentsPage() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: packages } = usePackages();
  const { data: students } = useStudents();
  const { data: stats } = usePaymentsStats();
  const createPackage = useCreatePackage();
  const assignPackage = useAssignPackage();

  const [showPkgForm, setShowPkgForm] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: "", lessonsCount: "", price: "" });

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId: "", packageId: "", method: "naqd" as const });

  const [filter, setFilter] = useState<"all" | "paid" | "debt">("all");

  const filteredTransactions = useMemo(() => {
    if (!transactions) return transactions;
    if (filter === "paid") return transactions.filter((t) => t.status === "paid");
    if (filter === "debt") return transactions.filter((t) => t.status === "pending" || t.status === "failed");
    return transactions;
  }, [transactions, filter]);

  async function handleCreatePackage() {
    await createPackage.mutateAsync({
      name: pkgForm.name,
      lessonsCount: Number(pkgForm.lessonsCount),
      price: Number(pkgForm.price),
    });
    setPkgForm({ name: "", lessonsCount: "", price: "" });
  }

  async function handleAssign() {
    await assignPackage.mutateAsync({
      studentId: assignForm.studentId,
      packageId: assignForm.packageId,
      method: assignForm.method,
    });
    setAssignForm({ studentId: "", packageId: "", method: "naqd" });
  }

  return (
    <div>
      <PageHead title="To'lovlar va paketlar">
        <button className="btn sm" onClick={() => setShowPkgForm((v) => !v)}>
          <Icon name="plus" size={15} /> Yangi paket
        </button>
        <button className="btn sm primary" onClick={() => setShowAssignForm((v) => !v)}>
          <Icon name="plus" size={15} /> Paket sotish
        </button>
      </PageHead>

      <div className="kpi-grid" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="wallet" tone="b" value={`${fmtSom(stats?.totalReceived ?? 0)} so'm`} label="Qabul qilingan" />
        <StatCard icon="trendingDown" tone="d" value={`${fmtSom(stats?.totalDebt ?? 0)} so'm`} label="Qarzdorlik" />
        <StatCard icon="trendingUp" tone="a" value={`${fmtSom(stats?.totalPaidThisPeriod ?? 0)} so'm`} label="Shu oy to'langan" />
        <StatCard icon="clock" tone="c" value={`${fmtSom(stats?.totalPending ?? 0)} so'm`} label="Kutilayotgan" />
      </div>

      {showPkgForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <input className="inp" placeholder="Paket nomi" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} />
            <input className="inp" placeholder="Darslar soni" value={pkgForm.lessonsCount} onChange={(e) => setPkgForm({ ...pkgForm, lessonsCount: e.target.value })} />
            <input className="inp" placeholder="Narxi (so'm)" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} />
          </div>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={handleCreatePackage} disabled={!pkgForm.name || !pkgForm.lessonsCount || !pkgForm.price}>
            Saqlash
          </button>
        </Card>
      )}

      {showAssignForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <select className="inp" value={assignForm.studentId} onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}>
              <option value="">O'quvchi tanlang</option>
              {students?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
            <select className="inp" value={assignForm.packageId} onChange={(e) => setAssignForm({ ...assignForm, packageId: e.target.value })}>
              <option value="">Paket tanlang</option>
              {packages?.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtSom(p.price)} so'm</option>)}
            </select>
            <select className="inp" value={assignForm.method} onChange={(e) => setAssignForm({ ...assignForm, method: e.target.value as typeof assignForm.method })}>
              <option value="naqd">Naqd</option>
              <option value="uzcard">Uzcard</option>
              <option value="click">Click</option>
              <option value="payme">Payme</option>
            </select>
          </div>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={handleAssign} disabled={!assignForm.studentId || !assignForm.packageId}>
            Sotish
          </button>
        </Card>
      )}

      <Card className="fade-up" style={{ marginBottom: "var(--gap)" }}>
        <div className="card-head"><div className="ttl">Paketlar</div></div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Nomi</th><th>Darslar soni</th><th>Narxi</th><th>Holati</th></tr></thead>
            <tbody>
              {packages?.map((p) => (
                <tr key={p.id}>
                  <td className="cell-main">{p.name}</td>
                  <td>{p.lessonsCount}</td>
                  <td className="tnum">{fmtSom(p.price)} so'm</td>
                  <td>{p.active ? <StatusBadge status="faol" /> : <StatusBadge status="nofaol" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="fade-up">
        <div className="card-head">
          <div className="ttl">Tranzaksiyalar</div>
          <div className="spacer" />
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { v: "all", label: "Hammasi" },
              { v: "paid", label: "To'langan" },
              { v: "debt", label: "Qarzdor" },
            ]}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>ID</th><th>O'quvchi</th><th>Guruh</th><th>Summa</th><th>Usul</th><th>Sana</th><th>Holati</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Yuklanmoqda...</td></tr>}
              {filteredTransactions?.map((t) => (
                <tr key={t.id}>
                  <td className="cell-sub">{t.id.slice(0, 8)}</td>
                  <td className="cell-main">{t.studentName}</td>
                  <td className="cell-sub">{t.groupName ?? "—"}</td>
                  <td className="tnum">{fmtSom(t.amount)} so'm</td>
                  <td>{METHOD_LABEL[t.method]}</td>
                  <td className="cell-sub">{new Date(t.createdAt).toLocaleDateString("uz-UZ")}</td>
                  <td><StatusBadge status={STATUS_LABEL[t.status]} /></td>
                </tr>
              ))}
              {!isLoading && (filteredTransactions?.length ?? 0) === 0 && (
                <tr><td colSpan={7}><div className="empty"><Icon name="search" size={28} /><div>Tranzaksiyalar yo'q</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
