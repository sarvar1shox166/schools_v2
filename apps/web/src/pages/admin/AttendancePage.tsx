import { useState } from "react";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";

/* ─── Types ─── */
type AttStatus = "keldi" | "kech" | "kelmadi";

type AttRow = {
  id: string;
  name: string;
  group: string;
  level: string;
  attendance: AttStatus[];
};

/* ─── Mock data ─── */
const DATES = ["12.05", "14.05", "16.05", "19.05", "21.05", "23.05", "26.05", "28.05"];

const MOCK_ROWS: AttRow[] = [
  { id:"1",  name:"Asilbek Komilov",   group:"A", level:"Boshlang'ich", attendance:["keldi","keldi","keldi","keldi","keldi","kech","keldi","kelmadi"] },
  { id:"2",  name:"Malika Rashidova",  group:"B", level:"3-razryad",    attendance:["keldi","keldi","keldi","keldi","keldi","keldi","keldi","kelmadi"] },
  { id:"3",  name:"Bobur Nazarov",     group:"C", level:"Boshlang'ich", attendance:["keldi","kelmadi","keldi","keldi","keldi","keldi","keldi","keldi"] },
  { id:"4",  name:"Sarvar Yo'ldoshev", group:"F", level:"1-razryad",    attendance:["keldi","keldi","keldi","kech","kelmadi","keldi","keldi","kelmadi"] },
  { id:"5",  name:"Gulnoza Tosheva",   group:"A", level:"Boshlang'ich", attendance:["keldi","keldi","keldi","kelmadi","kech","kelmadi","keldi","keldi"] },
  { id:"6",  name:"Javohir Saidov",    group:"D", level:"2-razryad",    attendance:["keldi","keldi","keldi","kelmadi","keldi","kelmadi","kech","keldi"] },
  { id:"7",  name:"Madina Aliyeva",    group:"B", level:"3-razryad",    attendance:["kech","kech","kelmadi","keldi","keldi","keldi","keldi","keldi"] },
  { id:"8",  name:"Diyor Karimov",     group:"E", level:"Nomzod",       attendance:["keldi","kelmadi","keldi","keldi","kelmadi","keldi","keldi","keldi"] },
  { id:"9",  name:"Sevara Mirzayeva",  group:"C", level:"Boshlang'ich", attendance:["keldi","keldi","keldi","keldi","keldi","kech","keldi","keldi"] },
  { id:"10", name:"Otabek Rahimov",    group:"F", level:"1-razryad",    attendance:["keldi","keldi","kelmadi","keldi","keldi","keldi","kech","keldi"] },
  { id:"11", name:"Laylo Ismoilova",   group:"A", level:"Boshlang'ich", attendance:["keldi","keldi","keldi","keldi","kech","keldi","keldi","keldi"] },
  { id:"12", name:"Aziz Tojiboyev",    group:"D", level:"2-razryad",    attendance:["keldi","keldi","keldi","keldi","keldi","keldi","keldi","keldi"] },
];

const GROUP_STUDENTS: Record<string, { id: string; name: string; level: string }[]> = {
  A: [
    { id:"1", name:"Asilbek Komilov",  level:"Boshlang'ich" },
    { id:"5", name:"Gulnoza Tosheva",  level:"Boshlang'ich" },
    { id:"11",name:"Laylo Ismoilova",  level:"Boshlang'ich" },
  ],
  B: [
    { id:"2", name:"Malika Rashidova", level:"3-razryad" },
    { id:"7", name:"Madina Aliyeva",   level:"3-razryad" },
  ],
  C: [
    { id:"3", name:"Bobur Nazarov",    level:"Boshlang'ich" },
    { id:"9", name:"Sevara Mirzayeva", level:"Boshlang'ich" },
  ],
  D: [
    { id:"6", name:"Javohir Saidov",   level:"2-razryad" },
    { id:"12",name:"Aziz Tojiboyev",   level:"2-razryad" },
  ],
  E: [
    { id:"8", name:"Diyor Karimov",    level:"Nomzod" },
  ],
  F: [
    { id:"4", name:"Sarvar Yo'ldoshev",level:"1-razryad" },
    { id:"10",name:"Otabek Rahimov",   level:"1-razryad" },
  ],
};

const GROUP_NAMES: Record<string, string> = {
  A: "Boshlang'ich — A",
  B: "Taktika — B",
  C: "Bolalar kursi — C",
  D: "Pozitsion — D",
  E: "Pro Trening — E",
  F: "Blitz klub — F",
};

/* status config */
const ST: Record<AttStatus, { icon: string; bg: string; color: string }> = {
  keldi:   { icon: "check", bg: "#dcfce7", color: "#16a34a" },
  kech:    { icon: "clock", bg: "#fef3c7", color: "#d97706" },
  kelmadi: { icon: "x",    bg: "#fee2e2", color: "#ef4444" },
};

function calcPct(a: AttStatus[]) {
  return Math.round((a.filter((s) => s === "keldi").length / a.length) * 100);
}

/* ─── Page ─── */
export default function AttendancePage() {
  const [rows] = useState<AttRow[]>(MOCK_ROWS);
  const [showModal, setShowModal] = useState(false);

  const allStatuses = rows.flatMap((r) => r.attendance);
  const keldi    = allStatuses.filter((s) => s === "keldi").length;
  const kech     = allStatuses.filter((s) => s === "kech").length;
  const kelmadi  = allStatuses.filter((s) => s === "kelmadi").length;
  const avgPct   = Math.round(allStatuses.length > 0 ? (keldi / allStatuses.length) * 100 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Davomat jurnali
        </h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="check" size={15} /> Davomat belgilash
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="percent" tone="s" value={`${avgPct}%`}  label="O'rtacha davomat"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>↗ +3% o'tgan oy</span>} />
        <StatCard icon="check"   tone="i" value={String(keldi)}   label="Kelganlar" />
        <StatCard icon="clock"   tone="w" value={String(kech)}    label="Kechikkanlar" />
        <StatCard icon="x"       tone="d" value={String(kelmadi)} label="Kelmaganlar" />
      </div>

      {/* Journal */}
      <Card style={{ padding: 0 }}>
        <CardHead icon="calendar" title="Davomat jadvali" sub={`Oxirgi ${DATES.length} dars`} />
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>O'QUVCHI</th>
                <th style={{ minWidth: 60 }}>GURUH</th>
                {DATES.map((d) => (
                  <th key={d} style={{ textAlign: "center", minWidth: 60 }}>{d}</th>
                ))}
                <th style={{ textAlign: "center", minWidth: 60 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = calcPct(r.attendance);
                const pctColor = pct >= 80 ? "#16a34a" : pct >= 60 ? "#b45309" : "#ef4444";
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="with-av">
                        <Avatar name={r.name} size="sm" style={{ borderRadius: 9, flexShrink: 0 }} />
                        <span className="cell-main">{r.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 14, color: "var(--text-dim)" }}>
                      {r.group}
                    </td>
                    {r.attendance.map((status, i) => {
                      const cfg = ST[status];
                      return (
                        <td key={i} style={{ textAlign: "center" }}>
                          <div style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 32, height: 32, borderRadius: 8,
                            background: cfg.bg, color: cfg.color,
                          }}>
                            <Icon name={cfg.icon} size={14} />
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px",
                        borderRadius: 99, background: pctColor + "1a",
                        color: pctColor, fontWeight: 800, fontSize: 13,
                      }}>
                        {pct} %
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && <MarkModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

/* ─── Mark attendance modal ─── */
function MarkModal({ onClose }: { onClose: () => void }) {
  const [group, setGroup] = useState("A");
  const students = GROUP_STUDENTS[group] ?? [];
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });

  function setStatus(id: string, s: AttStatus) {
    setStatuses((prev) => ({ ...prev, [id]: s }));
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Davomat belgilash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Guruh selector + date */}
        <div style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dim)" }}>Guruh:</span>
            <div style={{ position: "relative" }}>
              <select
                className="inp"
                value={group}
                onChange={(e) => { setGroup(e.target.value); setStatuses({}); }}
                style={{ appearance: "none", paddingRight: 30, minWidth: 160, fontWeight: 700 }}
              >
                {Object.keys(GROUP_NAMES).map((k) => (
                  <option key={k} value={k}>{GROUP_NAMES[k]}</option>
                ))}
              </select>
              <Icon name="chevronDown" size={13} style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)",
              }} />
            </div>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-faint)", fontWeight: 600 }}>{dateStr}</span>
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Students */}
        <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {students.map((s) => {
            const cur = statuses[s.id] ?? "keldi";
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface-2)",
              }}>
                <Avatar name={s.name} size="sm" style={{ borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{s.level}</div>
                </div>
                {/* Toggle buttons */}
                <div style={{ display: "flex", gap: 6 }}>
                  <AttBtn label="Keldi"   icon="check" status="keldi"   active={cur === "keldi"}   onClick={() => setStatus(s.id, "keldi")}   />
                  <AttBtn label="Kech"    icon="clock" status="kech"    active={cur === "kech"}    onClick={() => setStatus(s.id, "kech")}    />
                  <AttBtn label="Kelmadi" icon="x"     status="kelmadi" active={cur === "kelmadi"} onClick={() => setStatus(s.id, "kelmadi")} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, padding: "18px 24px" }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }} onClick={onClose}>
            <Icon name="check" size={15} /> Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

function AttBtn({ label, icon, status, active, onClick }: {
  label: string; icon: string; status: AttStatus; active: boolean; onClick: () => void;
}) {
  const cfg = ST[status];
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 8,
        border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
        background: active ? cfg.bg : "transparent",
        color: active ? cfg.color : "var(--text-faint)",
        fontWeight: 700, fontSize: 12.5, cursor: "pointer",
        transition: "all .15s",
      }}
    >
      <Icon name={icon} size={12} /> {label}
    </button>
  );
}
