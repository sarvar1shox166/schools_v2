import { useMemo, useState } from "react";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";

/* ─── Types ─── */
type Status = "diagnostika" | "royxatdan" | "rad";

type Application = {
  id: string;
  name: string;
  age: number;
  phone: string;
  source: string;
  level: string;
  teacher: string;
  status: Status;
  when: string;
};

/* ─── Mock data ─── */
const MOCK_APPS: Application[] = [
  { id:"1", name:"Asilbek Komilov",   age:9,  phone:"+998 90 111 22 33", source:"Instagram", level:"Boshlang'ich", teacher:"Alisher Karimov",   status:"diagnostika", when:"Bugun 10:24"  },
  { id:"2", name:"Malika Rashidova",  age:13, phone:"+998 91 444 55 66", source:"Telegram",  level:"O'rta",        teacher:"Malika Yusupova",   status:"diagnostika", when:"Bugun 09:10"  },
  { id:"3", name:"Jasur Eshonov",     age:11, phone:"+998 93 222 11 44", source:"Tavsiya",   level:"Boshlang'ich", teacher:"Bobur Rahimov",     status:"diagnostika", when:"Kecha 18:30"  },
  { id:"4", name:"Nilufar Saidova",   age:8,  phone:"+998 94 555 66 77", source:"Veb-sayt",  level:"Boshlang'ich", teacher:"Alisher Karimov",   status:"diagnostika", when:"Kecha 14:00"  },
  { id:"5", name:"Sardor Aliyev",     age:15, phone:"+998 95 888 99 00", source:"Instagram", level:"Yuqori",       teacher:"Malika Yusupova",   status:"royxatdan",   when:"2 kun oldin"  },
  { id:"6", name:"Diyora Karimova",   age:10, phone:"+998 97 333 22 11", source:"Telegram",  level:"Boshlang'ich", teacher:"Bobur Rahimov",     status:"royxatdan",   when:"2 kun oldin"  },
  { id:"7", name:"Otabek Yusupov",    age:14, phone:"+998 99 111 00 22", source:"Tavsiya",   level:"O'rta",        teacher:"Alisher Karimov",   status:"royxatdan",   when:"3 kun oldin"  },
  { id:"8", name:"Madina Tosheva",    age:9,  phone:"+998 90 777 66 55", source:"Instagram", level:"Boshlang'ich", teacher:"Dilnoza Ergasheva", status:"royxatdan",   when:"4 kun oldin"  },
  { id:"9", name:"Bekzod Rahimov",    age:17, phone:"+998 91 222 33 44", source:"Boshqa",    level:"Professional", teacher:"Sardor Nazarov",    status:"rad",         when:"5 kun oldin"  },
];

/* ─── Helpers ─── */
const SOURCE_STYLE: Record<string, { bg: string; color: string }> = {
  Instagram: { bg: "#fce7f3", color: "#db2777" },
  Telegram:  { bg: "#dbeafe", color: "#2563eb" },
  Tavsiya:   { bg: "#d1fae5", color: "#059669" },
  "Veb-sayt":{ bg: "#ede9fe", color: "#7c3aed" },
  Boshqa:    { bg: "var(--surface-3)", color: "var(--text-faint)" },
};

const STATUS_STYLE: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  diagnostika: { label: "Diagnostika",      bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  royxatdan:   { label: "Ro'yxatdan o'tdi", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  rad:         { label: "Rad etildi",       bg: "var(--surface-3)", color: "var(--text-faint)", border: "var(--border)" },
};

const FUNNEL_BARS = [
  { key: "diagnostika" as Status, label: "Diagnostika",      color: "#3F8CFF", bg: "#eff6ff" },
  { key: "royxatdan"   as Status, label: "Ro'yxatdan o'tdi", color: "#22c55e", bg: "#f0fdf4" },
  { key: "rad"         as Status, label: "Rad etildi",       color: "#94a3b8", bg: "var(--surface-3)" },
];

const FILTER_TABS: { v: Status | "hammasi"; label: string }[] = [
  { v: "hammasi",    label: "Hammasi" },
  { v: "diagnostika",label: "Diagnostika" },
  { v: "royxatdan",  label: "Ro'yxatdan o'tdi" },
  { v: "rad",        label: "Rad etildi" },
];

/* ─── Page ─── */
export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>(MOCK_APPS);
  const [tab, setTab] = useState<Status | "hammasi">("hammasi");

  const total      = apps.length;
  const diagCount  = apps.filter((a) => a.status === "diagnostika").length;
  const regCount   = apps.filter((a) => a.status === "royxatdan").length;
  const radCount   = apps.filter((a) => a.status === "rad").length;
  const conversion = total > 0 ? Math.round((regCount / total) * 100) : 0;

  /* Teacher stats */
  const teacherStats = useMemo(() => {
    const map = new Map<string, { jami: number; diag: number; qoldi: number; ketdi: number }>();
    for (const a of apps) {
      if (!map.has(a.teacher)) map.set(a.teacher, { jami: 0, diag: 0, qoldi: 0, ketdi: 0 });
      const s = map.get(a.teacher)!;
      s.jami++;
      if (a.status === "diagnostika") s.diag++;
      if (a.status === "royxatdan")   s.qoldi++;
      if (a.status === "rad")         s.ketdi++;
    }
    return [...map.entries()].map(([name, s]) => ({
      name,
      ...s,
      conv: s.jami > 0 ? Math.round((s.qoldi / s.jami) * 100) : 0,
    }));
  }, [apps]);

  /* Filtered list */
  const filtered = tab === "hammasi" ? apps : apps.filter((a) => a.status === tab);

  function deleteApp(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Arizalar — {total} ta
        </h2>
        <button className="btn primary">
          <Icon name="userPlus" size={15} /> Ariza qo'shish
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid cols-4">
        <StatCard icon="filter"     tone="i" value={String(total)}      label="Jami arizalar"
          delta={<span style={deltaStyle("up")}>↗ +5 bu hafta</span>} />
        <StatCard icon="calendar"   tone="w" value={String(diagCount)}  label="Diagnostikada"
          delta={<span style={deltaStyle("bad")}>⚠ bog'laning</span>} />
        <StatCard icon="check"      tone="s" value={String(regCount)}   label="Ro'yxatdan o'tdi" />
        <StatCard icon="trendingUp" tone="s" value={`${conversion}%`}  label="Konversiya"
          delta={<span style={deltaStyle("up")}>↗ o'tish foizi</span>} />
      </div>

      {/* Funnel + Teacher stats row */}
      <div className="grid l-2-1">

        {/* Diagnostika voronkasi */}
        <Card>
          <div style={{ padding: "18px 22px 8px", fontWeight: 800, fontSize: 15.5 }}>
            Diagnostika voronkasi
          </div>
          <div style={{ padding: "8px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {FUNNEL_BARS.map((bar) => {
              const count = apps.filter((a) => a.status === bar.key).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={bar.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Dot + label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: 160, flexShrink: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: bar.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dim)" }}>{bar.label}</span>
                  </div>
                  {/* Bar with count inside */}
                  <div style={{ flex: 1, height: 36, borderRadius: 8, background: "var(--surface-3)", position: "relative", overflow: "hidden" }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, height: "100%",
                      width: `${Math.max(pct, pct > 0 ? 6 : 0)}%`,
                      background: bar.color, borderRadius: 8,
                      display: "flex", alignItems: "center", paddingLeft: 13,
                      transition: "width .6s var(--ease)",
                    }}>
                      {count > 0 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{count}</span>}
                    </div>
                  </div>
                  {/* Percentage */}
                  <span style={{ width: 36, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text-faint)", flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Teacher stats */}
        <Card>
          <CardHead icon="teacher" title="O'qituvchi statistikasi" sub="Diagnostika, qoldi, ketdi" />
          <table className="tbl">
            <thead>
              <tr>
                <th>O'QITUVCHI</th>
                <th style={{ textAlign: "center" }}>JAMI</th>
                <th style={{ textAlign: "center", color: "var(--info)" }}>DIAGNOSTIKA</th>
                <th style={{ textAlign: "center", color: "var(--success)" }}>QOLDI ✓</th>
                <th style={{ textAlign: "center", color: "var(--danger)" }}>KETDI ✗</th>
                <th>KONVERSIYA</th>
              </tr>
            </thead>
            <tbody>
              {teacherStats.map((t) => (
                <tr key={t.name}>
                  <td>
                    <div className="with-av">
                      <Avatar name={t.name} size="sm" />
                      <span style={{ fontWeight: 650, fontSize: 13.5 }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <CountBubble n={t.jami} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <CountBubble n={t.diag} color="var(--info)" />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <CountBubble n={t.qoldi} color="var(--success)" />
                  </td>
                  <td style={{ textAlign: "center", fontSize: 13.5, fontWeight: 700 }}>
                    {t.ketdi}
                  </td>
                  <td>
                    <MiniBar pct={t.conv} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

      </div>

      {/* Applications table */}
      <Card>
        {/* Filter tabs */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
          {FILTER_TABS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: tab === t.v ? "1.5px solid var(--border-strong)" : "1.5px solid transparent",
                background: tab === t.v ? "var(--surface)" : "transparent",
                fontWeight: tab === t.v ? 700 : 600,
                fontSize: 13.5, color: tab === t.v ? "var(--text)" : "var(--text-faint)",
                cursor: "pointer", transition: "all .15s",
                boxShadow: tab === t.v ? "var(--shadow-xs)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>ISM</th>
                <th>TELEFON</th>
                <th>MANBA</th>
                <th>DARAJA</th>
                <th>O'QITUVCHI</th>
                <th>BOSQICH</th>
                <th>VAQT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const src = SOURCE_STYLE[a.source] ?? SOURCE_STYLE["Boshqa"];
                const st  = STATUS_STYLE[a.status];
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="with-av">
                        <Avatar name={a.name} size="sm" />
                        <div>
                          <div className="cell-main">{a.name}</div>
                          <div className="cell-sub">{a.age} yosh</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 13 }}>{a.phone}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", height: 24,
                        padding: "0 10px", borderRadius: 999,
                        background: src.bg, color: src.color,
                        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {a.source}
                      </span>
                    </td>
                    <td style={{ fontSize: 13.5, color: "var(--text-dim)", fontWeight: 600 }}>{a.level}</td>
                    <td style={{ fontSize: 13.5 }}>{a.teacher}</td>
                    <td>
                      <span style={{
                        display: "inline-flex", alignItems: "center", height: 26,
                        padding: "0 10px", borderRadius: 7,
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.border}`,
                        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="cell-sub">{a.when}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="iconbtn" style={{ width: 30, height: 30 }} title="Tahrirlash">
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          className="iconbtn"
                          style={{ width: 30, height: 30, color: "var(--danger)" }}
                          title="O'chirish"
                          onClick={() => deleteApp(a.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty"><Icon name="filter" size={26} /><div>Arizalar topilmadi</div></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}

/* ─── Sub-components ─── */
function CountBubble({ n, color }: { n: number; color?: string }) {
  if (n === 0) return <span style={{ fontSize: 13.5, color: "var(--text-faint)", fontWeight: 700 }}>0</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 26, height: 26, borderRadius: 8,
      background: color ? `color-mix(in oklab, ${color} 14%, var(--surface))` : "var(--surface-3)",
      color: color ?? "var(--text-dim)", fontWeight: 700, fontSize: 13,
    }}>
      {n}
    </span>
  );
}

function MiniBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#22c55e" : pct > 0 ? "#f59e0b" : "transparent";
  const textColor = pct >= 100 ? "#16a34a" : pct > 0 ? "#b45309" : "var(--text-faint)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--surface-3)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: textColor, width: 36, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}

function deltaStyle(dir: "up" | "bad"): React.CSSProperties {
  return {
    fontSize: 12, fontWeight: 700,
    color: dir === "up" ? "var(--success)" : "var(--warn)",
  };
}
