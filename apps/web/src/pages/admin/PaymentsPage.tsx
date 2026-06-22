import { useState, useMemo } from "react";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";
import {
  useTransactions,
  usePaymentsStats,
  usePackages,
  useAssignPackage,
  useStudents,
  Transaction,
} from "../../lib/queries.js";

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

type TabKey = "all" | "paid" | "pending" | "debt";

const METHOD_LABELS: Record<string, string> = {
  naqd:   "Naqd",
  click:  "Click",
  payme:  "Payme",
  uzcard: "UzCard",
};

const METHOD_STYLE: Record<string, { bg: string; color: string }> = {
  click:  { bg: "#dbeafe", color: "#2563eb" },
  payme:  { bg: "#dbeafe", color: "#2563eb" },
  uzcard: { bg: "#dbeafe", color: "#2563eb" },
  naqd:   { bg: "var(--surface-3)", color: "var(--text-dim)" },
};

function statusLabel(s: Transaction["status"]) {
  if (s === "paid")      return "to'langan";
  if (s === "pending")   return "kutilmoqda";
  if (s === "failed")    return "xato";
  if (s === "cancelled") return "bekor";
  return s;
}

export default function PaymentsPage() {
  const [tab, setTab]             = useState<TabKey>("all");
  const [showModal, setShowModal] = useState(false);

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: stats } = usePaymentsStats();

  const filtered = useMemo(() => {
    if (tab === "paid")    return transactions.filter(t => t.status === "paid");
    if (tab === "pending") return transactions.filter(t => t.status === "pending");
    if (tab === "debt")    return transactions.filter(t => t.status === "failed" || t.status === "cancelled");
    return transactions;
  }, [tab, transactions]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all",     label: "Barchasi" },
    { key: "paid",    label: "To'langan" },
    { key: "pending", label: "Kutilmoqda" },
    { key: "debt",    label: "Qarzdor" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>To'lovlar</h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={15} /> To'lov
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value={stats ? fmt(stats.totalReceived) : "–"}
          label="Qabul qilingan (so'm)"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>↗ bu oy</span>}
        />
        <StatCard icon="trendingDown" tone="d"
          value={stats ? fmt(stats.totalDebt) : "–"}
          label="Qarzdorlik (so'm)"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>⚠ qarzdorlar</span>}
        />
        <StatCard icon="check" tone="i"
          value={stats ? fmt(stats.totalPaidThisPeriod) : "–"}
          label="Bu davr to'lovlari"
        />
        <StatCard icon="clock" tone="w"
          value={stats ? fmt(stats.totalPending) : "–"}
          label="Kutilayotgan"
        />
      </div>

      {/* Table card */}
      <Card style={{ padding: 0 }}>
        {/* Filter tabs */}
        <div style={{ padding: "16px 20px 12px", display: "flex", gap: 8 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "5px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700,
              border: tab === t.key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              background: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "#fff" : "var(--text-dim)", cursor: "pointer",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>O'QUVCHI</th>
                  <th>GURUH</th>
                  <th>SUMMA</th>
                  <th>SANA</th>
                  <th>USUL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const ms = METHOD_STYLE[p.method] ?? METHOD_STYLE.naqd;
                  const dateStr = p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString("uz-UZ")
                    : "–";
                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 600 }}>
                        {p.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td>
                        <div className="with-av">
                          <div style={{ borderRadius: 9, flexShrink: 0, display: "inline-flex" }}><Avatar name={p.studentName} size="sm" /></div>
                          <span className="cell-main">{p.studentName}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "2px 10px", borderRadius: 8,
                          border: "1.5px solid var(--border)",
                          fontSize: 13, fontWeight: 700, color: "var(--text-dim)",
                        }}>{p.groupName ?? "–"}</span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: 14 }}>{fmt(p.amount)} so'm</td>
                      <td style={{ color: "var(--text-faint)", fontSize: 13.5 }}>{dateStr}</td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 11px", borderRadius: 7,
                          background: ms.bg, color: ms.color,
                          fontSize: 12.5, fontWeight: 700,
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                          {METHOD_LABELS[p.method] ?? p.method}
                        </span>
                      </td>
                      <td>
                        {p.status === "paid" ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 12px", borderRadius: 99,
                            background: "#dcfce71a", color: "#16a34a",
                            border: "1px solid #bbf7d0", fontSize: 12.5, fontWeight: 700,
                          }}><Icon name="check" size={11} /> to'langan</span>
                        ) : p.status === "pending" ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 12px", borderRadius: 99,
                            background: "#fef3c71a", color: "#d97706",
                            border: "1px solid #fde68a", fontSize: 12.5, fontWeight: 700,
                          }}>⏳ kutilmoqda</span>
                        ) : (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 12px", borderRadius: 99,
                            background: "#fee2e21a", color: "#ef4444",
                            border: "1px solid #fecaca", fontSize: 12.5, fontWeight: 700,
                          }}>⚠ {statusLabel(p.status)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty"><Icon name="wallet" size={26} /><div>To'lovlar topilmadi</div></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && <AssignPaymentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

/* ─── Assign Payment Modal ─── */
function AssignPaymentModal({ onClose }: { onClose: () => void }) {
  const { data: students = [], isLoading: stuLoading } = useStudents();
  const { data: packages = [], isLoading: pkgLoading } = usePackages();
  const assignPkg = useAssignPackage();

  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId]         = useState("");
  const [packageId, setPackageId]         = useState("");
  const [method, setMethod]               = useState<"naqd" | "click" | "payme" | "uzcard">("naqd");
  const [expiresAt, setExpiresAt]         = useState("");
  const [err, setErr]                     = useState("");

  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.phone.includes(studentSearch)
  );

  async function handleSubmit() {
    if (!studentId) { setErr("O'quvchini tanlang"); return; }
    if (!packageId) { setErr("Paketni tanlang"); return; }
    setErr("");
    try {
      await assignPkg.mutateAsync({ studentId, packageId, method, expiresAt: expiresAt || undefined });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>To'lov tayinlash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Student search */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              O'quvchi *
            </label>
            <input
              className="inp"
              placeholder="Ism yoki telefon orqali qidiring..."
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setStudentId(""); }}
              style={{ width: "100%", marginBottom: 6 }}
            />
            {stuLoading && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Yuklanmoqda...</div>}
            {studentSearch && !studentId && (
              <div style={{
                border: "1px solid var(--border)", borderRadius: 10,
                background: "var(--surface)", maxHeight: 180, overflowY: "auto",
              }}>
                {filteredStudents.slice(0, 8).map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setStudentId(s.id); setStudentSearch(s.fullName); }}
                    style={{
                      padding: "10px 14px", cursor: "pointer", fontSize: 14,
                      borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ fontWeight: 700 }}>{s.fullName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{s.phone}</div>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div style={{ padding: 12, fontSize: 13, color: "var(--text-faint)" }}>Topilmadi</div>
                )}
              </div>
            )}
            {studentId && (
              <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ Tanlandi</div>
            )}
          </div>

          {/* Package */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Paket *
            </label>
            {pkgLoading ? (
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Yuklanmoqda...</div>
            ) : (
              <select
                className="inp"
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Paket tanlang...</option>
                {packages.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.lessonsCount} dars — {fmt(p.price)} so'm
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Method */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              To'lov usuli
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["naqd", "click", "payme", "uzcard"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: method === m ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                    background: method === m ? "var(--accent)" : "transparent",
                    color: method === m ? "#fff" : "var(--text-dim)",
                  }}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Expires at (optional) */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Tugash sanasi (ixtiyoriy)
            </label>
            <input
              type="date"
              className="inp"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {err && (
            <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
              Bekor
            </button>
            <button
              className="btn primary"
              style={{ flex: 2, justifyContent: "center" }}
              onClick={handleSubmit}
              disabled={assignPkg.isPending}
            >
              <Icon name="check" size={15} />
              {assignPkg.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
