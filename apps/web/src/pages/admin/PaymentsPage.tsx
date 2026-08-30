import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, StatCard, fmtSom } from "@chess-school/ui";
import {
  useTransactions,
  usePaymentsStats,
  usePackages,
  useAssignPackage,
  useUpdateTransaction,
  useDeleteTransaction,
  useStudents,
  Transaction,
} from "../../lib/queries.js";

const fmt = fmtSom;

type TabKey = "all" | "paid" | "deferred" | "debt" | "expiring";

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

/** Holat ko'rinishi. Muhim: "qarzdor" — faqat pul kelmagan va to'lov muddati
 *  o'tgan holat. To'lagan, lekin obunasi tugagan o'quvchi qarzdor emas. */
const STATUS_META: Record<Transaction["displayStatus"], {
  label: string; icon: string; bg: string; color: string; border: string;
}> = {
  paid:      { label: "to'langan",         icon: "✓",  bg: "#dcfce71a", color: "#16a34a", border: "#bbf7d0" },
  deferred:  { label: "keyinroq to'laydi", icon: "🕐", bg: "#ede9fe1a", color: "#7c3aed", border: "#ddd6fe" },
  overdue:   { label: "qarzdor",           icon: "⚠",  bg: "#fee2e21a", color: "#ef4444", border: "#fecaca" },
  expiring:  { label: "obuna tugayapti",   icon: "⏳", bg: "#fef3c71a", color: "#d97706", border: "#fde68a" },
  expired:   { label: "obuna tugagan",     icon: "⌛", bg: "#f3f4f61a", color: "#6b7280", border: "#e5e7eb" },
  failed:    { label: "xato",              icon: "⚠",  bg: "#fee2e21a", color: "#ef4444", border: "#fecaca" },
  cancelled: { label: "bekor qilingan",    icon: "✕",  bg: "#f3f4f61a", color: "#6b7280", border: "#e5e7eb" },
};

/** Holatga qarab TEGISHLI sanani izohlaydi: to'lov holatlarida to'lov muddatini,
 *  obuna holatlarida paket muddatini — ikkalasi hech qachon aralashtirilmaydi. */
function daysNote(t: Transaction): { text: string; danger: boolean } | null {
  if (t.displayStatus === "overdue" || t.displayStatus === "deferred") {
    const d = t.paymentDaysLeft;
    if (d === null) return null;
    if (d > 0)   return { text: `to'lashga ${d} kun qoldi`, danger: false };
    if (d === 0) return { text: "bugun to'lash kerak", danger: false };
    return { text: `to'lov ${Math.abs(d)} kun kechikdi`, danger: true };
  }
  if (t.displayStatus === "expiring" || t.displayStatus === "expired") {
    const d = t.packageDaysLeft;
    if (d === null) return null;
    if (d > 0)   return { text: `obunaga ${d} kun qoldi`, danger: false };
    if (d === 0) return { text: "obuna bugun tugaydi", danger: false };
    return { text: `obuna ${Math.abs(d)} kun oldin tugagan`, danger: true };
  }
  return null;
}

function StatusCell({ t }: { t: Transaction }) {
  const meta = STATUS_META[t.displayStatus];
  const note = daysNote(t);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 12px", borderRadius: 99, width: "fit-content",
        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
        fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
      }}>{meta.icon} {meta.label}</span>
      {note && (
        <span style={{ fontSize: 11, fontWeight: 600, color: note.danger ? "#ef4444" : "var(--text-faint)" }}>
          {note.text}
        </span>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const [tab, setTab]             = useState<TabKey>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx]       = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: stats } = usePaymentsStats();
  const deleteTx = useDeleteTransaction();

  const filtered = useMemo(() => {
    if (tab === "paid")     return transactions.filter(t => t.displayStatus === "paid");
    if (tab === "deferred") return transactions.filter(t => t.displayStatus === "deferred");
    if (tab === "debt")     return transactions.filter(t => t.displayStatus === "overdue");
    if (tab === "expiring") return transactions.filter(t => t.displayStatus === "expiring" || t.displayStatus === "expired");
    return transactions;
  }, [tab, transactions]);

  function handleDelete(t: Transaction) {
    // Pul allaqachon kelgan to'lovni o'chirish hisobotlarni o'zgartiradi —
    // status nomidan qat'i nazar, asl status bo'yicha ogohlantiramiz.
    const msg = t.status === "paid"
      ? "Bu to'lov bo'yicha pul qabul qilingan — o'chirilsa hisobotlardagi summalar ham o'zgaradi va unga biriktirilgan paket bekor qilinadi. Baribir o'chirilsinmi?"
      : "To'lov yozuvini va unga biriktirilgan paketni o'chirasizmi?";
    if (!window.confirm(msg)) return;
    deleteTx.mutate(t.id, {
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        window.alert(msg ?? "O'chirishda xatolik yuz berdi.");
      },
    });
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all",      label: "Barchasi" },
    { key: "paid",     label: "To'langan" },
    { key: "deferred", label: "Keyinroq to'laydi" },
    { key: "debt",     label: "Qarzdor" },
    { key: "expiring", label: "Obuna tugayapti" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>To'lovlar</h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={15} /> To'lov
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value={stats ? fmt(stats.totalReceived) : "–"}
          label="Jami qabul qilingan (so'm)"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>butun davr</span>}
        />
        <StatCard icon="check" tone="i"
          value={stats ? fmt(stats.totalPaidThisPeriod) : "–"}
          label="Bu oy qabul qilingan (so'm)"
        />
        <StatCard icon="trendingDown" tone="d"
          value={stats ? fmt(stats.totalDebt) : "–"}
          label="Qarzdorlik (so'm)"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>⚠ muddati o'tgan</span>}
        />
        <StatCard icon="clock" tone="w"
          value={stats ? fmt(stats.totalPending) : "–"}
          label="Kutilayotgan to'lovlar (so'm)"
          delta={stats && stats.expiringCount > 0
            ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warn, #d97706)" }}>⏳ {stats.expiringCount} obuna tugayapti</span>
            : undefined}
        />
      </div>

      {/* Table card */}
      <Card style={{ padding: 0 }}>
        {/* Filter tabs */}
        <div style={{ padding: "16px 20px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <table className="tbl" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>O'QUVCHI</th>
                  <th>GURUH</th>
                  <th>SUMMA</th>
                  <th>SANA</th>
                  <th>USUL</th>
                  <th>STATUS</th>
                  <th></th>
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
                      <td><StatusCell t={p} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            onClick={() => setEditTx(p)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
                          >
                            <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8}>
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
      {editTx && <EditTransactionModal tx={editTx} onClose={() => setEditTx(null)} />}
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
  const [expiresAt, setExpiresAt]         = useState("");   // paket (obuna) muddati
  const [paymentDue, setPaymentDue]       = useState("");   // to'lov muddati (faqat payLater)
  const [payLater, setPayLater]           = useState(false);
  const [err, setErr]                     = useState("");

  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.phone.includes(studentSearch)
  );

  async function handleSubmit() {
    if (!studentId) { setErr("O'quvchini tanlang"); return; }
    if (!packageId) { setErr("Paketni tanlang"); return; }
    if (payLater && !paymentDue) { setErr("Keyinroq to'lash uchun to'lov muddatini belgilang"); return; }
    setErr("");
    try {
      await assignPkg.mutateAsync({
        studentId, packageId, method,
        expiresAt: expiresAt || undefined,
        payLater: payLater || undefined,
        paymentDueDate: payLater ? paymentDue : undefined,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return createPortal(
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

          {/* PAKET muddati — xizmat qachongacha amal qiladi */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Paket (obuna) muddati <span style={{ fontWeight: 500, color: "var(--text-faint)" }}>— ixtiyoriy</span>
            </label>
            <input
              type="date"
              className="inp"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>
              Darslar qachongacha amal qilishi. Tugashiga 5 kun qolganda eslatma chiqadi.
            </div>
          </div>

          {/* Pay later */}
          <label style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer",
          }}>
            <input type="checkbox" checked={payLater} onChange={e => setPayLater(e.target.checked)} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Hozir emas, keyinroq to'laydi</div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                Pul hali kelmagan deb belgilanadi. Va'da qilingan sana o'tsa — "Qarzdor".
              </div>
            </div>
          </label>

          {/* TO'LOV muddati — faqat keyinroq to'laganda ma'noli */}
          {payLater && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
                To'lov muddati *
              </label>
              <input
                type="date"
                className="inp"
                value={paymentDue}
                onChange={e => setPaymentDue(e.target.value)}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>
                Pul qachongacha kelishi kerak. Bu paket muddatidan boshqa sana.
              </div>
            </div>
          )}

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
    </div>,
    document.body
  );
}

/* ─── Edit Transaction Modal ─── */
function EditTransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const updateTx = useUpdateTransaction();

  const [amount, setAmount]     = useState(String(tx.amount));
  const [method, setMethod]     = useState(tx.method);
  const [status, setStatus]     = useState<"pending" | "paid" | "failed" | "cancelled">(tx.status);
  const [dueDate, setDueDate]   = useState(tx.dueDate ?? "");
  const [createdAt, setCreatedAt] = useState(tx.createdAt.slice(0, 10));
  const [err, setErr]           = useState("");

  async function handleSubmit() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) { setErr("Summani kiriting"); return; }
    setErr("");
    try {
      await updateTx.mutateAsync({
        id: tx.id, amount: amountNum, method, status,
        dueDate: dueDate || null, createdAt,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return createPortal(
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
        width: 480, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>To'lovni tahrirlash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{tx.studentName}</div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Summa
            </label>
            <input
              type="number"
              className="inp"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

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

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              Status
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                { key: "paid", label: "To'langan" },
                { key: "pending", label: "Kutilmoqda" },
                { key: "cancelled", label: "Bekor qilingan" },
                { key: "failed", label: "Xato" },
              ] as const).map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  style={{
                    padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: status === s.key ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                    background: status === s.key ? "var(--accent)" : "transparent",
                    color: status === s.key ? "#fff" : "var(--text-dim)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              To'lov sanasi
            </label>
            <input
              type="date"
              className="inp"
              value={createdAt}
              onChange={e => setCreatedAt(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
              To'lov muddati (ixtiyoriy)
            </label>
            <input
              type="date"
              className="inp"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>
              Pul qachongacha kelishi kerak. Faqat to'lanmagan holatda ishlaydi —
              shu sana o'tsa to'lov "Qarzdor"ga o'tadi. Paket muddati bu emas,
              u o'quvchi kartochkasida o'zgartiriladi.
            </div>
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
              disabled={updateTx.isPending}
            >
              <Icon name="check" size={15} />
              {updateTx.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
