import { useState } from "react";
import { Avatar, Card, Icon } from "@chess-school/ui";
import { useCreateTeacher, useTeachers } from "../../lib/queries.js";

/* ─── Types ─── */
type MockTeacher = {
  id: string;
  fullName: string;
  title: string;
  phone: string;
  expYears: number;
  groupsCount: number;
  studentsCount: number;
  rating: number;
  scheduleCount: number;
};

/* ─── Mock data ─── */
const MOCK_TEACHERS: MockTeacher[] = [
  { id:"1", fullName:"Alisher Karimov",   title:"FIDE Master",   phone:"+998 90 123 45 67", expYears:8,  groupsCount:3, studentsCount:34, rating:4.9, scheduleCount:0 },
  { id:"2", fullName:"Malika Yusupova",   title:"Milliy usta",   phone:"+998 91 234 56 78", expYears:6,  groupsCount:2, studentsCount:22, rating:4.8, scheduleCount:1 },
  { id:"3", fullName:"Bobur Rahimov",     title:"Trener",        phone:"+998 93 345 67 89", expYears:10, groupsCount:3, studentsCount:41, rating:5.0, scheduleCount:1 },
  { id:"4", fullName:"Sardor Nazarov",    title:"Grossmeyster",  phone:"+998 94 456 78 90", expYears:12, groupsCount:1, studentsCount:9,  rating:4.9, scheduleCount:1 },
  { id:"5", fullName:"Dilnoza Ergasheva", title:"FIDE Master",   phone:"+998 95 567 89 01", expYears:5,  groupsCount:2, studentsCount:26, rating:4.7, scheduleCount:1 },
  { id:"6", fullName:"Jasur Tursunov",    title:"Milliy usta",   phone:"+998 97 678 90 12", expYears:7,  groupsCount:2, studentsCount:19, rating:4.6, scheduleCount:1 },
  { id:"7", fullName:"Nigora Saidova",    title:"Trener",        phone:"+998 99 789 01 23", expYears:9,  groupsCount:3, studentsCount:38, rating:4.9, scheduleCount:1 },
  { id:"8", fullName:"Rustam Aliyev",     title:"Grossmeyster",  phone:"+998 90 890 12 34", expYears:15, groupsCount:1, studentsCount:7,  rating:5.0, scheduleCount:0 },
];

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
  useTeachers(); // keep cache warm
  const createTeacher = useCreateTeacher();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", title: "", expYears: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<MockTeacher[]>(MOCK_TEACHERS);
  const [editTeacher, setEditTeacher] = useState<MockTeacher | null>(null);

  async function handleCreate() {
    const res = await createTeacher.mutateAsync({
      fullName: form.fullName,
      phone: form.phone,
      title: form.title || undefined,
      expYears: form.expYears ? Number(form.expYears) : undefined,
    });
    setTempPassword(res.tempPassword);
    const newTeacher: MockTeacher = {
      id: String(Date.now()),
      fullName: form.fullName,
      phone: form.phone,
      title: form.title,
      expYears: Number(form.expYears) || 0,
      groupsCount: 0, studentsCount: 0, rating: 0, scheduleCount: 0,
    };
    setTeachers((prev) => [...prev, newTeacher]);
    setForm({ fullName: "", phone: "", title: "", expYears: "" });
    setShowForm(false);
  }

  function handleSaveEdit(updated: MockTeacher) {
    setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditTeacher(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          O'qituvchilar — {teachers.length} ta
        </h2>
        <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
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
                Saqlash
              </button>
              <button className="btn sm" onClick={() => setShowForm(false)}>Bekor qilish</button>
              {tempPassword && (
                <span className="badge suc">Vaqtinchalik parol: <b>{tempPassword}</b></span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Grid */}
      <div className="grid cols-3">
        {teachers.map((t) => (
          <TeacherCard
            key={t.id}
            teacher={t}
            onEdit={() => setEditTeacher(t)}
          />
        ))}
      </div>

      {/* Edit modal */}
      {editTeacher && (
        <EditModal
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
          onSave={handleSaveEdit}
        />
      )}

    </div>
  );
}

/* ─── Teacher card ─── */
function TeacherCard({ teacher: t, onEdit }: { teacher: MockTeacher; onEdit: () => void }) {
  const ts = TITLE_STYLE[t.title] ?? TITLE_STYLE["Trener"];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Avatar name={t.fullName} size="lg" style={{ borderRadius: 14, flexShrink: 0 }} />
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
          <button className="iconbtn" style={{ width: 30, height: 30, flexShrink: 0 }} title="Amallar">
            <Icon name="moreVertical" size={16} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "16px 0 0" }} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", paddingTop: 16, paddingBottom: 2 }}>
          <StatCol value={t.groupsCount} label="Guruh" />
          <StatCol value={t.studentsCount} label="O'quvchi" />
          <StatCol value={t.rating.toFixed(1)} label="Reyting" star />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
        <button className="btn sm" style={{ flex: 1, justifyContent: "center" }} onClick={onEdit}>
          <Icon name="edit" size={13} /> Tahrirlash
        </button>
        <button className="btn sm" style={{ flex: 1, justifyContent: "center" }}>
          <Icon name="calendar" size={13} /> Jadval ( {t.scheduleCount} )
        </button>
      </div>
    </Card>
  );
}

/* ─── Edit modal ─── */
function EditModal({ teacher, onClose, onSave }: {
  teacher: MockTeacher;
  onClose: () => void;
  onSave: (t: MockTeacher) => void;
}) {
  const [form, setForm] = useState({
    fullName: teacher.fullName,
    phone: teacher.phone,
    title: teacher.title,
    expYears: String(teacher.expYears),
  });

  function handleSave() {
    onSave({
      ...teacher,
      fullName: form.fullName,
      phone: form.phone,
      title: form.title,
      expYears: Number(form.expYears) || 0,
    });
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
          <Avatar name={teacher.fullName} size="lg" style={{ borderRadius: 12, flexShrink: 0 }} />
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
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>TELEFON</label>
            <input className="inp" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
              Bekor
            </button>
            <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
              onClick={handleSave} disabled={!form.fullName || !form.phone}>
              <Icon name="check" size={15} /> Saqlash
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
