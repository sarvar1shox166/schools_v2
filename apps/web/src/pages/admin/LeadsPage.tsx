import { useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";
import {
  useLeads, useLeadStats, useUpdateLeadStatus, useConvertLead, Lead,
} from "../../lib/queries.js";
import { DiagnosticFields, ConvertResultModal } from "./ApplicationsPage.js";

/* ─── Helpers ─── */
type LeadStatus = Lead["status"];

const STATUS_STYLE: Record<LeadStatus, { label: string; bg: string; color: string; border: string }> = {
  yangi:      { label: "Yangi",         bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  otkazildi:  { label: "O'tkazildi",    bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  rad:        { label: "Rad etildi",    bg: "var(--surface-3)", color: "var(--text-faint)", border: "var(--border)" },
};

type FilterTab = LeadStatus | "hammasi";

const FILTER_TABS: { v: FilterTab; label: string }[] = [
  { v: "hammasi",   label: "Hammasi" },
  { v: "yangi",     label: "Yangi" },
  { v: "otkazildi", label: "O'tkazildi" },
  { v: "rad",       label: "Rad etildi" },
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
export default function LeadsPage() {
  const [tab, setTab] = useState<FilterTab>("hammasi");
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [convertResult, setConvertResult] = useState<{ studentId: string; tempPassword: string } | null>(null);

  const { data: leads = [], isLoading } = useLeads();
  const { data: stats } = useLeadStats();
  const updateStatus = useUpdateLeadStatus();

  const total = leads.length;
  const yangi = stats?.yangi ?? 0;
  const otkazildi = stats?.otkazildi ?? 0;
  const rad = stats?.rad ?? 0;

  const filtered = tab === "hammasi" ? leads : leads.filter(l => l.status === tab);

  async function handleReject(id: string) {
    if (!confirm("Bu lidni rad etishni tasdiqlaysizmi?")) return;
    try { await updateStatus.mutateAsync({ id, status: "rad" }); } catch { /* toast global handlerda ko'rsatiladi */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Lidlar — {total} ta
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
            Landing sahifadagi "Bepul dars olish" formasidan kelgan so'rovlar
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid cols-4">
        <StatCard icon="target"     tone="a" value={String(total)}     label="Jami lidlar" />
        <StatCard icon="clock"      tone="w" value={String(yangi)}     label="Yangi (ko'rib chiqilmagan)" />
        <StatCard icon="check"      tone="s" value={String(otkazildi)} label="Arizaga o'tkazildi" />
        <StatCard icon="x"          tone="d" value={String(rad)}       label="Rad etildi" />
      </div>

      {/* Leads table */}
      <Card>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  <th>DARAJA</th>
                  <th>QULAY KUNLAR</th>
                  <th>HOLAT</th>
                  <th>VAQT</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const st = STATUS_STYLE[l.status];
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="with-av">
                          <Avatar name={l.fullName} size="sm" />
                          <div>
                            <div className="cell-main">{l.fullName}</div>
                            {(l.age || l.ageRange) && <div className="cell-sub">{l.age ? `${l.age} yosh` : `${l.ageRange} yosh`}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>{l.phone}</td>
                      <td style={{ fontSize: 13.5, color: "var(--text-dim)", fontWeight: 600 }}>{l.level ?? "–"}</td>
                      <td style={{ fontSize: 13.5, color: "var(--text-dim)", fontWeight: 600 }}>{l.preferredDays ?? "–"}</td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", height: 26,
                          padding: "0 10px", borderRadius: 7,
                          background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="cell-sub">{relTime(l.createdAt)}</td>
                      <td>
                        {l.status === "yangi" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="iconbtn"
                              style={{ width: 30, height: 30, color: "var(--success)" }}
                              title="Diagnostikaga o'tkazish"
                              onClick={() => setConvertLead(l)}
                            >
                              <Icon name="calendarCheck" size={13} />
                            </button>
                            <button
                              className="iconbtn"
                              style={{ width: 30, height: 30, color: "var(--danger)" }}
                              title="Rad etish"
                              onClick={() => handleReject(l.id)}
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty"><Icon name="target" size={26} /><div>Lidlar topilmadi</div></div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {convertLead && (
        <ConvertLeadModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onConverted={setConvertResult}
        />
      )}
      {convertResult && (
        <ConvertResultModal result={convertResult} mode="created" onClose={() => setConvertResult(null)} />
      )}
    </div>
  );
}

/* ─── Convert lead → diagnostika modal ─── */
function ConvertLeadModal({
  lead, onClose, onConverted,
}: {
  lead: Lead;
  onClose: () => void;
  onConverted: (result: { studentId: string; tempPassword: string }) => void;
}) {
  const convertLead = useConvertLead();

  const [level, setLevel] = useState(lead.level ?? "");
  const [diagnosticTeacherId, setDiagnosticTeacherId] = useState("");
  const [diagnosticDate, setDiagnosticDate] = useState("");
  const [diagnosticTime, setDiagnosticTime] = useState("15:00");
  const [meetingPlatform, setMeetingPlatform] = useState<"zoom" | "meet">("zoom");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit() {
    if (!diagnosticTeacherId) { setErr("Diagnostika o'qituvchisi tanlanishi shart"); return; }
    if (!diagnosticDate)      { setErr("Diagnostika sanasi tanlanishi shart"); return; }
    setErr("");
    try {
      const res = await convertLead.mutateAsync({
        id: lead.id,
        diagnosticTeacherId, diagnosticDate, diagnosticTime,
        meetingPlatform, meetingUrl: meetingUrl || undefined,
      });
      onClose();
      onConverted({ studentId: res.studentId, tempPassword: res.tempPassword });
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
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Diagnostikaga o'tkazish</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 3 }}>{lead.fullName} · {lead.phone}</div>
          </div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10,
            background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
            fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5,
          }}>
            <Icon name="lightbulb" size={16} style={{ color: "var(--accent-text)", flexShrink: 0, marginTop: 1 }} />
            <div>Tasdiqlansa, o'quvchi hisobi va diagnostika darsi avtomatik yaratiladi — bu lid "Arizalar" bo'limida ko'rina boshlaydi.</div>
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
              disabled={convertLead.isPending}
            >
              <Icon name="check" size={15} />
              {convertLead.isPending ? "O'tkazilmoqda..." : "Diagnostikaga o'tkazish"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
