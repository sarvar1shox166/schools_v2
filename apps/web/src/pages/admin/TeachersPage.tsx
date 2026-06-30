import { useState } from "react";
import { Avatar, Card, Icon } from "@chess-school/ui";
import { useCreateTeacher, useTeachers, useDeleteTeacher, useUpdateTeacher } from "../../lib/queries.js";
import type { Teacher } from "../../lib/queries.js";

const TITLE_OPTIONS = ["FIDE Master", "Milliy usta", "Trener", "Grossmeyster", "Xalqaro master"];

const TITLE_STYLE: Record<string, { bg: string; color: string }> = {
  "FIDE Master":      { bg: "#dbeafe", color: "#2563eb" },
  "Milliy usta":      { bg: "#ede9fe", color: "#7c3aed" },
  "Trener":           { bg: "var(--surface-3)", color: "var(--text-faint)" },
  "Grossmeyster":     { bg: "#fef3c7", color: "#b45309" },
  "Xalqaro master":   { bg: "#d1fae5", color: "#059669" },
};

/* ─── Page ─── */
export default function TeachersPage() {
  const { data: teachers = [], isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", title: "", expYears: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ name: string; password: string } | null>(null);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

  async function handleCreate() {
    setCreateError(null);
    try {
      const res = await createTeacher.mutateAsync({
        fullName: form.fullName,
        phone: form.phone,
        title: form.title || undefined,
        expYears: form.expYears ? Number(form.expYears) : undefined,
      });
      setTempPasswordInfo({ name: form.fullName, password: (res as { id: string; tempPassword: string }).tempPassword ?? "" });
      setForm({ fullName: "", phone: "", title: "", expYears: "" });
      setShowForm(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? "Xatolik yuz berdi");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          O'qituvchilar — {teachers.length} ta
        </h2>
        <button className="btn primary" onClick={() => { setShowForm((v) => !v); setCreateError(null); }}>
          <Icon name="plus" size={15} /> Qo'shish
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <div style={{ padding: "18px 22px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
              <input className="inp" placeholder="F.I.Sh" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="inp" placeholder="Telefon" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="inp" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}>
                <option value="">Unvon tanlang</option>
                {TITLE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <input className="inp" placeholder="Tajriba (yil)" value={form.expYears}
                onChange={(e) => setForm({ ...form, expYears: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn sm primary" onClick={handleCreate}
                disabled={!form.fullName || !form.phone || createTeacher.isPending}>
                {createTeacher.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </button>
              <button className="btn sm" onClick={() => { setShowForm(false); setCreateError(null); }}>Bekor qilish</button>
              {createError && (
                <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{createError}</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)", fontWeight: 600 }}>
          Yuklanmoqda...
        </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <div className="grid cols-3">
          {teachers.map((t) => (
            <TeacherCard
              key={t.id}
              teacher={t}
              onEdit={() => setEditTeacher(t)}
              onDelete={() => setDeleteTeacher(t)}
            />
          ))}
        </div>
      )}

      {/* Temp password success dialog */}
      {tempPasswordInfo && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setTempPasswordInfo(null); }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: 18, width: 420, maxWidth: "100%",
            boxShadow: "0 24px 64px rgba(0,0,0,.22)", overflow: "hidden",
          }}>
            <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>O'qituvchi qo'shildi</div>
              <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setTempPasswordInfo(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div style={{ padding: "10px 24px 32px", textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 18px", borderRadius: 16,
                background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="check" size={28} style={{ color: "#059669" }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{tempPasswordInfo.name}</div>
              <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 14 }}>
                Vaqtinchalik parol:
              </div>
              <div style={{
                padding: "12px 20px", borderRadius: 10, background: "var(--surface-2)",
                fontFamily: "monospace", fontWeight: 800, fontSize: 22, letterSpacing: 2,
                color: "var(--text)",
              }}>
                {tempPasswordInfo.password}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
                Bu parolni o'qituvchiga bering. Uni saqlang — keyinchalik ko'rsatilmaydi.
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)" }} />
            <div style={{ padding: "18px 24px" }}>
              <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setTempPasswordInfo(null)}>
                Tushunarli
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTeacher && (
        <EditModal
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
        />
      )}

      {/* Delete modal */}
      {deleteTeacher && (
        <DeleteTeacherModal
          teacher={deleteTeacher}
          onClose={() => setDeleteTeacher(null)}
        />
      )}

    </div>
  );
}

/* ─── Teacher card ─── */
function TeacherCard({ teacher: t, onEdit, onDelete }: { teacher: Teacher; onEdit: () => void; onDelete: () => void }) {
  const ts = TITLE_STYLE[t.title ?? ""] ?? TITLE_STYLE["Trener"];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ borderRadius: 14, flexShrink: 0, display: "inline-flex" }}><Avatar name={t.fullName} size="lg" /></div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
            <div style={{ fontWeight: 750, fontSize: 15.5, lineHeight: 1.2 }}>{t.fullName}</div>
            {t.title && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 7, height: 24, padding: "0 10px",
                borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: ts.bg, color: ts.color,
              }}>
                ♟ {t.title}
              </span>
            )}
          </div>
          <button className="iconbtn" style={{ width: 30, height: 30, flexShrink: 0, color: "var(--danger)" }}
            title="O'chirish" onClick={onDelete}>
            <Icon name="trash" size={15} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "16px 0 0" }} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", paddingTop: 16, paddingBottom: 2 }}>
          <StatCol value={t.groupsCount} label="Guruh" />
          <StatCol value={t.expYears ?? 0} label="Tajriba" />
          <StatCol value={t.rating != null ? t.rating.toFixed(1) : "—"} label="Reyting" star />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
        <button className="btn sm" style={{ flex: 1, justifyContent: "center" }} onClick={onEdit}>
          <Icon name="edit" size={13} /> Tahrirlash
        </button>
        <button className="btn sm" style={{ flex: 1, justifyContent: "center" }}>
          <Icon name="phone" size={13} /> {t.phone}
        </button>
      </div>
    </Card>
  );
}

/* ─── Delete teacher modal ─── */
function DeleteTeacherModal({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const deleteTeacher = useDeleteTeacher();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await deleteTeacher.mutateAsync(teacher.id);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
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
        background: "var(--surface)", borderRadius: 18, width: 420, maxWidth: "100%",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)", overflow: "hidden",
      }}>
        <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>O'chirishni tasdiqlash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: "10px 24px 32px", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, margin: "0 auto 18px", borderRadius: 18,
            background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="trash" size={32} style={{ color: "var(--text-faint)" }} />
          </div>
          <div style={{ fontWeight: 750, fontSize: 16, marginBottom: 8 }}>{teacher.fullName}</div>
          <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>Bu o'qituvchini o'chirmoqchimisiz?</div>
          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, fontWeight: 600 }}>{error}</div>}
        </div>
        <div style={{ height: 1, background: "var(--border)" }} />
        <div style={{ display: "flex", gap: 12, padding: "18px 24px" }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "0 20px", height: 42, borderRadius: 10,
              background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer", opacity: deleteTeacher.isPending ? 0.7 : 1,
            }}
            onClick={handleConfirm}
            disabled={deleteTeacher.isPending}
          >
            <Icon name="trash" size={14} /> {deleteTeacher.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit modal ─── */
function EditModal({ teacher, onClose }: {
  teacher: Teacher;
  onClose: () => void;
}) {
  const updateTeacher = useUpdateTeacher();
  const [form, setForm] = useState({
    fullName: teacher.fullName,
    phone: teacher.phone,
    title: teacher.title ?? "",
    expYears: teacher.expYears != null ? String(teacher.expYears) : "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    try {
      await updateTeacher.mutateAsync({
        id: teacher.id,
        fullName: form.fullName,
        phone: form.phone,
        title: form.title || undefined,
        expYears: form.expYears ? Number(form.expYears) : undefined,
      });
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width: 480, maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
        overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "22px 24px 18px",
        }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>O'qituvchini tahrirlash</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Teacher identity */}
        <div style={{ padding: "0 24px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ borderRadius: 12, flexShrink: 0, display: "inline-flex" }}><Avatar name={teacher.fullName} size="lg" /></div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 15 }}>{teacher.fullName}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>Ma'lumotlarni o'zgartiring</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Form */}
        <div style={{ padding: "22px 24px" }}>
          {/* Row: ISM FAMILYA + TAJRIBA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>ISM FAMILYA</label>
              <input className="inp" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>TAJRIBA</label>
              <input className="inp" placeholder="8 yil" value={form.expYears}
                onChange={(e) => setForm({ ...form, expYears: e.target.value })} />
            </div>
          </div>

          {/* UNVON */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>UNVON</label>
            <div style={{ position: "relative" }}>
              <select className="inp" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ appearance: "none", paddingRight: 36, width: "100%" }}>
                <option value="">Tanlang...</option>
                {TITLE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <Icon name="chevronDown" size={14} style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none",
                color: "var(--text-faint)",
              }} />
            </div>
          </div>

          {/* TELEFON */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>TELEFON</label>
            <input className="inp" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
              Bekor
            </button>
            <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
              onClick={handleSave} disabled={!form.fullName || !form.phone || updateTeacher.isPending}>
              <Icon name="check" size={15} /> {updateTeacher.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function StatCol({ value, label, star }: { value: string | number; label: string; star?: boolean }) {
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, color: "var(--text)" }}>
        {star && <span style={{ color: "#f59e0b", marginRight: 3, fontSize: 18 }}>⭐</span>}
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 5, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", color: "var(--text-faint)",
  marginBottom: 7, textTransform: "uppercase",
};
