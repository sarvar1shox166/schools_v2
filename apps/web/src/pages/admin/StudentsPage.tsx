import { useMemo, useState } from "react";
import { Avatar, Card, Icon } from "@chess-school/ui";

/* ─── Types ─── */
type Status = "faol" | "yangi" | "qarzdor";
type PayStatus = "to'langan" | "kutilmoqda" | "qarzdor";

type Student = {
  id: string;
  fullName: string;
  group: string;
  username: string;
  password: string;
  phone: string;
  age: number;
  level: string;
  teacher: string;
  joinedAt: string;
  status: Status;
  paymentStatus: PayStatus;
};

/* ─── Mock data ─── */
const INIT_STUDENTS: Student[] = [
  { id:"1",  fullName:"Asilbek Komilov",    group:"A", username:"Asil2016",     password:"Asil2016",     phone:"+998 90 111 22 33", age:9,  level:"Boshlang'ich", teacher:"Alisher Karimov",   joinedAt:"1 sen 2026 10:24",  status:"yangi",   paymentStatus:"to'langan"  },
  { id:"2",  fullName:"Malika Rashidova",   group:"B", username:"Malika2014",   password:"Malika2014",   phone:"+998 91 444 55 66", age:13, level:"3-razryad",    teacher:"Malika Yusupova",   joinedAt:"2 sen 2026 14:05",  status:"faol",    paymentStatus:"to'langan"  },
  { id:"3",  fullName:"Bobur Nazarov",      group:"C", username:"Bobur2017",    password:"Bobur2017",    phone:"+998 93 777 88 99", age:8,  level:"Boshlang'ich", teacher:"Bobur Rahimov",     joinedAt:"5 okt 2025 09:30",  status:"faol",    paymentStatus:"kutilmoqda" },
  { id:"4",  fullName:"Sarvar Yo'ldoshev",  group:"F", username:"Sarvar2009",   password:"Sarvar2009",   phone:"+998 99 222 33 44", age:16, level:"1-razryad",    teacher:"Jasur Tursunov",    joinedAt:"3 apr 2026 11:00",  status:"faol",    paymentStatus:"to'langan"  },
  { id:"5",  fullName:"Gulnoza Tosheva",    group:"A", username:"Gulnoza2015",  password:"Gulnoza2015",  phone:"+998 90 333 44 55", age:10, level:"Boshlang'ich", teacher:"Alisher Karimov",   joinedAt:"20 fev 2026 16:15", status:"faol",    paymentStatus:"to'langan"  },
  { id:"6",  fullName:"Javohir Saidov",     group:"D", username:"Javohir2011",  password:"Javohir2011",  phone:"+998 91 555 66 77", age:14, level:"2-razryad",    teacher:"Dilnoza Ergasheva", joinedAt:"8 yan 2026 08:45",  status:"faol",    paymentStatus:"to'langan"  },
  { id:"7",  fullName:"Madina Aliyeva",     group:"B", username:"Madina2013",   password:"Madina2013",   phone:"+998 93 888 99 00", age:12, level:"3-razryad",    teacher:"Malika Yusupova",   joinedAt:"15 mar 2026 12:30", status:"faol",    paymentStatus:"to'langan"  },
  { id:"8",  fullName:"Diyor Karimov",      group:"E", username:"Diyor2008",    password:"Diyor2008",    phone:"+998 94 666 77 88", age:17, level:"Nomzod",       teacher:"Sardor Nazarov",    joinedAt:"1 sen 2025 10:00",  status:"qarzdor", paymentStatus:"qarzdor"    },
  { id:"9",  fullName:"Sevara Mirzayeva",   group:"C", username:"Sevara2018",   password:"Sevara2018",   phone:"+998 95 999 00 11", age:7,  level:"Boshlang'ich", teacher:"Bobur Rahimov",     joinedAt:"9 iyu 2026 09:00",  status:"yangi",   paymentStatus:"kutilmoqda" },
  { id:"10", fullName:"Otabek Rahimov",     group:"F", username:"Otabek2010",   password:"Otabek2010",   phone:"+998 97 222 11 00", age:15, level:"1-razryad",    teacher:"Jasur Tursunov",    joinedAt:"22 dek 2025 14:20", status:"faol",    paymentStatus:"to'langan"  },
  { id:"11", fullName:"Laylo Ismoilova",    group:"A", username:"Laylo2016",    password:"Laylo2016",    phone:"+998 99 333 22 11", age:9,  level:"Boshlang'ich", teacher:"Alisher Karimov",   joinedAt:"5 iyu 2026 11:10",  status:"yangi",   paymentStatus:"kutilmoqda" },
  { id:"12", fullName:"Aziz Tojiboyev",     group:"D", username:"Aziz2012",     password:"Aziz2012",     phone:"+998 90 444 33 22", age:13, level:"2-razryad",    teacher:"Dilnoza Ergasheva", joinedAt:"18 noy 2025 15:45", status:"faol",    paymentStatus:"to'langan"  },
  { id:"13", fullName:"Kamola Yusupova",    group:"B", username:"Kamola2014",   password:"Kamola2014",   phone:"+998 91 666 55 44", age:11, level:"4-razryad",    teacher:"Malika Yusupova",   joinedAt:"30 mar 2026 10:30", status:"faol",    paymentStatus:"to'langan"  },
  { id:"14", fullName:"Ulug'bek Hamidov",   group:"E", username:"Ulugbek2009",  password:"Ulugbek2009",  phone:"+998 93 777 66 55", age:16, level:"Nomzod",       teacher:"Sardor Nazarov",    joinedAt:"12 okt 2025 09:15", status:"qarzdor", paymentStatus:"qarzdor"    },
  { id:"15", fullName:"Shaxzoda Qodirova",  group:"C", username:"Shaxzoda2017", password:"Shaxzoda2017", phone:"+998 94 888 77 66", age:8,  level:"Boshlang'ich", teacher:"Bobur Rahimov",     joinedAt:"2 apr 2026 13:00",  status:"faol",    paymentStatus:"to'langan"  },
  { id:"16", fullName:"Nodirbek Eshonov",   group:"F", username:"Nodir2011",    password:"Nodir2011",    phone:"+998 95 111 99 88", age:14, level:"1-razryad",    teacher:"Jasur Tursunov",    joinedAt:"9 yan 2026 08:00",  status:"faol",    paymentStatus:"to'langan"  },
];

/* ─── Constants ─── */
const LEVELS = ["Boshlang'ich", "1-razryad", "2-razryad", "3-razryad", "4-razryad", "Nomzod"];
const GROUPS = ["A", "B", "C", "D", "E", "F"];
const TEACHERS = ["Alisher Karimov", "Malika Yusupova", "Bobur Rahimov", "Sardor Nazarov", "Dilnoza Ergasheva", "Jasur Tursunov"];
const PAY_STATUSES: PayStatus[] = ["to'langan", "kutilmoqda", "qarzdor"];

const LEVEL_COLOR: Record<string, string> = {
  "Boshlang'ich": "#ef4444",
  "1-razryad":    "#3b82f6",
  "2-razryad":    "#22c55e",
  "3-razryad":    "#f59e0b",
  "4-razryad":    "#f97316",
  "Nomzod":       "#14b8a6",
};

const FILTER_TABS = [
  { v: "hammasi" as const, label: "Hammasi" },
  { v: "faol"    as const, label: "Faol" },
  { v: "yangi"   as const, label: "Yangi" },
  { v: "qarzdor" as const, label: "Qarzdor" },
];

type FilterTab = "hammasi" | Status;

/* ─── Helpers ─── */
function shortTeacher(name: string) {
  const [last, first = ""] = name.split(" ");
  return `${last[0]}.${first}`;
}

/* ─── Page ─── */
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(INIT_STUDENTS);
  const [tab, setTab] = useState<FilterTab>("hammasi");
  const [q, setQ] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  /* modals */
  type Modal =
    | { mode: "add" }
    | { mode: "edit"; student: Student }
    | { mode: "delete"; student: Student }
    | null;
  const [modal, setModal] = useState<Modal>(null);

  /* filtered list */
  const filtered = useMemo(() => {
    let rows = students;
    if (tab !== "hammasi") rows = rows.filter((s) => s.status === tab);
    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter((s) =>
        s.fullName.toLowerCase().includes(lq) ||
        s.username.toLowerCase().includes(lq) ||
        s.phone.includes(lq)
      );
    }
    return rows;
  }, [students, tab, q]);

  function togglePassword(id: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAdd(s: Student) {
    setStudents((prev) => [s, ...prev]);
    setModal(null);
  }

  function handleEdit(updated: Student) {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setModal(null);
  }

  function handleDelete(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setModal(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          O'quvchilar — {students.length} ta
        </h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn">
            <Icon name="download" size={15} /> Eksport
          </button>
          <button className="btn primary" onClick={() => setModal({ mode: "add" })}>
            <Icon name="plus" size={15} /> Qo'shish
          </button>
        </div>
      </div>

      {/* Table card */}
      <Card style={{ padding: 0 }}>
        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 22px", borderBottom: "1px solid var(--border)",
        }}>
          {FILTER_TABS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              style={{
                padding: "6px 16px", borderRadius: 8,
                border: tab === t.v ? "1.5px solid var(--border-strong)" : "1.5px solid transparent",
                background: tab === t.v ? "var(--surface)" : "transparent",
                fontWeight: tab === t.v ? 700 : 600, fontSize: 13.5,
                color: tab === t.v ? "var(--text)" : "var(--text-faint)",
                cursor: "pointer", transition: "all .15s",
                boxShadow: tab === t.v ? "var(--shadow-xs)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <label className="search" style={{ minWidth: 240 }}>
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism, username, tel..."
            />
          </label>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>ISM FAMILYA</th>
                <th>USERNAME</th>
                <th>PAROL</th>
                <th>TEL RAQAM</th>
                <th>YOSHI</th>
                <th>DARAJASI</th>
                <th>O'QITUVCHISI</th>
                <th>RO'YXATDAN O'TISHI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="with-av">
                      <Avatar name={s.fullName} size="sm" style={{ borderRadius: 10, flexShrink: 0 }} />
                      <div>
                        <div className="cell-main">{s.fullName}</div>
                        <div className="cell-sub">{s.group} guruh</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{s.username}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, letterSpacing: visiblePasswords.has(s.id) ? 0 : 3, fontFamily: "monospace", color: "var(--text-dim)" }}>
                        {visiblePasswords.has(s.id) ? s.password : "········"}
                      </span>
                      <button
                        className="iconbtn"
                        style={{ width: 24, height: 24 }}
                        onClick={() => togglePassword(s.id)}
                      >
                        <Icon name={visiblePasswords.has(s.id) ? "eyeOff" : "eye"} size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>{s.phone}</td>
                  <td style={{ fontWeight: 700, fontSize: 14 }}>{s.age}</td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: 13.5,
                      color: LEVEL_COLOR[s.level] ?? "var(--text)",
                    }}>
                      {s.level}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600 }}>
                    {shortTeacher(s.teacher)}
                  </td>
                  <td className="cell-sub">{s.joinedAt}</td>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        className="iconbtn"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setModal({ mode: "edit", student: s })}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        className="iconbtn"
                        style={{ width: 30, height: 30, color: "var(--danger)" }}
                        onClick={() => setModal({ mode: "delete", student: s })}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <Icon name="search" size={28} />
                      <div>Hech narsa topilmadi</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div style={{
          padding: "10px 22px", borderTop: "1px solid var(--border)",
          fontSize: 13, color: "var(--text-faint)", fontWeight: 600,
        }}>
          {filtered.length} ta ko'rsatilmoqda
        </div>
      </Card>

      {/* Modals */}
      {modal?.mode === "add" && (
        <StudentModal
          mode="add"
          onClose={() => setModal(null)}
          onSave={(s) => handleAdd(s)}
          nextId={String(students.length + 1)}
        />
      )}
      {modal?.mode === "edit" && (
        <StudentModal
          mode="edit"
          student={modal.student}
          onClose={() => setModal(null)}
          onSave={(s) => handleEdit(s)}
        />
      )}
      {modal?.mode === "delete" && (
        <DeleteModal
          student={modal.student}
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.student.id)}
        />
      )}
    </div>
  );
}

/* ─── Add / Edit modal ─── */
type StudentModalProps =
  | { mode: "add"; student?: undefined; onClose: () => void; onSave: (s: Student) => void; nextId: string }
  | { mode: "edit"; student: Student;   onClose: () => void; onSave: (s: Student) => void; nextId?: string };

function StudentModal({ mode, student, onClose, onSave, nextId }: StudentModalProps) {
  const [form, setForm] = useState({
    fullName:      student?.fullName      ?? "",
    age:           student?.age           ? String(student.age) : "",
    username:      student?.username      ?? "",
    password:      student?.password      ?? "",
    phone:         student?.phone         ?? "+998",
    level:         student?.level         ?? "Boshlang'ich",
    group:         student?.group         ?? "A",
    teacher:       student?.teacher       ?? "Alisher Karimov",
    paymentStatus: student?.paymentStatus ?? ("kutilmoqda" as PayStatus),
  });

  function handleSave() {
    const s: Student = {
      id: student?.id ?? nextId ?? String(Date.now()),
      fullName:      form.fullName,
      group:         form.group,
      username:      form.username || form.fullName.replace(/\s+/g, "").slice(0, 8),
      password:      form.password || form.fullName.replace(/\s+/g, "").slice(0, 8),
      phone:         form.phone,
      age:           Number(form.age) || 10,
      level:         form.level,
      teacher:       form.teacher,
      joinedAt:      student?.joinedAt ?? new Date().toLocaleDateString("uz-Latn-UZ"),
      status:        student?.status ?? "yangi",
      paymentStatus: form.paymentStatus,
    };
    onSave(s);
  }

  const isAdd = mode === "add";

  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          {isAdd ? "Yangi o'quvchi qo'shish" : "O'quvchini tahrirlash"}
        </div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div style={{ padding: "0 24px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        {isAdd ? (
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: "var(--accent)", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, fontSize: 22, color: "#fff",
          }}>?</div>
        ) : (
          <Avatar name={student.fullName} size="lg" style={{ borderRadius: 12, flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontWeight: 750, fontSize: 15 }}>
            {isAdd ? "Yangi o'quvchi" : student.fullName}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>
            {isAdd ? "Username/parol bo'sh qolsa avtomatik yaratiladi" : "Ma'lumotlarni o'zgartiring"}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)" }} />

      <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Row 1: ISM FAMILYA + YOSHI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 14 }}>
          <FieldWrap label="ISM FAMILYA">
            <input className="inp" value={form.fullName} placeholder="Asilbek Komilov"
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="YOSHI">
            <input className="inp" value={form.age} placeholder="9"
              onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </FieldWrap>
        </div>

        {/* Row 2: USERNAME + PAROL */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="USERNAME">
            <input className="inp" value={form.username}
              placeholder={isAdd ? "avtomatik" : ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="PAROL">
            <input className="inp" value={form.password}
              placeholder={isAdd ? "avtomatik" : ""}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FieldWrap>
        </div>

        {/* Row 3: TELEFON */}
        <FieldWrap label="TELEFON">
          <input className="inp" value={form.phone} placeholder="+998 90 000 00 00"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FieldWrap>

        {/* Row 4: DARAJASI + GURUH */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="DARAJASI">
            <SelectField value={form.level} onChange={(v) => setForm({ ...form, level: v })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="GURUH">
            <SelectField value={form.group} onChange={(v) => setForm({ ...form, group: v })}>
              {GROUPS.map((g) => <option key={g}>{g}</option>)}
            </SelectField>
          </FieldWrap>
        </div>

        {/* Row 5: O'QITUVCHISI + TO'LOV HOLATI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="O'QITUVCHISI">
            <SelectField value={form.teacher} onChange={(v) => setForm({ ...form, teacher: v })}>
              {TEACHERS.map((t) => <option key={t}>{t}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="TO'LOV HOLATI">
            <SelectField value={form.paymentStatus} onChange={(v) => setForm({ ...form, paymentStatus: v as PayStatus })}>
              {PAY_STATUSES.map((p) => <option key={p}>{p}</option>)}
            </SelectField>
          </FieldWrap>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
            onClick={handleSave} disabled={!form.fullName}>
            <Icon name="check" size={15} /> {isAdd ? "Qo'shish" : "Saqlash"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Delete confirmation modal ─── */
function DeleteModal({ student, onClose, onConfirm }: {
  student: Student;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>O'chirishni tasdiqlash</div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div style={{ padding: "10px 24px 32px", textAlign: "center" }}>
        {/* Trash icon */}
        <div style={{
          width: 72, height: 72, margin: "0 auto 18px",
          borderRadius: 18, background: "var(--surface-3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="trash" size={32} style={{ color: "var(--text-faint)" }} />
        </div>
        <div style={{ fontWeight: 750, fontSize: 16, marginBottom: 8 }}>{student.fullName}</div>
        <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>
          Haqiqatan ham bu o'quvchini o'chirmoqchimisiz?
        </div>
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
            border: "none", cursor: "pointer",
          }}
          onClick={onConfirm}
        >
          <Icon name="trash" size={14} /> O'chirish
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Shared modal shell ─── */
function ModalShell({ children, onClose, width = 520 }: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width, maxWidth: "100%", maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Tiny helpers ─── */
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
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select className="inp" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", paddingRight: 36, width: "100%" }}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} style={{
        position: "absolute", right: 12, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: "var(--text-faint)",
      }} />
    </div>
  );
}
