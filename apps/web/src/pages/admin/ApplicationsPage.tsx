import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import {
  useApplications,
  useApplicationStats,
  useCreateApplication,
  useUpdateApplication,
  useConvertApplication,
  useDeleteApplication,
  useTeachers,
  Application,
} from "../../lib/queries.js";

/* ─── Helpers ─── */
const SOURCE_STYLE: Record<string, { bg: string; color: string }> = {
  telegram:  { bg: "#dbeafe", color: "#2563eb" },
  website:   { bg: "#ede9fe", color: "#7c3aed" },
  phone:     { bg: "#d1fae5", color: "#059669" },
  referral:  { bg: "#d1fae5", color: "#059669" },
  instagram: { bg: "#fce7f3", color: "#db2777" },
  other:     { bg: "var(--surface-3)", color: "var(--text-faint)" },
};

const SOURCE_LABEL: Record<string, string> = {
  telegram: "Telegram", website: "Veb-sayt", phone: "Telefon", referral: "Tavsiya",
  instagram: "Instagram", other: "Boshqa",
};

const LEVELS = ["Boshlang'ich", "O'rta", "Yuqori", "Professional"];
const HOURS = [
  "09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00","19:00","20:00",
];

type AppStatus = Application["status"];

const STATUS_STYLE: Record<AppStatus, { label: string; bg: string; color: string; border: string }> = {
  diagnostika:    { label: "Diagnostika",      bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  royxatdan_otdi: { label: "Ro'yxatdan o'tdi", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  rad:            { label: "Rad etildi",       bg: "var(--surface-3)", color: "var(--text-faint)", border: "var(--border)" },
};

const FUNNEL_BARS: { key: AppStatus; label: string; color: string }[] = [
  { key: "diagnostika",    label: "Diagnostika",      color: "#3F8CFF" },
  { key: "royxatdan_otdi", label: "Ro'yxatdan o'tdi", color: "#22c55e" },
  { key: "rad",            label: "Rad etildi",       color: "#94a3b8" },
];

type FilterTab = AppStatus | "hammasi";

const FILTER_TABS: { v: FilterTab; label: string }[] = [
  { v: "hammasi",        label: "Hammasi" },
  { v: "diagnostika",    label: "Diagnostika" },
  { v: "royxatdan_otdi", label: "Ro'yxatdan o'tdi" },
  { v: "rad",            label: "Rad etildi" },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Kecha";
  return `${days} kun oldin`;
}

/* ─── Page ─── */
export default function ApplicationsPage() {
  const [tab, setTab]           = useState<FilterTab>("hammasi");
  const [showCreate, setShowCreate] = useState(false);
  const [editApp, setEditApp]   = useState<Application | null>(null);
  const [convertResult, setConvertResult] = useState<{ studentId: string; tempPassword: string } | null>(null);

  const { data: apps = [], isLoading } = useApplications();
  const { data: appStats } = useApplicationStats();
  const deleteApp   = useDeleteApplication();
  const updateApp   = useUpdateApplication();
  const convertApp  = useConvertApplication();

  const total          = apps.length;
  const diagnostika    = appStats?.diagnostika ?? 0;
  const royxatdanOtdi  = appStats?.royxatdan_otdi ?? 0;
  const conversion     = total > 0 ? Math.round((royxatdanOtdi / total) * 100) : 0;

  /* Diagnostic-teacher stats derived from app list */
  const teacherStats = useMemo(() => {
    const map = new Map<string, { jami: number; diagnostika: number; qoldi: number; ketdi: number }>();
    for (const a of apps) {
      if (!a.diagnosticTeacherId) continue;
      const name = a.diagnosticTeacherName ?? "Noma'lum";
      if (!map.has(name)) map.set(name, { jami: 0, diagnostika: 0, qoldi: 0, ketdi: 0 });
      const s = map.get(name)!;
      s.jami++;
      if (a.status === "diagnostika")    s.diagnostika++;
      if (a.status === "royxatdan_otdi") s.qoldi++;
      if (a.status === "rad")            s.ketdi++;
    }
    return [...map.entries()].map(([name, s]) => ({
      name, ...s,
      conv: s.jami > 0 ? Math.round((s.qoldi / s.jami) * 100) : 0,
    }));
  }, [apps]);

  const filtered = tab === "hammasi" ? apps : apps.filter(a => a.status === tab);

  async function handleDelete(id: string) {
    if (!confirm("Bu arizani o'chirishni tasdiqlaysizmi?")) return;
    try { await deleteApp.mutateAsync(id); } catch { /* ignore */ }
  }

  async function handleConvert(id: string) {
    try {
      const result = await convertApp.mutateAsync(id);
      setConvertResult(result);
    } catch { /* ignore */ }
  }

  async function handleStatusChange(id: string, status: AppStatus) {
    try { await updateApp.mutateAsync({ id, status }); } catch { /* ignore */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Arizalar — {total} ta
        </h2>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          <Icon name="userPlus" size={15} /> Ariza qo'shish
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid cols-4">
        <StatCard icon="filter"     tone="i" value={String(total)}         label="Jami arizalar" />
        <StatCard icon="calendar"   tone="w" value={String(diagnostika)}   label="Diagnostikada" />
        <StatCard icon="check"      tone="s" value={String(royxatdanOtdi)} label="Ro'yxatdan o'tdi" />
        <StatCard icon="trendingUp" tone="s" value={`${conversion}%`}      label="Konversiya"
          delta={<span style={ds("up")}>↗ o'tish foizi</span>} />
      </div>

      {/* Funnel + Teacher stats row */}
      <div className="grid l-2-1">

        {/* Voronka */}
        <Card>
          <div style={{ padding: "18px 22px 8px", fontWeight: 800, fontSize: 15.5 }}>
            Diagnostika voronkasi
          </div>
          <div style={{ padding: "8px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {FUNNEL_BARS.map(bar => {
              const count = apps.filter(a => a.status === bar.key).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={bar.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: 150, flexShrink: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: bar.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dim)" }}>{bar.label}</span>
                  </div>
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
                  <span style={{ width: 36, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text-faint)", flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Diagnostic teacher stats */}
        <Card>
          <CardHead icon="teacher" title="O'qituvchi statistikasi" sub="Diagnostika bo'yicha" />
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
              {teacherStats.map(t => (
                <tr key={t.name}>
                  <td>
                    <div className="with-av">
                      <Avatar name={t.name} size="sm" />
                      <span style={{ fontWeight: 650, fontSize: 13.5 }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}><CountBubble n={t.jami} /></td>
                  <td style={{ textAlign: "center" }}><CountBubble n={t.diagnostika} color="var(--info)" /></td>
                  <td style={{ textAlign: "center" }}><CountBubble n={t.qoldi} color="var(--success)" /></td>
                  <td style={{ textAlign: "center", fontSize: 13.5, fontWeight: 700 }}>{t.ketdi}</td>
                  <td><MiniBar pct={t.conv} /></td>
                </tr>
              ))}
              {teacherStats.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>–</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Applications table */}
      <Card>
        {/* Filter tabs */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
          {FILTER_TABS.map(t => (
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

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : (
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
                {filtered.map(a => {
                  const src = SOURCE_STYLE[a.source] ?? SOURCE_STYLE.other;
                  const st  = STATUS_STYLE[a.status];
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="with-av">
                          <Avatar name={a.fullName} size="sm" />
                          <div>
                            <div className="cell-main">{a.fullName}</div>
                            {a.age && <div className="cell-sub">{a.age} yosh</div>}
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
                          {SOURCE_LABEL[a.source] ?? a.source}
                        </span>
                      </td>
                      <td style={{ fontSize: 13.5, color: "var(--text-dim)", fontWeight: 600 }}>{a.level ?? "–"}</td>
                      <td style={{ fontSize: 13.5 }}>{a.diagnosticTeacherName ?? "–"}</td>
                      <td>
                        <select
                          value={a.status}
                          onChange={e => handleStatusChange(a.id, e.target.value as AppStatus)}
                          style={{
                            display: "inline-flex", alignItems: "center", height: 26,
                            padding: "0 10px", borderRadius: 7,
                            background: st.bg, color: st.color,
                            border: `1px solid ${st.border}`,
                            fontSize: 12, fontWeight: 700,
                            cursor: "pointer", appearance: "none",
                          }}
                        >
                          {(["diagnostika", "royxatdan_otdi", "rad"] as AppStatus[]).map(s => (
                            <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="cell-sub">{relTime(a.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {a.status === "royxatdan_otdi" && !a.convertedStudentId && (
                            <button
                              className="iconbtn"
                              style={{ width: 30, height: 30, color: "var(--success)" }}
                              title="O'quvchiga o'tkazish"
                              onClick={() => handleConvert(a.id)}
                            >
                              <Icon name="userPlus" size={13} />
                            </button>
                          )}
                          <button
                            className="iconbtn"
                            style={{ width: 30, height: 30 }}
                            title="Tahrirlash"
                            onClick={() => setEditApp(a)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            className="iconbtn"
                            style={{ width: 30, height: 30, color: "var(--danger)" }}
                            title="O'chirish"
                            onClick={() => handleDelete(a.id)}
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
        )}
      </Card>

      {showCreate && <CreateAppModal onClose={() => setShowCreate(false)} />}
      {editApp && <EditAppModal app={editApp} onClose={() => setEditApp(null)} />}
      {convertResult && (
        <ConvertResultModal
          result={convertResult}
          onClose={() => setConvertResult(null)}
        />
      )}
    </div>
  );
}

/* ─── Shared form fields for Create/Edit ─── */
function DiagnosticFields({
  level, setLevel,
  diagnosticTeacherId, setDiagnosticTeacherId,
  diagnosticDate, setDiagnosticDate,
  diagnosticTime, setDiagnosticTime,
  meetingPlatform, setMeetingPlatform,
  meetingUrl, setMeetingUrl,
}: {
  level: string; setLevel: (v: string) => void;
  diagnosticTeacherId: string; setDiagnosticTeacherId: (v: string) => void;
  diagnosticDate: string; setDiagnosticDate: (v: string) => void;
  diagnosticTime: string; setDiagnosticTime: (v: string) => void;
  meetingPlatform: "zoom" | "meet"; setMeetingPlatform: (v: "zoom" | "meet") => void;
  meetingUrl: string; setMeetingUrl: (v: string) => void;
}) {
  const { data: teachers = [] } = useTeachers();

  return (
    <>
      <FieldRow label="Bosqich">
        <div style={{
          display: "inline-flex", alignItems: "center", height: 28,
          padding: "0 12px", borderRadius: 999,
          background: "#eff6ff", color: "#2563eb", fontSize: 12.5, fontWeight: 700,
        }}>
          Diagnostika
        </div>
      </FieldRow>

      <FieldRow label="Daraja">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LEVELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l === level ? "" : l)}
              style={{
                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 12.5, fontWeight: 700,
                border: l === level ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: l === level ? "var(--accent)" : "var(--surface)",
                color: l === level ? "#fff" : "var(--text-dim)",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Diagnostika o'qituvchisi">
        <select className="inp" value={diagnosticTeacherId} onChange={e => setDiagnosticTeacherId(e.target.value)} style={{ width: "100%" }}>
          <option value="">Tanlanmagan</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
      </FieldRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FieldRow label="Diagnostika sanasi">
          <input className="inp" type="date" value={diagnosticDate} min={new Date().toISOString().slice(0, 10)}
            onChange={e => setDiagnosticDate(e.target.value)} style={{ width: "100%" }} />
        </FieldRow>
        <FieldRow label="Soati">
          <select className="inp" value={diagnosticTime} onChange={e => setDiagnosticTime(e.target.value)} style={{ width: "100%" }}>
            {HOURS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </FieldRow>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <FieldRow label="Platforma">
          <select className="inp" value={meetingPlatform} onChange={e => setMeetingPlatform(e.target.value as "zoom" | "meet")} style={{ width: "100%" }}>
            <option value="zoom">Zoom</option>
            <option value="meet">Google Meet</option>
          </select>
        </FieldRow>
        <FieldRow label="📎 Havola">
          <input className="inp" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} style={{ width: "100%" }} placeholder="https://..." />
        </FieldRow>
      </div>
    </>
  );
}

/* ─── Create Application Modal ─── */
function CreateAppModal({ onClose }: { onClose: () => void }) {
  const createApp = useCreateApplication();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [age, setAge]           = useState("");
  const [source, setSource]     = useState("other");
  const [level, setLevel]       = useState("");
  const [diagnosticTeacherId, setDiagnosticTeacherId] = useState("");
  const [diagnosticDate, setDiagnosticDate]           = useState("");
  const [diagnosticTime, setDiagnosticTime]           = useState("15:00");
  const [meetingPlatform, setMeetingPlatform]         = useState<"zoom" | "meet">("zoom");
  const [meetingUrl, setMeetingUrl]                   = useState("");
  const [err, setErr]           = useState("");

  async function handleSubmit() {
    if (!fullName.trim()) { setErr("Ism kiritilishi shart"); return; }
    if (!phone.trim())    { setErr("Telefon kiritilishi shart"); return; }
    if (diagnosticTeacherId && !diagnosticDate) { setErr("Diagnostika sanasi tanlanishi shart"); return; }
    setErr("");
    try {
      await createApp.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age ? Number(age) : undefined,
        level: level || undefined,
        source: source || undefined,
        diagnosticTeacherId: diagnosticTeacherId || undefined,
        diagnosticDate: diagnosticTeacherId ? diagnosticDate : undefined,
        diagnosticTime: diagnosticTeacherId ? diagnosticTime : undefined,
        meetingPlatform,
        meetingUrl: meetingUrl || undefined,
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
          <div style={{ fontWeight: 800, fontSize: 17 }}>Ariza qo'shish</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow label="Ism familya *">
            <input className="inp" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%" }} placeholder="To'liq ismi" />
          </FieldRow>
          <FieldRow label="Telefon *">
            <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%" }} placeholder="+998 90 000 00 00" />
          </FieldRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label="Yoshi">
              <input className="inp" type="number" value={age} onChange={e => setAge(e.target.value)} style={{ width: "100%" }} min={4} max={99} placeholder="10" />
            </FieldRow>
            <FieldRow label="Manba">
              <select className="inp" value={source} onChange={e => setSource(e.target.value)} style={{ width: "100%" }}>
                <option value="telegram">Telegram</option>
                <option value="website">Veb-sayt</option>
                <option value="phone">Telefon</option>
                <option value="referral">Tavsiya</option>
                <option value="instagram">Instagram</option>
                <option value="other">Boshqa</option>
              </select>
            </FieldRow>
          </div>

          <DiagnosticFields
            level={level} setLevel={setLevel}
            diagnosticTeacherId={diagnosticTeacherId} setDiagnosticTeacherId={setDiagnosticTeacherId}
            diagnosticDate={diagnosticDate} setDiagnosticDate={setDiagnosticDate}
            diagnosticTime={diagnosticTime} setDiagnosticTime={setDiagnosticTime}
            meetingPlatform={meetingPlatform} setMeetingPlatform={setMeetingPlatform}
            meetingUrl={meetingUrl} setMeetingUrl={setMeetingUrl}
          />

          {err && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Bekor</button>
            <button
              className="btn primary"
              style={{ flex: 2, justifyContent: "center" }}
              onClick={handleSubmit}
              disabled={createApp.isPending}
            >
              <Icon name="check" size={15} />
              {createApp.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Edit Application Modal ─── */
function EditAppModal({ app, onClose }: { app: Application; onClose: () => void }) {
  const updateApp = useUpdateApplication();

  const [fullName, setFullName] = useState(app.fullName);
  const [phone, setPhone]       = useState(app.phone);
  const [age, setAge]           = useState(app.age ? String(app.age) : "");
  const [source, setSource]     = useState(app.source);
  const [level, setLevel]       = useState(app.level ?? "");
  const [diagnosticTeacherId, setDiagnosticTeacherId] = useState(app.diagnosticTeacherId ?? "");
  const [diagnosticDate, setDiagnosticDate]           = useState(app.diagnosticDate?.slice(0, 10) ?? "");
  const [diagnosticTime, setDiagnosticTime]           = useState(app.diagnosticTime?.slice(0, 5) ?? "15:00");
  const [meetingPlatform, setMeetingPlatform]         = useState<"zoom" | "meet">(app.meetingPlatform ?? "zoom");
  const [meetingUrl, setMeetingUrl]                   = useState(app.meetingUrl ?? "");
  const [err, setErr]           = useState("");

  async function handleSubmit() {
    if (!fullName.trim()) { setErr("Ism kiritilishi shart"); return; }
    if (!phone.trim())    { setErr("Telefon kiritilishi shart"); return; }
    setErr("");
    try {
      await updateApp.mutateAsync({
        id: app.id,
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age ? Number(age) : undefined,
        level: level || undefined,
        diagnosticTeacherId: diagnosticTeacherId || null,
        diagnosticDate: diagnosticTeacherId ? diagnosticDate : null,
        diagnosticTime: diagnosticTeacherId ? diagnosticTime : null,
        meetingPlatform,
        meetingUrl: meetingUrl || null,
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
          <div style={{ fontWeight: 800, fontSize: 17 }}>Arizani tahrirlash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldRow label="Ism familya *">
            <input className="inp" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="Telefon *">
            <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldRow label="Yoshi">
              <input className="inp" type="number" value={age} onChange={e => setAge(e.target.value)} style={{ width: "100%" }} min={4} max={99} />
            </FieldRow>
            <FieldRow label="Manba">
              <select className="inp" value={source} onChange={e => setSource(e.target.value as Application["source"])} style={{ width: "100%" }}>
                <option value="telegram">Telegram</option>
                <option value="website">Veb-sayt</option>
                <option value="phone">Telefon</option>
                <option value="referral">Tavsiya</option>
                <option value="instagram">Instagram</option>
                <option value="other">Boshqa</option>
              </select>
            </FieldRow>
          </div>

          <DiagnosticFields
            level={level} setLevel={setLevel}
            diagnosticTeacherId={diagnosticTeacherId} setDiagnosticTeacherId={setDiagnosticTeacherId}
            diagnosticDate={diagnosticDate} setDiagnosticDate={setDiagnosticDate}
            diagnosticTime={diagnosticTime} setDiagnosticTime={setDiagnosticTime}
            meetingPlatform={meetingPlatform} setMeetingPlatform={setMeetingPlatform}
            meetingUrl={meetingUrl} setMeetingUrl={setMeetingUrl}
          />

          {err && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{err}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Bekor</button>
            <button
              className="btn primary"
              style={{ flex: 2, justifyContent: "center" }}
              onClick={handleSubmit}
              disabled={updateApp.isPending}
            >
              <Icon name="check" size={15} />
              {updateApp.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Convert result modal ─── */
function ConvertResultModal({
  result,
  onClose,
}: {
  result: { studentId: string; tempPassword: string };
  onClose: () => void;
}) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 201,
        background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width: 420, maxWidth: "100%",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
        padding: "28px 28px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={28} style={{ color: "#16a34a" }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>O'quvchi yaratildi!</div>
        <div style={{ fontSize: 14, color: "var(--text-dim)" }}>
          O'quvchi tizimga qo'shildi. Vaqtinchalik parolni o'quvchiga yuboring.
        </div>
        <div style={{
          background: "var(--surface-2)", borderRadius: 12, padding: "14px 20px",
          width: "100%", border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>Vaqtinchalik parol</div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {result.tempPassword}
          </div>
        </div>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>
          Yaxshi
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ─── Small helpers ─── */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

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

function ds(dir: "up" | "bad"): React.CSSProperties {
  return { fontSize: 12, fontWeight: 700, color: dir === "up" ? "var(--success)" : "var(--warn)" };
}
