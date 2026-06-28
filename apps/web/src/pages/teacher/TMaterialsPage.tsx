import { useRef, useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  useMaterials, useUploadMaterial, useDeleteMaterial,
  useHomework, useCreateHomework, useDeleteHomework,
  useTeacherSchedule,
} from "../../lib/queries.js";

const API_BASE = (import.meta as any).env.VITE_API_URL ?? "http://localhost:3000";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const TABS = [
  { key: "homework", label: "Uy vazifalari" },
  { key: "materials", label: "Fayl materiallari" },
] as const;
type Tab = typeof TABS[number]["key"];

// ---- Modals ----

function AddHomeworkModal({ groups, onClose }: { groups: { id: string; name: string; color?: string | null }[]; onClose: () => void }) {
  const create = useCreateHomework();
  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    title: "",
    description: "",
    dueDate: "",
    xpReward: 30,
  });

  async function handleSave() {
    if (!form.title.trim() || !form.groupId) return;
    await create.mutateAsync({
      groupId: form.groupId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || undefined,
      xpReward: form.xpReward,
    });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 18, padding: "28px 32px", width: 460, maxWidth: "95vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Vazifa berish</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>GURUH</label>
            <select className="inp" style={{ width: "100%" }} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>SARLAVHA</label>
            <input className="inp" style={{ width: "100%" }} placeholder="Vazifa sarlavhasi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label style={labelSt}>TAVSIF (IXTIYORIY)</label>
            <textarea className="inp" style={{ width: "100%", minHeight: 72, resize: "vertical" }} placeholder="Vazifa haqida to'liq ma'lumot..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelSt}>MUDDAT</label>
              <input className="inp" style={{ width: "100%" }} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label style={labelSt}>XP MUKOFOT</label>
              <input className="inp" style={{ width: "100%" }} type="number" min={0} max={200} value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: +e.target.value })} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!form.title.trim() || !form.groupId || create.isPending} onClick={handleSave}>
            <Icon name="check" size={14} /> {create.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadMaterialModal({ groups, onClose }: { groups: { id: string; name: string }[]; onClose: () => void }) {
  const upload = useUploadMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSave() {
    if (!file) return;
    await upload.mutateAsync({ title: title.trim() || file.name, groupId: groupId || undefined, file });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 18, padding: "28px 32px", width: 440, maxWidth: "95vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Fayl yuklash</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>GURUH</label>
            <select className="inp" style={{ width: "100%" }} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Barcha guruhlar</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>NOM (IXTIYORIY)</label>
            <input className="inp" style={{ width: "100%" }} placeholder="Fayl nomi (bo'sh qolsa, fayl nomi ishlatiladi)" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>FAYL</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed var(--border)", borderRadius: 10, padding: "20px",
                textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
              }}>
              {file ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{formatBytes(file.size)}</div>
                </div>
              ) : (
                <div style={{ color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: 13 }}>Fayl tanlash uchun bosing</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!file || upload.isPending} onClick={handleSave}>
            <Icon name="upload" size={14} /> {upload.isPending ? "Yuklanmoqda..." : "Yuklash"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main page ----

export default function TMaterialsPage() {
  const [tab, setTab] = useState<Tab>("homework");
  const [showHwModal, setShowHwModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const deleteHw = useDeleteHomework();
  const deleteMat = useDeleteMaterial();

  const { data: schedule } = useTeacherSchedule();
  const groups = (schedule?.groups ?? []).map((g) => ({ id: g.id, name: g.name, color: g.color }));

  const { data: homework = [], isLoading: hwLoading } = useHomework();
  const { data: materials = [], isLoading: matLoading } = useMaterials();

  const token = localStorage.getItem("token") ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Materiallar</h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>
            {homework.length} ta vazifa · {materials.length} ta fayl
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "homework" ? (
            <button className="btn primary" onClick={() => setShowHwModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="plus" size={13} /> Vazifa berish
            </button>
          ) : (
            <button className="btn primary" onClick={() => setShowUploadModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="upload" size={13} /> Fayl yuklash
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "4px", background: "var(--surface-2)", borderRadius: 10, width: "fit-content" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 500,
              background: tab === t.key ? "var(--surface)" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--text-faint)",
              boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Homework tab */}
      {tab === "homework" && (
        <Card style={{ padding: 0 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {hwLoading ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
            ) : homework.length === 0 ? (
              <div style={{ padding: "56px 0", textAlign: "center", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>📝</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Hali vazifa berilmagan</div>
                <div style={{ fontSize: 13 }}>"Vazifa berish" tugmasini bosing</div>
              </div>
            ) : homework.map((hw: any, i: number) => (
              <div key={hw.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                borderBottom: i < homework.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: hw.groupColor ? hw.groupColor + "22" : "#fef3c7",
                  color: hw.groupColor ?? "#d97706",
                }}>
                  <Icon name="edit" size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{hw.title}</div>
                  {hw.description && (
                    <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{hw.description}</div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: (hw.groupColor ?? "#3b82f6") + "22",
                      color: hw.groupColor ?? "#3b82f6",
                    }}>{hw.groupName}</span>
                    {hw.dueDate && <span>Muddat: {formatDate(hw.dueDate)}</span>}
                    <span>+{hw.xpReward} XP</span>
                    {hw.completionCount != null && <span>✓ {hw.completionCount} ta bajargan</span>}
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm("Vazifani o'chirasizmi?")) deleteHw.mutate(hw.id); }}
                  style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Materials tab */}
      {tab === "materials" && (
        <Card style={{ padding: 0 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {matLoading ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
            ) : materials.length === 0 ? (
              <div style={{ padding: "56px 0", textAlign: "center", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>📎</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Hali fayl yuklanmagan</div>
                <div style={{ fontSize: 13 }}>"Fayl yuklash" tugmasini bosing</div>
              </div>
            ) : materials.map((m: any, i: number) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                borderBottom: i < materials.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#dbeafe", color: "#2563eb",
                }}>
                  <Icon name="file" size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {m.groupName && (
                      <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#2563eb" }}>{m.groupName}</span>
                    )}
                    <span>{formatBytes(m.sizeBytes)}</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={`${API_BASE}/api/v1/materials/${m.id}/download`}
                    download
                    onClick={(e) => {
                      e.preventDefault();
                      const a = document.createElement("a");
                      a.href = `${API_BASE}/api/v1/materials/${m.id}/download`;
                      fetch(a.href, { headers: { Authorization: `Bearer ${token}` } })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          a.href = url; a.download = m.fileName;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                    }}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center", textDecoration: "none" }}>
                    <Icon name="download" size={13} />
                  </a>
                  <button
                    onClick={() => { if (confirm("Faylni o'chirasizmi?")) deleteMat.mutate(m.id); }}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
                    <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showHwModal && <AddHomeworkModal groups={groups} onClose={() => setShowHwModal(false)} />}
      {showUploadModal && <UploadMaterialModal groups={groups} onClose={() => setShowUploadModal(false)} />}
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase",
};
