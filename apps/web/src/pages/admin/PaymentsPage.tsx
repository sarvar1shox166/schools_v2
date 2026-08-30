import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, StatCard, fmtSom } from "@chess-school/ui";
import {
  useCharges,
  usePaymentsStats,
  usePackages,
  useAssignPackage,
  useCreateCharge,
  useUpdateCharge,
  useDeleteCharge,
  useAddPayment,
  useDeleteTransaction,
  useStudents,
  Charge,
} from "../../lib/queries.js";

const fmt = fmtSom;

type TabKey = "all" | "paid" | "partial" | "deferred" | "overdue" | "expiring";

const METHOD_LABELS: Record<string, string> = {
  naqd:   "Naqd",
  click:  "Click",
  payme:  "Payme",
  uzcard: "UzCard",
};

const METHODS = ["naqd", "click", "payme", "uzcard"] as const;
type Method = (typeof METHODS)[number];

/** TO'LOV holati — pul kelgan/kelmaganiga qarab. Obunaga aloqasi yo'q. */
const STATUS_META: Record<Charge["status"], {
  label: string; icon: string; bg: string; color: string; border: string;
}> = {
  paid:     { label: "to'langan",         icon: "✓",  bg: "#dcfce71a", color: "#16a34a", border: "#bbf7d0" },
  partial:  { label: "qisman to'langan",  icon: "◐",  bg: "#dbeafe1a", color: "#2563eb", border: "#bfdbfe" },
  deferred: { label: "keyinroq to'laydi", icon: "🕐", bg: "#ede9fe1a", color: "#7c3aed", border: "#ddd6fe" },
  overdue:  { label: "qarzdor",           icon: "⚠",  bg: "#fee2e21a", color: "#ef4444", border: "#fecaca" },
};

function paymentNote(c: Charge): { text: string; danger: boolean } | null {
  if (c.status === "paid") return null;
  const d = c.paymentDaysLeft;
  if (d === null) return null;
  if (d > 0)   return { text: `to'lashga ${d} kun qoldi`, danger: false };
  if (d === 0) return { text: "bugun to'lash kerak", danger: false };
  return { text: `${Math.abs(d)} kun kechikdi`, danger: true };
}

/** OBUNA holati — paket muddatidan. To'lov holatidan mustaqil. */
function PackageCell({ c }: { c: Charge }) {
  if (!c.studentPackageId) {
    return <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>paketsiz</span>;
  }
  const d = c.packageDaysLeft;
  const lessons = c.totalLessons != null
    ? `${c.usedLessons ?? 0}/${c.totalLessons} dars`
    : null;

  let note: { text: string; color: string } | null = null;
  if (d !== null) {
    if (d < 0)        note = { text: `${Math.abs(d)} kun oldin tugagan`, color: "#ef4444" };
    else if (d === 0) note = { text: "bugun tugaydi", color: "#d97706" };
    else if (d <= 5)  note = { text: `${d} kun qoldi`, color: "#d97706" };
    else              note = { text: `${d} kun qoldi`, color: "var(--text-faint)" };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.packageName ?? "Paket"}</span>
      {lessons && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{lessons}</span>}
      {note && <span style={{ fontSize: 11, fontWeight: 600, color: note.color }}>{note.text}</span>}
    </div>
  );
}

export default function PaymentsPage() {
  const [tab, setTab]               = useState<TabKey>("all");
  const [showAssign, setShowAssign] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [payFor, setPayFor]         = useState<Charge | null>(null);
  const [editFor, setEditFor]       = useState<Charge | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const { data, isLoading } = useCharges();
  const charges = useMemo(() => data?.items ?? [], [data]);
  const { data: stats } = usePaymentsStats();
  const deleteCharge = useDeleteCharge();

  const counts = useMemo(() => ({
    all:      charges.length,
    paid:     charges.filter(c => c.status === "paid").length,
    partial:  charges.filter(c => c.status === "partial").length,
    deferred: charges.filter(c => c.status === "deferred").length,
    overdue:  charges.filter(c => c.status === "overdue").length,
    expiring: charges.filter(c => c.packageDaysLeft !== null && c.packageDaysLeft <= 5).length,
  }), [charges]);

  const filtered = useMemo(() => {
    if (tab === "expiring") {
      return charges.filter(c => c.packageDaysLeft !== null && c.packageDaysLeft <= 5);
    }
    if (tab === "all") return charges;
    return charges.filter(c => c.status === tab);
  }, [tab, charges]);

  function handleDelete(c: Charge) {
    const msg = c.paid > 0
      ? `Bu to'lov bo'yicha ${fmt(c.paid)} so'm qabul qilingan — o'chirilsa hisobotlardagi summalar o'zgaradi va biriktirilgan paket ham bekor qilinadi. Baribir o'chirilsinmi?`
      : "To'lov yozuvini va unga biriktirilgan paketni o'chirasizmi?";
    if (!window.confirm(msg)) return;
    deleteCharge.mutate(c.id, {
      onError: (e: unknown) => {
        const err = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        window.alert(err ?? "O'chirishda xatolik yuz berdi.");
      },
    });
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all",      label: "Barchasi" },
    { key: "paid",     label: "To'langan" },
    { key: "partial",  label: "Qisman" },
    { key: "deferred", label: "Keyinroq to'laydi" },
    { key: "overdue",  label: "Qarzdor" },
    { key: "expiring", label: "Obuna tugayapti" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>To'lovlar</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setShowCharge(true)}>
            <Icon name="plus" size={15} /> Boshqa to'lov
          </button>
          <button className="btn primary" onClick={() => setShowAssign(true)}>
            <Icon name="plus" size={15} /> Paket sotish
          </button>
        </div>
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
          label="Kutilayotgan qoldiq (so'm)"
          delta={stats && stats.expiringCount > 0
            ? <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706" }}>⏳ {stats.expiringCount} obuna tugayapti</span>
            : undefined}
        />
      </div>

      {/* Table card */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "5px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700,
              border: tab === t.key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              background: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "#fff" : "var(--text-dim)", cursor: "pointer",
            }}>
              {t.label}
              <span style={{ opacity: .7, marginLeft: 6, fontSize: 12 }}>{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th>O'QUVCHI</th>
                  <th>PAKET / OBUNA</th>
                  <th>SUMMA</th>
                  <th>SANA</th>
                  <th>TO'LOV HOLATI</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const note = paymentNote(c);
                  const meta = STATUS_META[c.status];
                  const isOpen = expanded === c.id;
                  return [
                    <tr key={c.id}>
                      <td>
                        <div className="with-av">
                          <div style={{ borderRadius: 9, flexShrink: 0, display: "inline-flex" }}>
                            <Avatar name={c.studentName} size="sm" />
                          </div>
                          <div>
                            <div className="cell-main">{c.studentName}</div>
                            <div className="cell-sub">{c.groupName ?? "guruhsiz"}</div>
                          </div>
                        </div>
                      </td>
                      <td><PackageCell c={c} /></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{fmt(c.amount)} so'm</span>
                          {c.balance > 0 && c.paid > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                              to'landi {fmt(c.paid)} · qoldiq{" "}
                              <b style={{ color: "#ef4444" }}>{fmt(c.balance)}</b>
                            </span>
                          )}
                          {c.balance > 0 && c.paid === 0 && (
                            <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>to'lanmagan</span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-faint)", fontSize: 13.5 }}>
                        {new Date(c.createdAt).toLocaleDateString("uz-UZ")}
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                          {c.balance > 0 && (
                            <button className="btn" style={{ padding: "4px 10px", fontSize: 12.5 }}
                              onClick={() => setPayFor(c)}>
                              To'lov
                            </button>
                          )}
                          {c.payments.length > 0 && (
                            <button title="To'lovlar tarixi"
                              onClick={() => setExpanded(isOpen ? null : c.id)}
                              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
                              {isOpen ? "▲" : c.payments.length}
                            </button>
                          )}
                          <button title="Tahrirlash" onClick={() => setEditFor(c)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
                            <Icon name="edit" size={13} />
                          </button>
                          <button title="O'chirish" onClick={() => handleDelete(c)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
                            <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </td>
                    </tr>,
                    isOpen ? (
                      <tr key={`${c.id}-payments`}>
                        <td colSpan={6} style={{ background: "var(--surface-2)", padding: "10px 20px" }}>
                          <PaymentHistory charge={c} />
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty"><Icon name="wallet" size={26} /><div>To'lovlar topilmadi</div></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAssign && <AssignPackageModal onClose={() => setShowAssign(false)} />}
      {showCharge && <StandaloneChargeModal onClose={() => setShowCharge(false)} />}
      {payFor && <AddPaymentModal charge={payFor} onClose={() => setPayFor(null)} />}
      {editFor && <EditChargeModal charge={editFor} onClose={() => setEditFor(null)} />}
    </div>
  );
}

/* ─── To'lovlar tarixi (bitta majburiyat ichida) ─── */
function PaymentHistory({ charge }: { charge: Charge }) {
  const del = useDeleteTransaction();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>
        To'lovlar tarixi ({charge.payments.length})
      </div>
      {charge.payments.map(p => (
        <div key={p.id} style={{
          display: "flex", alignItems: "center", gap: 12, fontSize: 13,
          padding: "6px 10px", background: "var(--surface)", borderRadius: 8,
          border: "1px solid var(--border)",
        }}>
          <span style={{ fontWeight: 700, minWidth: 110 }}>{fmt(p.amount)} so'm</span>
          <span style={{ color: "var(--text-dim)", minWidth: 70 }}>{METHOD_LABELS[p.method] ?? p.method}</span>
          <span style={{ color: "var(--text-faint)", fontSize: 12.5 }}>
            {new Date(p.paidAt ?? p.createdAt).toLocaleDateString("uz-UZ")}
          </span>
          {p.status !== "paid" && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#d97706" }}>
              ({p.status === "pending" ? "tasdiqlanmagan" : p.status})
            </span>
          )}
          <button
            title="Bu to'lovni o'chirish"
            onClick={() => {
              if (!window.confirm(`${fmt(p.amount)} so'mlik to'lov o'chirilsinmi? Qoldiq qayta hisoblanadi.`)) return;
              del.mutate(p.id);
            }}
            style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
          >
            <Icon name="trash" size={11} style={{ color: "#ef4444" }} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Umumiy modal qobig'i ─── */
function Modal({ title, width = 480, onClose, children }: {
  title: string; width?: number; onClose: () => void; children: React.ReactNode;
}) {
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
        width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function MethodPicker({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {METHODS.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
          border: value === m ? "2px solid var(--accent)" : "1.5px solid var(--border)",
          background: value === m ? "var(--accent)" : "transparent",
          color: value === m ? "#fff" : "var(--text-dim)",
        }}>
          {METHOD_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

function StudentPicker({ studentId, onPick }: { studentId: string; onPick: (id: string) => void }) {
  const { data: students = [], isLoading } = useStudents();
  const [search, setSearch] = useState("");
  const list = students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );
  return (
    <div>
      <input
        className="inp"
        placeholder="Ism yoki telefon orqali qidiring..."
        value={search}
        onChange={e => { setSearch(e.target.value); onPick(""); }}
        style={{ width: "100%", marginBottom: 6 }}
      />
      {isLoading && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Yuklanmoqda...</div>}
      {search && !studentId && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", maxHeight: 180, overflowY: "auto" }}>
          {list.slice(0, 8).map(s => (
            <div key={s.id}
              onClick={() => { onPick(s.id); setSearch(s.fullName); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              <div style={{ fontWeight: 700 }}>{s.fullName}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{s.phone}</div>
            </div>
          ))}
          {list.length === 0 && <div style={{ padding: 12, fontSize: 13, color: "var(--text-faint)" }}>Topilmadi</div>}
        </div>
      )}
      {studentId && <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>✓ Tanlandi</div>}
    </div>
  );
}

function Actions({ onClose, onSubmit, pending, label = "Saqlash" }: {
  onClose: () => void; onSubmit: () => void; pending: boolean; label?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Bekor</button>
      <button className="btn primary" style={{ flex: 2, justifyContent: "center" }} onClick={onSubmit} disabled={pending}>
        <Icon name="check" size={15} /> {pending ? "Saqlanmoqda..." : label}
      </button>
    </div>
  );
}

function ErrText({ err }: { err: string }) {
  if (!err) return null;
  return <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>;
}

/* ─── Paket sotish ─── */
function AssignPackageModal({ onClose }: { onClose: () => void }) {
  const { data: packages = [], isLoading: pkgLoading } = usePackages();
  const assignPkg = useAssignPackage();

  const [studentId, setStudentId]   = useState("");
  const [packageId, setPackageId]   = useState("");
  const [method, setMethod]         = useState<Method>("naqd");
  const [expiresAt, setExpiresAt]   = useState("");
  const [paymentDue, setPaymentDue] = useState("");
  const [payLater, setPayLater]     = useState(false);
  const [err, setErr]               = useState("");

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

  return (
    <Modal title="Paket sotish" width={520} onClose={onClose}>
      <Field label="O'quvchi *">
        <StudentPicker studentId={studentId} onPick={setStudentId} />
      </Field>

      <Field label="Paket *">
        {pkgLoading ? (
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : (
          <select className="inp" value={packageId} onChange={e => setPackageId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Paket tanlang...</option>
            {packages.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.lessonsCount} dars — {fmt(p.price)} so'm
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="To'lov usuli">
        <MethodPicker value={method} onChange={setMethod} />
      </Field>

      <Field
        label="Paket (obuna) muddati"
        hint="Darslar qachongacha amal qiladi. Tugashiga 5 kun qolganda eslatma chiqadi."
      >
        <input type="date" className="inp" value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={payLater} onChange={e => setPayLater(e.target.checked)} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Hozir emas, keyinroq to'laydi</div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            Pul kelmagan deb belgilanadi. Keyin qisman ham to'lash mumkin.
          </div>
        </div>
      </label>

      {payLater && (
        <Field label="To'lov muddati *" hint="Pul qachongacha kelishi kerak. Bu paket muddatidan boshqa sana.">
          <input type="date" className="inp" value={paymentDue}
            onChange={e => setPaymentDue(e.target.value)} style={{ width: "100%" }} />
        </Field>
      )}

      <ErrText err={err} />
      <Actions onClose={onClose} onSubmit={handleSubmit} pending={assignPkg.isPending} />
    </Modal>
  );
}

/* ─── Paketsiz to'lov / qarz ─── */
function StandaloneChargeModal({ onClose }: { onClose: () => void }) {
  const createCharge = useCreateCharge();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount]       = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [note, setNote]           = useState("");
  const [err, setErr]             = useState("");

  async function handleSubmit() {
    if (!studentId) { setErr("O'quvchini tanlang"); return; }
    const num = Number(amount);
    if (!num || num <= 0) { setErr("Summani kiriting"); return; }
    setErr("");
    try {
      await createCharge.mutateAsync({
        studentId, amount: num,
        dueDate: dueDate || undefined,
        note: note || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return (
    <Modal title="Boshqa to'lov (paketsiz)" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
        Paket bilan bog'liq bo'lmagan majburiyat — masalan eski qarzni rasmiylashtirish
        yoki ro'yxatdan o'tish to'lovi. Keyin bu yerga qisman to'lovlar qo'shiladi.
      </div>

      <Field label="O'quvchi *">
        <StudentPicker studentId={studentId} onPick={setStudentId} />
      </Field>

      <Field label="Summa *">
        <input type="number" className="inp" value={amount}
          onChange={e => setAmount(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="To'lov muddati" hint="Bo'sh qoldirilsa muddatsiz bo'ladi va qarzdorga o'tmaydi.">
        <input type="date" className="inp" value={dueDate}
          onChange={e => setDueDate(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="Izoh">
        <input className="inp" value={note} placeholder="masalan: iyul oyi qarzi"
          onChange={e => setNote(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <ErrText err={err} />
      <Actions onClose={onClose} onSubmit={handleSubmit} pending={createCharge.isPending} />
    </Modal>
  );
}

/* ─── To'lov qabul qilish (qisman ham) ─── */
function AddPaymentModal({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const addPayment = useAddPayment();
  const [amount, setAmount] = useState(String(charge.balance));
  const [method, setMethod] = useState<Method>("naqd");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr]       = useState("");

  const num = Number(amount);
  const rest = charge.balance - (num || 0);

  async function handleSubmit() {
    if (!num || num <= 0) { setErr("Summani kiriting"); return; }
    setErr("");
    try {
      await addPayment.mutateAsync({ chargeId: charge.id, amount: num, method, paidAt });
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErr(msg ?? (e instanceof Error ? e.message : "Xatolik yuz berdi"));
    }
  }

  return (
    <Modal title="To'lov qabul qilish" onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
        <b>{charge.studentName}</b>{charge.packageName ? ` · ${charge.packageName}` : ""}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 13, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 10, flexWrap: "wrap" }}>
        <span>Jami: <b>{fmt(charge.amount)}</b></span>
        <span>To'langan: <b>{fmt(charge.paid)}</b></span>
        <span>Qoldiq: <b style={{ color: "#ef4444" }}>{fmt(charge.balance)}</b></span>
      </div>

      <Field
        label="To'lov summasi *"
        hint={num > 0 && rest > 0
          ? `Bu to'lovdan keyin ${fmt(rest)} so'm qoldiq qoladi (qisman to'lov).`
          : num > 0 && rest <= 0 ? "Bu to'lov bilan majburiyat to'liq yopiladi." : undefined}
      >
        <input type="number" className="inp" value={amount}
          onChange={e => setAmount(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
          onClick={() => setAmount(String(charge.balance))}>
          To'liq qoldiq
        </button>
        <button className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
          onClick={() => setAmount(String(Math.round(charge.balance / 2)))}>
          Yarmi
        </button>
      </div>

      <Field label="To'lov usuli">
        <MethodPicker value={method} onChange={setMethod} />
      </Field>

      <Field label="To'lov sanasi">
        <input type="date" className="inp" value={paidAt}
          onChange={e => setPaidAt(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <ErrText err={err} />
      <Actions onClose={onClose} onSubmit={handleSubmit} pending={addPayment.isPending} label="Qabul qilish" />
    </Modal>
  );
}

/* ─── Majburiyatni tahrirlash ─── */
function EditChargeModal({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const updateCharge = useUpdateCharge();
  const [amount, setAmount]       = useState(String(charge.amount));
  const [dueDate, setDueDate]     = useState(charge.dueDate ?? "");
  const [note, setNote]           = useState(charge.note ?? "");
  const [createdAt, setCreatedAt] = useState(charge.createdAt.slice(0, 10));
  const [err, setErr]             = useState("");

  async function handleSubmit() {
    const num = Number(amount);
    if (!num || num <= 0) { setErr("Summani kiriting"); return; }
    if (num < charge.paid) {
      setErr(`Summa qabul qilingan to'lovdan (${fmt(charge.paid)} so'm) kam bo'lishi mumkin emas`);
      return;
    }
    setErr("");
    try {
      await updateCharge.mutateAsync({
        id: charge.id, amount: num,
        dueDate: dueDate || null,
        note: note || undefined,
        createdAt,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return (
    <Modal title="To'lovni tahrirlash" onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{charge.studentName}</div>

      <Field label="Jami summa" hint={charge.paid > 0 ? `Qabul qilingan: ${fmt(charge.paid)} so'm` : undefined}>
        <input type="number" className="inp" value={amount}
          onChange={e => setAmount(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="Sana">
        <input type="date" className="inp" value={createdAt}
          onChange={e => setCreatedAt(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field
        label="To'lov muddati"
        hint="Pul qachongacha kelishi kerak. Shu sana o'tsa va qoldiq qolsa — Qarzdor. Paket muddati bu emas."
      >
        <input type="date" className="inp" value={dueDate}
          onChange={e => setDueDate(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <Field label="Izoh">
        <input className="inp" value={note} onChange={e => setNote(e.target.value)} style={{ width: "100%" }} />
      </Field>

      <ErrText err={err} />
      <Actions onClose={onClose} onSubmit={handleSubmit} pending={updateCharge.isPending} />
    </Modal>
  );
}
