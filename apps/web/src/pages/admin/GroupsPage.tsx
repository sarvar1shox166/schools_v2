import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
  useTeachers,
} from "../../lib/queries.js";
import type { Group } from "../../lib/queries.js";

/* ─── Constants ─── */
const LEVELS = ["Boshlang'ich","1-razryad","2-razryad","3-razryad","4-razryad","Nomzod"];

const GROUP_COLORS = [
  "#3F8CFF","#10b981","#f59e0b","#ec4899","#06b6d4","#22c55e","#6366f1","#f97316",
];

/* ─── Helper: get a letter from the group name ─── */
function groupLetter(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/* ─── Page ─── */
export default function GroupsPage() {
  const { data: groups = [], isLoading } = useGroups();
  const [view, setView] = useState<"card" | "list">("card");

  type Modal =
    | { mode: "add" }
    | { mode: "edit"; group: Group }
    | { mode: "delete"; group: Group }
    | null;
  const [modal, setModal] = useState<Modal>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}
      onClick={() => openMenu && setOpenMenu(null)}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Guruhlar — {groups.length} ta
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(["card","list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "7px 18px", border: "none", cursor: "pointer",
                background: view === v ? "var(--surface-2)" : "transparent",
                fontWeight: view === v ? 700 : 600, fontSize: 13.5,
                color: view === v ? "var(--text)" : "var(--text-faint)",
              }}>
                {v === "card" ? "Kartochka" : "Ro'yxat"}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => setModal({ mode: "add" })}>
            <Icon name="plus" size={15} /> Guruh ochish
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)", fontWeight: 600 }}>
          Yuklanmoqda...
        </div>
      )}

      {/* Card view */}
      {!isLoading && view === "card" && (
        <div className="grid cols-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              menuOpen={openMenu === g.id}
              onMenuToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}
              onEdit={() => { setModal({ mode: "edit", group: g }); setOpenMenu(null); }}
              onDelete={() => { setModal({ mode: "delete", group: g }); setOpenMenu(null); }}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && view === "list" && (
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>GURUH</th>
                  <th>O'QITUVCHI</th>
                  <th>DARAJA</th>
                  <th>XONA</th>
                  <th>TO'LDIRILGANLIK</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const color = g.color ?? "#6366f1";
                  const pct = g.capacity > 0 ? Math.min(100, Math.round((g.studentsCount / g.capacity) * 100)) : 0;
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="with-av">
                          <LetterAvatar letter={groupLetter(g.name)} color={color} />
                          <div>
                            <div className="cell-main">{g.name}</div>
                            <div className="cell-sub">{g.level ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{g.teacherName ?? "—"}</td>
                      <td><span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)" }}>{g.level ?? "—"}</span></td>
                      <td><span className="badge neut">{g.roomName ?? "—"}</span></td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="pbar" style={{ flex: 1, height: 6 }}>
                            <span style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-faint)", minWidth: 36 }}>
                            {g.studentsCount}/{g.capacity}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ position: "relative" }}>
                          <button className="iconbtn" style={{ width: 30, height: 30 }}
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}>
                            <Icon name="moreVertical" size={15} />
                          </button>
                          {openMenu === g.id && (
                            <DropMenu
                              onEdit={() => { setModal({ mode:"edit", group:g }); setOpenMenu(null); }}
                              onDelete={() => { setModal({ mode:"delete", group:g }); setOpenMenu(null); }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      {modal?.mode === "add" && (
        <GroupModal mode="add" onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <GroupModal mode="edit" group={modal.group} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "delete" && (
        <DeleteModal group={modal.group} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ─── Group card ─── */
function GroupCard({ group: g, menuOpen, onMenuToggle, onEdit, onDelete }: {
  group: Group;
  menuOpen: boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = g.color ?? "#6366f1";
  const pct = g.capacity > 0 ? Math.min(100, Math.round((g.studentsCount / g.capacity) * 100)) : 0;
  return (
    <Card style={{ padding: "20px 20px 18px" }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <LetterAvatar letter={groupLetter(g.name)} color={color} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 750, fontSize: 15.5, lineHeight: 1.25 }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 4 }}>
            {g.level ?? "Daraja ko'rsatilmagan"}
          </div>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onMenuToggle}>
            <Icon name="moreVertical" size={16} />
          </button>
          {menuOpen && <DropMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <InfoRow icon="teacher" text={g.teacherName ?? "O'qituvchi yo'q"} />
        <InfoRow icon="mapPin" text={g.roomName ?? "Xona belgilanmagan"} />
        <InfoRow icon="users" text={`${g.studentsCount} o'quvchi · ${g.capacity} joy`} />
      </div>

      {/* Fill rate */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>To'ldirilganlik</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{g.studentsCount}/{g.capacity}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--surface-3)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width .4s" }} />
      </div>
    </Card>
  );
}

/* ─── Dropdown menu ─── */
function DropMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      padding: "6px", minWidth: 140,
    }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onEdit} style={menuItemStyle(false)}>
        <Icon name="edit" size={14} /> Tahrirlash
      </button>
      <button onClick={onDelete} style={menuItemStyle(true)}>
        <Icon name="trash" size={14} /> O'chirish
      </button>
    </div>
  );
}

function menuItemStyle(danger: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 13.5, fontWeight: 600, textAlign: "left",
    color: danger ? "#ef4444" : "var(--text)",
  };
}

/* ─── Group add/edit modal ─── */
type GroupModalProps =
  | { mode: "add"; group?: undefined; onClose: () => void }
  | { mode: "edit"; group: Group; onClose: () => void };

function GroupModal({ mode, group, onClose }: GroupModalProps) {
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { data: teachers = [] } = useTeachers();

  const [form, setForm] = useState({
    name:      group?.name      ?? "",
    level:     group?.level     ?? "",
    teacherId: group?.teacherId ?? "",
    color:     group?.color     ?? GROUP_COLORS[0],
    capacity:  group?.capacity  ? String(group.capacity) : "12",
  });

  const [error, setError] = useState<string | null>(null);
  const isAdd = mode === "add";
  const isPending = createGroup.isPending || updateGroup.isPending;

  async function handleSave() {
    setError(null);
    try {
      if (isAdd) {
        await createGroup.mutateAsync({
          name:      form.name,
          level:     form.level     || undefined,
          teacherId: form.teacherId || undefined,
          color:     form.color     || undefined,
          capacity:  form.capacity ? Number(form.capacity) : undefined,
        });
      } else {
        await updateGroup.mutateAsync({
          id:        group!.id,
          name:      form.name,
          level:     form.level     || undefined,
          teacherId: form.teacherId || undefined,
          color:     form.color     || undefined,
          capacity:  form.capacity ? Number(form.capacity) : undefined,
        });
      }
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          {isAdd ? "Yangi guruh qo'shish" : "Guruhni tahrirlash"}
        </div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div style={{ height: 1, background: "var(--border)" }} />

      <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* GURUH NOMI */}
        <FieldWrap label="GURUH NOMI">
          <input className="inp" value={form.name} placeholder="Guruh nomini kiriting"
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>

        {/* DARAJASI + SIG'IMI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="DARAJASI">
            <SelectField value={form.level} onChange={(v) => setForm({ ...form, level: v })}>
              <option value="">Tanlang...</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="SIG'IMI">
            <input className="inp" type="number" min={1} max={50} value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </FieldWrap>
        </div>

        {/* O'QITUVCHI */}
        <FieldWrap label="O'QITUVCHI">
          <SelectField value={form.teacherId} onChange={(v) => setForm({ ...form, teacherId: v })}>
            <option value="">O'qituvchisiz</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </SelectField>
        </FieldWrap>

        {/* RANG */}
        <FieldWrap label="RANG">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                  background: c, flexShrink: 0,
                  outline: form.color === c ? `3px solid ${c}` : "none",
                  outlineOffset: 2,
                  opacity: form.color === c ? 1 : 0.6,
                  transition: "opacity .15s, outline .15s",
                }}
              />
            ))}
          </div>
        </FieldWrap>

        {/* Error */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
            onClick={handleSave} disabled={!form.name || isPending}>
            <Icon name="check" size={15} /> {isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Delete modal ─── */
function DeleteModal({ group, onClose }: {
  group: Group;
  onClose: () => void;
}) {
  const deleteGroup = useDeleteGroup();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await deleteGroup.mutateAsync(group.id);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>O'chirishni tasdiqlash</div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div style={{ padding: "10px 24px 32px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 18px", borderRadius: 18,
          background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="trash" size={32} style={{ color: "var(--text-faint)" }} />
        </div>
        <div style={{ fontWeight: 750, fontSize: 16, marginBottom: 8 }}>{group.name}</div>
        <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>Bu guruhni o'chirmoqchimisiz?</div>
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, fontWeight: 600 }}>{error}</div>}
      </div>
      <div style={{ height: 1, background: "var(--border)" }} />
      <div style={{ display: "flex", gap: 12, padding: "18px 24px" }}>
        <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
          Bekor
        </button>
        <button onClick={handleConfirm} disabled={deleteGroup.isPending} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "0 20px", height: 42, borderRadius: 10,
          background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14,
          border: "none", cursor: "pointer", opacity: deleteGroup.isPending ? 0.7 : 1,
        }}>
          <Icon name="trash" size={14} /> {deleteGroup.isPending ? "O'chirilmoqda..." : "O'chirish"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Shared ─── */
function LetterAvatar({ letter, color, size = 40 }: { letter: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: color, color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: Math.round(size * 0.43),
    }}>
      {letter}
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{text}</span>
    </div>
  );
}

function ModalShell({ children, onClose, width = 480 }: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        {children}
      </div>
    </div>
  );
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", color: "var(--text-faint)",
        marginBottom: 7, textTransform: "uppercase",
      }}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", paddingRight: 36, width: "100%" }}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} style={{
        position: "absolute", right: 12, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)",
      }} />
    </div>
  );
}
