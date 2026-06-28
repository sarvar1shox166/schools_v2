import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  usePackages, useCreatePackage, useUpdatePackage, useDeletePackage,
  type Package,
} from "../../lib/queries.js";

const TIER_LABELS: Record<string, string> = { standard: "Standard", pro: "Pro" };
const TYPE_LABELS: Record<string, string> = { group: "Guruhlik", individual: "Individual" };
const DELIVERY_LABELS: Record<string, string> = { online: "Online", offline: "Offline" };

// Pre-filled presets matching the 4 pricing tiers
const PRESETS = [
  { name: "Guruhlik onlayn Standard", lessonType: "group" as const, tier: "standard" as const, delivery: "online" as const, price: 450000, lessonsCount: 8, lessonsPerMonth: 8, lessonsPerWeek: 2, maxStudents: 5, durationMinutes: 50 },
  { name: "Guruhlik onlayn Pro",      lessonType: "group" as const, tier: "pro" as const,      delivery: "online" as const, price: 600000, lessonsCount: 12, lessonsPerMonth: 12, lessonsPerWeek: 3, maxStudents: 5, durationMinutes: 50 },
  { name: "Individual onlayn Standard",lessonType: "individual" as const, tier: "standard" as const, delivery: "online" as const, price: 900000, lessonsCount: 8, lessonsPerMonth: 8, lessonsPerWeek: 2, maxStudents: 1, durationMinutes: 45 },
  { name: "Individual onlayn Pro",     lessonType: "individual" as const, tier: "pro" as const,      delivery: "online" as const, price: 1250000, lessonsCount: 12, lessonsPerMonth: 12, lessonsPerWeek: 3, maxStudents: 1, durationMinutes: 45 },
];

const EMPTY_FORM = {
  name: "", price: 0, lessonsCount: 8,
  lessonType: "group" as "group" | "individual",
  tier: "standard" as "standard" | "pro",
  delivery: "online" as "online" | "offline",
  lessonsPerMonth: "" as number | "",
  lessonsPerWeek: "" as number | "",
  durationMinutes: "" as number | "",
  maxStudents: "" as number | "",
};
type Form = typeof EMPTY_FORM;

function fmt(n: number) {
  return n.toLocaleString("uz-UZ");
}

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  color: "var(--text-faint)", marginBottom: 5, textTransform: "uppercase",
};

function PackageModal({
  pkg, onClose,
}: {
  pkg: Package | null; // null = create mode
  onClose: () => void;
}) {
  const create = useCreatePackage();
  const update = useUpdatePackage();

  const [form, setForm] = useState<Form>(pkg ? {
    name: pkg.name, price: pkg.price, lessonsCount: pkg.lessonsCount,
    lessonType: pkg.lessonType, tier: pkg.tier, delivery: pkg.delivery,
    lessonsPerMonth: pkg.lessonsPerMonth ?? "",
    lessonsPerWeek: pkg.lessonsPerWeek ?? "",
    durationMinutes: pkg.durationMinutes ?? "",
    maxStudents: pkg.maxStudents ?? "",
  } : { ...EMPTY_FORM });

  function applyPreset(p: typeof PRESETS[0]) {
    setForm({
      name: p.name, price: p.price, lessonsCount: p.lessonsCount,
      lessonType: p.lessonType, tier: p.tier, delivery: p.delivery,
      lessonsPerMonth: p.lessonsPerMonth, lessonsPerWeek: p.lessonsPerWeek,
      durationMinutes: p.durationMinutes, maxStudents: p.maxStudents,
    });
  }

  function num(v: number | "") { return v === "" ? undefined : Number(v); }

  async function handleSave() {
    const payload = {
      name: form.name.trim(), price: Number(form.price), lessonsCount: Number(form.lessonsCount),
      lessonType: form.lessonType, tier: form.tier, delivery: form.delivery,
      lessonsPerMonth: num(form.lessonsPerMonth),
      lessonsPerWeek: num(form.lessonsPerWeek),
      durationMinutes: num(form.durationMinutes),
      maxStudents: num(form.maxStudents),
    };
    if (!payload.name || !payload.price || !payload.lessonsCount) return;
    if (pkg) await update.mutateAsync({ id: pkg.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{pkg ? "Paketni tahrirlash" : "Yangi paket"}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Presets (create mode only) */}
        {!pkg && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>Tayyor shablonlar</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => applyPreset(p)} style={{
                  textAlign: "left", padding: "8px 12px", borderRadius: 9,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  cursor: "pointer", fontSize: 12, fontWeight: 600, lineHeight: 1.4,
                }}>
                  <div>{p.name}</div>
                  <div style={{ color: "var(--text-faint)", fontWeight: 400, marginTop: 2 }}>{fmt(p.price)} so'm</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>PAKET NOMI</label>
            <input className="inp" style={{ width: "100%" }} placeholder="Guruhlik onlayn Standard" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelSt}>NARX (SO'M)</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={0} placeholder="450000" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
            </div>
            <div>
              <label style={labelSt}>DARSLAR SONI</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={1} placeholder="8" value={form.lessonsCount || ""} onChange={(e) => setForm({ ...form, lessonsCount: +e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelSt}>DARS TURI</label>
              <select className="inp" style={{ width: "100%" }} value={form.lessonType} onChange={(e) => setForm({ ...form, lessonType: e.target.value as any })}>
                <option value="group">Guruhlik</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <label style={labelSt}>DARAJA</label>
              <select className="inp" style={{ width: "100%" }} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as any })}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label style={labelSt}>USUL</label>
              <select className="inp" style={{ width: "100%" }} value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value as any })}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelSt}>OY / DARS SONI</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={1} placeholder="8" value={form.lessonsPerMonth} onChange={(e) => setForm({ ...form, lessonsPerMonth: e.target.value === "" ? "" : +e.target.value })} />
            </div>
            <div>
              <label style={labelSt}>HAFTA / DARS SONI</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={1} placeholder="2" value={form.lessonsPerWeek} onChange={(e) => setForm({ ...form, lessonsPerWeek: e.target.value === "" ? "" : +e.target.value })} />
            </div>
            <div>
              <label style={labelSt}>DARS DAVOMIYLIGI (DAQIQA)</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={1} placeholder="50" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value === "" ? "" : +e.target.value })} />
            </div>
            <div>
              <label style={labelSt}>MAX O'QUVCHI</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={1} placeholder="5" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value === "" ? "" : +e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!form.name.trim() || !form.price || isPending} onClick={handleSave}>
            <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onEdit }: { pkg: Package; onEdit: () => void }) {
  const del = useDeletePackage();

  const tierColor = pkg.tier === "pro" ? { bg: "#fef3c7", color: "#d97706" } : { bg: "#dbeafe", color: "#2563eb" };
  const typeColor = pkg.lessonType === "individual" ? { bg: "#ede9fe", color: "#7c3aed" } : { bg: "#d1fae5", color: "#059669" };

  return (
    <Card style={{ padding: 0, opacity: pkg.active ? 1 : 0.55 }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3, flex: 1 }}>{pkg.name}</div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="edit" size={13} />
            </button>
            <button onClick={() => { if (confirm("Paketni o'chirish (noaktiv)? To'lovlar saqlanib qoladi.")) del.mutate(pkg.id); }}
              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>
          {fmt(pkg.price)} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-faint)" }}>so'm/oy</span>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ ...badgeSt, background: tierColor.bg, color: tierColor.color }}>{TIER_LABELS[pkg.tier]}</span>
          <span style={{ ...badgeSt, background: typeColor.bg, color: typeColor.color }}>{TYPE_LABELS[pkg.lessonType]}</span>
          <span style={{ ...badgeSt, background: "var(--surface-2)", color: "var(--text-faint)" }}>{DELIVERY_LABELS[pkg.delivery]}</span>
          {!pkg.active && <span style={{ ...badgeSt, background: "#fee2e2", color: "#ef4444" }}>Noaktiv</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13, color: "var(--text-faint)" }}>
          <div>📚 {pkg.lessonsCount} ta dars</div>
          {pkg.lessonsPerMonth && <div>🗓 Oyda {pkg.lessonsPerMonth} ta</div>}
          {pkg.lessonsPerWeek && <div>📅 Haftada {pkg.lessonsPerWeek}x</div>}
          {pkg.durationMinutes && <div>⏱ {pkg.durationMinutes} daqiqa</div>}
          {pkg.maxStudents && <div>👥 Max {pkg.maxStudents} o'quvchi</div>}
        </div>
      </div>
    </Card>
  );
}

export default function PackagesPage() {
  const { data: packages = [], isLoading } = usePackages();
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);

  const active = packages.filter((p) => p.active);
  const inactive = packages.filter((p) => !p.active);

  const totalMonthlyRevenue = active.reduce((s, p) => s + p.price, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Paketlar</h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>
            {active.length} ta aktiv paket
          </div>
        </div>
        <button className="btn primary" onClick={() => { setEditPkg(null); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} /> Yangi paket
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-3">
        {[
          { label: "Aktiv paketlar",   value: active.length,             icon: "check",   bg: "#d1fae5", color: "#059669" },
          { label: "Guruhlik paketlar",value: active.filter((p) => p.lessonType === "group").length,      icon: "users",   bg: "#dbeafe", color: "#2563eb" },
          { label: "Individual paketlar",value: active.filter((p) => p.lessonType === "individual").length,icon: "user",   bg: "#ede9fe", color: "#7c3aed" },
        ].map((c) => (
          <Card key={c.label}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={c.icon as any} size={18} style={{ color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
      ) : active.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "56px 0", color: "var(--text-faint)" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Hali paket yo'q</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Yangi paket qo'shish uchun yuqoridagi tugmani bosing</div>
            <button className="btn primary" onClick={() => { setEditPkg(null); setShowModal(true); }}>
              + Birinchi paketni qo'shing
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid cols-2">
            {active.map((p) => (
              <PackageCard key={p.id} pkg={p} onEdit={() => { setEditPkg(p); setShowModal(true); }} />
            ))}
          </div>

          {inactive.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Noaktiv paketlar ({inactive.length})
              </div>
              <div className="grid cols-2">
                {inactive.map((p) => (
                  <PackageCard key={p.id} pkg={p} onEdit={() => { setEditPkg(p); setShowModal(true); }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <PackageModal pkg={editPkg} onClose={() => { setShowModal(false); setEditPkg(null); }} />
      )}
    </div>
  );
}

const badgeSt: React.CSSProperties = {
  padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
};
