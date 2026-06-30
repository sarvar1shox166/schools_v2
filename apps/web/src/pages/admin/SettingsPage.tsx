import { useState, useRef, useEffect } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  useBrandSettings, useUpdateBrandSettings,
  usePricingTiers, useCreatePricingTier, useUpdatePricingTier, useDeletePricingTier,
  useSystemSettings, useUpdateSystemSettings,
  useSalarySettings, useUpdateSalarySetting,
  type PricingTier, type SalarySetting, type SystemSettings,
} from "../../lib/queries.js";

/* ─── types ──────────────────────────────────────────────── */
type Tab = "brend" | "narxlar" | "rollar" | "umumiy" | "ish-haqi";

interface RoleRow {
  id: string;
  name: string;
  desc: string;
  color: string;
  count: number;
  perms: Record<PermKey, boolean>;
}

type PermKey = "dashboard" | "oquvchilar" | "tolovlar" | "hisobotlar" | "kontent" | "sozlamalar";

/* ─── mock role data (local state — no real API for custom roles yet) ── */
const INIT_ROLES: RoleRow[] = [
  { id:"r1", name:"Administrator", desc:"To'liq huquq",    color:"#3b82f6", count:2, perms:{ dashboard:true,  oquvchilar:true,  tolovlar:true,  hisobotlar:true,  kontent:true,  sozlamalar:true  } },
  { id:"r2", name:"Operator",      desc:"Ariza va davomat",color:"#f59e0b", count:3, perms:{ dashboard:true,  oquvchilar:true,  tolovlar:false, hisobotlar:false, kontent:false, sozlamalar:false } },
  { id:"r3", name:"O'qituvchi",    desc:"O'z guruhi",      color:"#22c55e", count:8, perms:{ dashboard:true,  oquvchilar:true,  tolovlar:false, hisobotlar:true,  kontent:true,  sozlamalar:false } },
  { id:"r4", name:"Buxgalter",     desc:"Moliya bo'limi",  color:"#a855f7", count:1, perms:{ dashboard:true,  oquvchilar:false, tolovlar:true,  hisobotlar:true,  kontent:false, sozlamalar:false } },
];

const PERM_COLS: { key: PermKey; label: string }[] = [
  { key:"dashboard",   label:"DASHBOARD" },
  { key:"oquvchilar",  label:"O'QUVCHILAR" },
  { key:"tolovlar",    label:"TO'LOVLAR" },
  { key:"hisobotlar",  label:"HISOBOTLAR" },
  { key:"kontent",     label:"KONTENT" },
  { key:"sozlamalar",  label:"SOZLAMALAR" },
];

/* ─── helpers ─────────────────────────────────────────────── */
function fmt(n: number) {
  return n.toLocaleString("ru-RU") + " so'm";
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: on ? "#2563eb" : "#d1d5db",
        transition: "background .2s", position: "relative", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 22 : 2,
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        transition: "left .2s", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
      }} />
    </button>
  );
}

/* ─── BrendTab ────────────────────────────────────────────── */
function BrendTab() {
  const { data, isLoading } = useBrandSettings();
  const updateMut = useUpdateBrandSettings();

  const [logo, setLogo]       = useState<string | null>(null);
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [tg, setTg]           = useState("");
  const [saved, setSaved]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setTg(data.telegram ?? "");
    }
  }, [data]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  function save() {
    updateMut.mutate(
      { name, phone, address, telegram: tg },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <Card style={{ maxWidth: 560, padding: "28px 32px" }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14 }}>Yuklanmoqda...</div>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 560, padding: "28px 32px" }}>
      <h3 style={{ margin: "0 0 22px", fontWeight: 800, fontSize: 16 }}>Akademiya brendi</h3>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, overflow: "hidden",
          background: logo ? "transparent" : "#3b82f6",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {logo
            ? <img src={logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 28, color: "#fff" }}>♞</span>
          }
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/svg+xml" style={{ display: "none" }} onChange={onFile} />
          <button className="btn" onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Icon name="download" size={14} /> Logo yuklash
          </button>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>PNG yoki SVG, kamida 256×256px</div>
        </div>
      </div>

      {[
        { label: "Akademiya nomi", value: name,    set: setName },
        { label: "Telefon",         value: phone,   set: setPhone },
        { label: "Manzil",          value: address, set: setAddress },
        { label: "Telegram kanal",  value: tg,      set: setTg },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-dim)" }}>
            {f.label}
          </label>
          <input
            className="input"
            value={f.value}
            onChange={e => f.set(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>
      ))}

      {updateMut.isError && (
        <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>
          Xatolik yuz berdi. Qaytadan urinib ko'ring.
        </div>
      )}

      <button
        className="btn primary"
        onClick={save}
        disabled={updateMut.isPending}
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
      >
        {saved
          ? <><Icon name="check" size={14} /> Saqlandi!</>
          : updateMut.isPending
            ? <><Icon name="clock" size={14} /> Saqlanmoqda...</>
            : <><Icon name="check" size={14} /> Saqlash</>
        }
      </button>
    </Card>
  );
}

/* ─── NarxlarTab ──────────────────────────────────────────── */
function NarxlarTab() {
  const { data: tiers = [], isLoading, isError } = usePricingTiers();
  const updateMut = useUpdatePricingTier();
  const createMut = useCreatePricingTier();
  const deleteMut = useDeletePricingTier();

  const [editId, setEditId]     = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState("");
  const [editIndiv, setEditIndiv] = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newIndiv, setNewIndiv] = useState("");

  function startEdit(t: PricingTier) {
    setEditId(t.id);
    setEditGroup(String(t.groupMonthly));
    setEditIndiv(String(t.individualPerLesson));
  }

  function saveEdit(id: string) {
    updateMut.mutate(
      { id, groupMonthly: Number(editGroup) || 0, individualPerLesson: Number(editIndiv) || 0 },
      { onSuccess: () => setEditId(null) }
    );
  }

  function addTier() {
    if (!newName.trim()) return;
    const colors = ["#ef4444","#f97316","#22c55e","#3b82f6","#a855f7","#06b6d4"];
    createMut.mutate(
      {
        name: newName.trim(),
        color: colors[tiers.length % colors.length],
        groupMonthly: Number(newGroup) || 0,
        individualPerLesson: Number(newIndiv) || 0,
        sortOrder: tiers.length,
      },
      { onSuccess: () => { setNewName(""); setNewGroup(""); setNewIndiv(""); setShowAdd(false); } }
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: "var(--text-dim)", letterSpacing: ".06em", borderBottom: "1px solid var(--border)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 16px", borderBottom: "1px solid var(--border)", fontSize: 14,
  };

  if (isLoading) {
    return <Card style={{ padding: 24 }}><div style={{ color: "var(--text-dim)", fontSize: 14 }}>Yuklanmoqda...</div></Card>;
  }
  if (isError) {
    return <Card style={{ padding: 24 }}><div style={{ color: "#dc2626", fontSize: 14 }}>Ma'lumotlarni yuklashda xatolik.</div></Card>;
  }

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "#dbeafe",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="wallet" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Kurs narxlari</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Daraja bo'yicha oylik to'lov</div>
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={14} /> Daraja
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>DARAJA</th>
            <th style={thStyle}>GURUH DARSI (OY)</th>
            <th style={thStyle}>INDIVIDUAL (DARS)</th>
            <th style={{ ...thStyle, width: 90 }}></th>
          </tr>
        </thead>
        <tbody>
          {tiers.map(t => (
            <tr key={t.id}>
              <td style={tdStyle}>
                <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span>
              </td>
              <td style={tdStyle}>
                {editId === t.id
                  ? <input className="input" value={editGroup} onChange={e => setEditGroup(e.target.value)}
                      style={{ width: 120 }} autoFocus />
                  : <strong>{fmt(t.groupMonthly)}</strong>
                }
              </td>
              <td style={tdStyle}>
                {editId === t.id
                  ? <input className="input" value={editIndiv} onChange={e => setEditIndiv(e.target.value)}
                      style={{ width: 120 }} />
                  : fmt(t.individualPerLesson)
                }
              </td>
              <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16 }}>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {editId === t.id ? (
                    <button className="btn primary" onClick={() => saveEdit(t.id)} disabled={updateMut.isPending}
                      style={{ padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="check" size={13} />
                    </button>
                  ) : (
                    <button className="btn" onClick={() => startEdit(t)} style={{
                      width: 32, height: 32, padding: 0, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="edit" size={14} />
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => deleteMut.mutate(t.id)}
                    disabled={deleteMut.isPending}
                    style={{
                      width: 32, height: 32, padding: 0, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#dc2626",
                    }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAdd && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Nomi</label>
            <input className="input" placeholder="Daraja nomi" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: 180 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Guruh (oy)</label>
            <input className="input" placeholder="500000" value={newGroup} onChange={e => setNewGroup(e.target.value)} style={{ width: 120 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Individual (dars)</label>
            <input className="input" placeholder="150000" value={newIndiv} onChange={e => setNewIndiv(e.target.value)} style={{ width: 120 }} />
          </div>
          <button className="btn primary" onClick={addTier} disabled={createMut.isPending} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="check" size={14} /> Qo'shish
          </button>
          <button className="btn" onClick={() => setShowAdd(false)}>Bekor</button>
        </div>
      )}
    </Card>
  );
}

/* ─── RollarTab (local state only — no real API for custom roles yet) ── */
function RollarTab() {
  const [roles, setRoles] = useState<RoleRow[]>(INIT_ROLES);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  function togglePerm(roleId: string, perm: PermKey) {
    setRoles(prev => prev.map(r => r.id === roleId
      ? { ...r, perms: { ...r.perms, [perm]: !r.perms[perm] } }
      : r
    ));
  }

  function addRole() {
    if (!newRoleName.trim()) return;
    const colors = ["#ef4444","#f97316","#22c55e","#3b82f6","#a855f7","#06b6d4","#ec4899"];
    setRoles(prev => [...prev, {
      id: "r" + Date.now(),
      name: newRoleName.trim(),
      desc: newRoleDesc.trim() || "—",
      color: colors[prev.length % colors.length],
      count: 0,
      perms: { dashboard:false, oquvchilar:false, tolovlar:false, hisobotlar:false, kontent:false, sozlamalar:false },
    }]);
    setNewRoleName(""); setNewRoleDesc(""); setShowAdd(false);
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: "var(--text-dim)", letterSpacing: ".06em", borderBottom: "1px solid var(--border)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 14px", borderBottom: "1px solid var(--border)", fontSize: 14,
    textAlign: "center",
  };

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "#f3e8ff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="shield" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Rollar va ruxsatlar</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Kim nimani ko'ra oladi</div>
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={14} /> Rol
        </button>
      </div>
      <div style={{ padding: "10px 20px", background: "#fef9c3", borderBottom: "1px solid #fde68a", display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "#92400e" }}>
        ⚠️ Rollar boshqaruvi hali backend bilan bog'lanmagan — bu yerda kiritilgan o'zgarishlar saqlanmaydi.
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>ROL</th>
              <th style={thStyle}>XODIM</th>
              {PERM_COLS.map(c => (
                <th key={c.key} style={thStyle}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id} style={{ transition: "background .15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <td style={{ ...tdStyle, textAlign: "left", paddingLeft: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: r.color, display: "inline-block", flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{r.desc}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 8, background: "var(--surface-2)",
                    fontSize: 13, fontWeight: 700,
                  }}>{r.count}</span>
                </td>
                {PERM_COLS.map(c => (
                  <td key={c.key} style={tdStyle}>
                    <button
                      onClick={() => togglePerm(r.id, c.key)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
                        background: r.perms[c.key] ? "#dcfce7" : "transparent",
                        color: r.perms[c.key] ? "#16a34a" : "var(--text-dim)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        transition: "background .15s, color .15s",
                        fontSize: 15,
                      }}
                      title={r.perms[c.key] ? "Ruxsat berilgan" : "Ruxsat yo'q"}
                    >
                      {r.perms[c.key] ? "✓" : "—"}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Rol nomi</label>
            <input className="input" placeholder="Masalan: Registrator" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} style={{ width: 180 }} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Tavsif</label>
            <input className="input" placeholder="Qisqacha tavsif" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} style={{ width: 180 }} />
          </div>
          <button className="btn primary" onClick={addRole} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="check" size={14} /> Qo'shish
          </button>
          <button className="btn" onClick={() => setShowAdd(false)}>Bekor</button>
        </div>
      )}
    </Card>
  );
}

/* ─── UmumiyTab ───────────────────────────────────────────── */
const SYSTEM_TOGGLES: { key: keyof SystemSettings; label: string }[] = [
  { key: "autoOperator",   label: "Yangi ariza avtomatik operatorga" },
  { key: "debtReminder",   label: "Qarzdorlik 5 kunda eslatma" },
  { key: "onlinePayment",  label: "To'lovni Click/Payme qabul qilish" },
  { key: "selfUnregister", label: "O'quvchi o'zi ro'yxatdan o'tishi" },
  { key: "telegramBot",    label: "Telegram bot integratsiya" },
];

function UmumiyTab() {
  const { data, isLoading, isError } = useSystemSettings();
  const updateMut = useUpdateSystemSettings();

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    autoOperator: true, debtReminder: true, onlinePayment: true,
    selfUnregister: false, telegramBot: true,
  });
  const [lang, setLang]           = useState("uz");
  const [currency, setCurrency]   = useState("UZS");
  const [tz, setTz]               = useState("Asia/Tashkent");
  const [yearStart, setYearStart] = useState("09-01");
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    if (data) {
      setToggles({
        autoOperator:   data.autoOperator,
        debtReminder:   data.debtReminder,
        onlinePayment:  data.onlinePayment,
        selfUnregister: data.selfUnregister,
        telegramBot:    data.telegramBot,
      });
      setLang(data.language ?? "uz");
      setCurrency(data.currency ?? "UZS");
      setTz(data.timezone ?? "Asia/Tashkent");
      setYearStart(data.yearStart ?? "09-01");
    }
  }, [data]);

  function toggle(key: string) {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    updateMut.mutate(
      {
        autoOperator:   toggles.autoOperator,
        debtReminder:   toggles.debtReminder,
        onlinePayment:  toggles.onlinePayment,
        selfUnregister: toggles.selfUnregister,
        telegramBot:    toggles.telegramBot,
        language: lang,
        currency,
        timezone: tz,
        yearStart,
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  if (isLoading) {
    return <div style={{ color: "var(--text-dim)", fontSize: 14, padding: 8 }}>Yuklanmoqda...</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", alignItems: "start" }}>
      <Card style={{ padding: "24px 28px" }}>
        <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16 }}>Tizim sozlamalari</h3>
        {isError && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>Yuklab bo'lmadi.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {SYSTEM_TOGGLES.map(t => (
            <div key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 14, color: "var(--text)" }}>{t.label}</span>
              <Toggle on={!!toggles[t.key]} onChange={() => toggle(t.key)} />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: "24px 28px" }}>
        <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16 }}>Til va hudud</h3>
        {[
          { label: "Interfeys tili",   value: lang,      set: setLang,      opts: [{ v:"uz", l:"O'zbekcha" },{ v:"ru", l:"Русский" },{ v:"en", l:"English" }] },
          { label: "Valyuta",          value: currency,  set: setCurrency,  opts: [{ v:"UZS", l:"So'm (UZS)" },{ v:"USD", l:"USD" },{ v:"EUR", l:"EUR" }] },
          { label: "Vaqt mintaqasi",   value: tz,        set: setTz,        opts: [{ v:"Asia/Tashkent", l:"UTC+5 (Toshkent)" },{ v:"UTC", l:"UTC+0" },{ v:"Europe/Moscow", l:"UTC+3" }] },
          { label: "O'quv yili boshi", value: yearStart, set: setYearStart, opts: [{ v:"09-01", l:"1-sentabr" },{ v:"01-01", l:"1-yanvar" },{ v:"07-01", l:"1-iyul" }] },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>
              {f.label}
            </label>
            <select
              className="input"
              value={f.value}
              onChange={e => f.set(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            >
              {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}

        {updateMut.isError && (
          <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>Saqlashda xatolik.</div>
        )}

        <button className="btn primary" onClick={save} disabled={updateMut.isPending} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          {saved
            ? <><Icon name="check" size={14} /> Saqlandi!</>
            : updateMut.isPending
              ? <><Icon name="clock" size={14} /> Saqlanmoqda...</>
              : <><Icon name="check" size={14} /> Saqlash</>
          }
        </button>
      </Card>
    </div>
  );
}

/* ─── IshHaqiTab ──────────────────────────────────────────── */
const SALARY_TYPE_LABELS: Record<string, string> = {
  per_lesson:     "Dars boshiga",
  monthly_fixed:  "Oylik sobit",
  percent_income: "% to'lovdan",
};

function IshHaqiTab() {
  const { data: settings = [], isLoading, isError } = useSalarySettings();
  const updateMut = useUpdateSalarySetting();

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState<Partial<SalarySetting>>({});

  function startEdit(s: SalarySetting) {
    setEditId(s.teacherId);
    setForm({ ...s });
  }

  function cancelEdit() {
    setEditId(null);
    setForm({});
  }

  function saveEdit() {
    if (!editId) return;
    updateMut.mutate(
      { teacherId: editId, ...form },
      { onSuccess: () => { setEditId(null); setForm({}); } }
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: "var(--text-dim)", letterSpacing: ".06em", borderBottom: "1px solid var(--border)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 16px", borderBottom: "1px solid var(--border)", fontSize: 14,
  };

  if (isLoading) {
    return <Card style={{ padding: 24 }}><div style={{ color: "var(--text-dim)", fontSize: 14 }}>Yuklanmoqda...</div></Card>;
  }
  if (isError) {
    return <Card style={{ padding: 24 }}><div style={{ color: "#dc2626", fontSize: 14 }}>Yuklab bo'lmadi.</div></Card>;
  }

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#dcfce7",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="wallet" size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Ish haqi sozlamalari</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>O'qituvchilar ish haqi turi va stavkalari</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              <th style={thStyle}>O'QITUVCHI</th>
              <th style={thStyle}>ISH HAQI TURI</th>
              <th style={thStyle}>STAVKA / MIQDOR</th>
              <th style={thStyle}>KOEFFITSIENT</th>
              <th style={{ ...thStyle, width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {settings.map(s => {
              const isEditing = editId === s.teacherId;
              const currentType = (form.salaryType ?? s.salaryType);
              return (
                <tr key={s.teacherId}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{s.teacherName}</div>
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <select
                        className="input"
                        value={currentType}
                        onChange={e => setForm(f => ({ ...f, salaryType: e.target.value as SalarySetting["salaryType"] }))}
                        style={{ width: 160 }}
                      >
                        <option value="per_lesson">Dars boshiga</option>
                        <option value="monthly_fixed">Oylik sobit</option>
                        <option value="percent_income">% to'lovdan</option>
                      </select>
                    ) : (
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                        background: s.salaryType === "monthly_fixed" ? "#dbeafe" : s.salaryType === "percent_income" ? "#fef3c7" : "#dcfce7",
                        color: s.salaryType === "monthly_fixed" ? "#1d4ed8" : s.salaryType === "percent_income" ? "#b45309" : "#15803d",
                      }}>
                        {SALARY_TYPE_LABELS[s.salaryType]}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {currentType === "per_lesson" && (
                          <>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "var(--text-dim)", width: 76 }}>Guruh:</span>
                              <input className="input" style={{ width: 100 }}
                                value={form.groupRate ?? s.groupRate}
                                onChange={e => setForm(f => ({ ...f, groupRate: Number(e.target.value) }))} />
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "var(--text-dim)", width: 76 }}>Individual:</span>
                              <input className="input" style={{ width: 100 }}
                                value={form.individualRate ?? s.individualRate}
                                onChange={e => setForm(f => ({ ...f, individualRate: Number(e.target.value) }))} />
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "var(--text-dim)", width: 76 }}>Diagnostik:</span>
                              <input className="input" style={{ width: 100 }}
                                value={form.diagnosticRate ?? s.diagnosticRate}
                                onChange={e => setForm(f => ({ ...f, diagnosticRate: Number(e.target.value) }))} />
                            </div>
                          </>
                        )}
                        {currentType === "monthly_fixed" && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text-dim)", width: 76 }}>Oylik:</span>
                            <input className="input" style={{ width: 120 }}
                              value={form.monthlyAmount ?? s.monthlyAmount}
                              onChange={e => setForm(f => ({ ...f, monthlyAmount: Number(e.target.value) }))} />
                          </div>
                        )}
                        {currentType === "percent_income" && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--text-dim)", width: 76 }}>%:</span>
                            <input className="input" style={{ width: 80 }}
                              value={form.incomePercent ?? s.incomePercent}
                              onChange={e => setForm(f => ({ ...f, incomePercent: Number(e.target.value) }))} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
                        {s.salaryType === "per_lesson"
                          ? `Guruh: ${fmt(s.groupRate)} / Individual: ${fmt(s.individualRate)}`
                          : s.salaryType === "monthly_fixed"
                            ? fmt(s.monthlyAmount)
                            : `${s.incomePercent}%`
                        }
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      currentType === "per_lesson" ? (
                        <input className="input" style={{ width: 80 }}
                          value={form.retentionCoef ?? s.retentionCoef}
                          onChange={e => setForm(f => ({ ...f, retentionCoef: Number(e.target.value) }))} />
                      ) : <span style={{ color: "var(--text-dim)", fontSize: 13 }}>—</span>
                    ) : (
                      s.salaryType === "per_lesson"
                        ? <span style={{ fontWeight: 600 }}>{s.retentionCoef}x</span>
                        : <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn primary" onClick={saveEdit} disabled={updateMut.isPending}
                          style={{ padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check" size={13} />
                        </button>
                        <button className="btn" onClick={cancelEdit} style={{ padding: "4px 10px", fontSize: 12 }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button className="btn" onClick={() => startEdit(s)} style={{
                        width: 32, height: 32, padding: 0, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name="edit" size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {settings.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
                  O'qituvchilar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {updateMut.isError && (
        <div style={{ padding: "12px 20px", color: "#dc2626", fontSize: 13, borderTop: "1px solid var(--border)" }}>
          Saqlashda xatolik yuz berdi.
        </div>
      )}
    </Card>
  );
}

/* ─── main ────────────────────────────────────────────────── */
const TABS: { id: Tab; label: string }[] = [
  { id: "brend",    label: "Brend" },
  { id: "narxlar",  label: "Narxlar" },
  { id: "rollar",   label: "Rollar" },
  { id: "umumiy",   label: "Umumiy" },
  { id: "ish-haqi", label: "Ish haqi" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("brend");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Sozlamalar</h2>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: "var(--surface-2)", borderRadius: 10,
          padding: 3, gap: 2,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all .15s",
                background: tab === t.id ? "#fff" : "transparent",
                color: tab === t.id ? "var(--text)" : "var(--text-dim)",
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "brend"    && <BrendTab />}
      {tab === "narxlar"  && <NarxlarTab />}
      {tab === "rollar"   && <RollarTab />}
      {tab === "umumiy"   && <UmumiyTab />}
      {tab === "ish-haqi" && <IshHaqiTab />}
    </div>
  );
}
