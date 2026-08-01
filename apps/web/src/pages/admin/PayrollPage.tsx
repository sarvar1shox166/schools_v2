import { useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, CardHead, Icon, StatCard, fmtSom } from "@chess-school/ui";
import {
  usePayrollSummary, useTeacherPayouts, useAddTeacherPayout, useDeleteTeacherPayout,
  type TeacherPayrollSummary,
} from "../../lib/queries.js";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function AddPayoutModal({ teacher, onClose }: { teacher: TeacherPayrollSummary; onClose: () => void }) {
  const addPayout = useAddTeacherPayout();
  const [amount, setAmount] = useState(teacher.balance > 0 ? String(Math.round(teacher.balance)) : "");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));

  async function handleSubmit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await addPayout.mutateAsync({ teacherId: teacher.teacherId, amount: amt, note: note || undefined, paidAt });
    onClose();
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 420, maxWidth: "calc(100vw - 32px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Pul o'tkazish</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 18 }}>{teacher.teacherName} kartasiga qo'lda o'tkazilgan pulni qayd eting</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>SUMMA (SO'M)</label>
            <input className="inp" style={{ width: "100%" }} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Masalan: 500000" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>SANA</label>
            <input className="inp" style={{ width: "100%" }} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>IZOH (IXTIYORIY)</label>
            <input className="inp" style={{ width: "100%" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: karta orqali" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!Number(amount) || addPayout.isPending} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {addPayout.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PayoutHistory({ teacherId }: { teacherId: string }) {
  const { data: payouts = [], isLoading } = useTeacherPayouts(teacherId);
  const deletePayout = useDeleteTeacherPayout();

  if (isLoading) return <div style={{ padding: "14px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>;
  if (payouts.length === 0) return <div style={{ padding: "14px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Hali pul o'tkazilmagan</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0" }}>
      {payouts.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 750, fontSize: 13.5 }}>{fmtSom(p.amount)} so'm</div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
              {p.paidAt}{p.createdByName ? ` · ${p.createdByName}` : ""}{p.note ? ` · ${p.note}` : ""}
            </div>
          </div>
          <button
            onClick={() => deletePayout.mutate({ teacherId, payoutId: p.id })}
            disabled={deletePayout.isPending}
            title="O'chirish"
            style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="x" size={12} style={{ color: "#ef4444" }} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TeacherPayrollRow({ teacher }: { teacher: TeacherPayrollSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const balancePositive = teacher.balance > 0;

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", rowGap: 10, padding: "14px 22px" }}>
        <Avatar name={teacher.teacherName} size="sm" />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 750, fontSize: 14.5 }}>{teacher.teacherName}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
            Bu oy ishlagani: {fmtSom(teacher.earnedThisPeriod)} so'm · Jami to'langan: {fmtSom(teacher.totalPaid)} so'm
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, letterSpacing: "0.04em" }}>
            {balancePositive ? "QARZ" : "BALANS"}
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: balancePositive ? "#f59e0b" : "#22c55e" }}>
            {fmtSom(Math.abs(teacher.balance))} so'm
          </div>
        </div>
        <button className="btn primary" style={{ flexShrink: 0 }} onClick={() => setShowModal(true)}>
          <Icon name="wallet" size={13} /> Pul o'tkazish
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="chevronDown" size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "0 22px 14px" }}>
          <PayoutHistory teacherId={teacher.teacherId} />
        </div>
      )}
      {showModal && <AddPayoutModal teacher={teacher} onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const { data: summary = [], isLoading } = usePayrollSummary(period);

  const totalEarned = summary.reduce((s, t) => s + t.earnedThisPeriod, 0);
  const totalPaid = summary.reduce((s, t) => s + t.totalPaid, 0);
  const totalOwed = summary.reduce((s, t) => s + Math.max(0, t.balance), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>O'qituvchilarga to'lov</h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>
            Ishlagan pulini qo'lda (naqd/karta) o'tkazganingizni shu yerda qayd eting
          </div>
        </div>
        <input type="month" className="inp" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>

      <div className="grid cols-3">
        <StatCard icon="income" tone="i" value={`${fmtSom(totalEarned)} so'm`} label="Bu oy ishlagani (jami)" />
        <StatCard icon="wallet" tone="s" value={`${fmtSom(totalPaid)} so'm`} label="Jami to'langan (lifetime)" />
        <StatCard icon="alert" tone="w" value={`${fmtSom(totalOwed)} so'm`} label="Jami qarz" />
      </div>

      <Card style={{ padding: 0 }}>
        <CardHead icon="wallet" title="O'qituvchilar" sub="Balans = shu oy ishlagani − jami to'langan (lifetime)" />
        <div>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : summary.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)" }}>O'qituvchi topilmadi</div>
          ) : summary.map((t) => <TeacherPayrollRow key={t.teacherId} teacher={t} />)}
        </div>
      </Card>
    </div>
  );
}
