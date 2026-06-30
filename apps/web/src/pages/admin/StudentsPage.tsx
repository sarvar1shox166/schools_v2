import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, Icon } from "@chess-school/ui";
import {
  useStudents,
  useCreateStudent,
  useDeleteStudent,
  useUpdateStudent,
  useGroups,
} from "../../lib/queries.js";

/* ─── Types ─── */
type Student = {
  id: string;
  fullName: string;
  phone: string;
  login?: string;
  level: string | null;
  age: number | null;
  status: "yangi" | "faol" | "nofaol";
  joinedAt: string;
  groups: Array<{ id: string; name: string; teacherName?: string | null }>;
  paymentStatus?: "active" | "debt" | "inactive" | "no_package" | null;
  activePackageExpires?: string | null;
};

/* ─── Constants ─── */
const LEVELS = ["Boshlang'ich", "1-razryad", "2-razryad", "3-razryad", "4-razryad", "Nomzod"];

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
  { v: "nofaol"  as const, label: "Nofaol" },
];

type FilterTab = "hammasi" | "faol" | "yangi" | "nofaol";

const PAY_STATUS_LABEL: Record<string, string> = {
  active:     "To'langan",
  debt:       "Qarzdor",
  no_package: "Paket yo'q",
  inactive:   "Nofaol",
};

const PAY_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  active:     { bg: "#d1fae5", color: "#059669" },
  debt:       { bg: "#fee2e2", color: "#dc2626" },
  no_package: { bg: "var(--surface-3)", color: "var(--text-faint)" },
  inactive:   { bg: "var(--surface-3)", color: "var(--text-faint)" },
};

/* ─── Page ─── */
export default function StudentsPage() {
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useStudents();
  const [tab, setTab] = useState<FilterTab>("hammasi");
  const [q, setQ] = useState("");

  type Modal =
    | { mode: "add" }
    | { mode: "edit"; student: Student }
    | { mode: "delete"; student: Student }
    | { mode: "created"; tempPassword: string }
    | null;
  const [modal, setModal] = useState<Modal>(null);

  const filtered = useMemo(() => {
    let rows = students as Student[];
    if (tab !== "hammasi") rows = rows.filter((s) => s.status === tab);
    if (q) {
      const lq = q.toLowerCase();
      rows = rows.filter((s) =>
        s.fullName.toLowerCase().includes(lq) ||
        (s.login ?? "").toLowerCase().includes(lq) ||
        s.phone.includes(lq)
      );
    }
    return rows;
  }, [students, tab, q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          O'quvchilar — {(students as Student[]).length} ta
        </h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn">
            <Icon name="download" size={15} /> Eksport
          </button>
          <button className="btn primary" onClick={() => navigate("/admin/students/new")}>
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

        {/* Loading */}
        {isLoading && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)", fontWeight: 600 }}>
            Yuklanmoqda...
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ISM FAMILYA</th>
                  <th>USERNAME</th>
                  <th>TEL RAQAM</th>
                  <th>YOSHI</th>
                  <th>DARAJASI</th>
                  <th>GURUH</th>
                  <th>TO'LOV</th>
                  <th>HOLATI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const ps = s.paymentStatus;
                  const psStyle = ps ? (PAY_STATUS_COLOR[ps] ?? PAY_STATUS_COLOR.no_package) : null;
                  const psLabel = ps ? (PAY_STATUS_LABEL[ps] ?? ps) : null;
                  return (
                    <tr key={s.id}
                      onClick={() => navigate(`/admin/students/${s.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="with-av">
                          <div style={{ borderRadius: 10, flexShrink: 0, display: "inline-flex" }}><Avatar name={s.fullName} size="sm" /></div>
                          <div>
                            <div className="cell-main">{s.fullName}</div>
                            <div className="cell-sub">{new Date(s.joinedAt).toLocaleDateString("uz-Latn-UZ")}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.login ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "3px 10px", borderRadius: 6,
                            background: "var(--surface-2)", fontSize: 12.5,
                            fontWeight: 700, fontFamily: "monospace",
                            color: "var(--text-dim)",
                          }}>
                            @{s.login}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-faint)", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>{s.phone}</td>
                      <td style={{ fontWeight: 700, fontSize: 14 }}>{s.age ?? "—"}</td>
                      <td>
                        {s.level ? (
                          <span style={{
                            fontWeight: 700, fontSize: 13.5,
                            color: LEVEL_COLOR[s.level] ?? "var(--text)",
                          }}>
                            {s.level}
                          </span>
                        ) : <span style={{ color: "var(--text-faint)" }}>—</span>}
                      </td>
                      <td>
                        {s.groups.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {s.groups.map((g) => (
                              <span key={g.id} style={{
                                display: "inline-flex", alignItems: "center",
                                padding: "2px 8px", borderRadius: 6,
                                background: "var(--surface-2)", fontSize: 12,
                                fontWeight: 600, color: "var(--text-dim)",
                              }}>
                                {g.name}
                              </span>
                            ))}
                          </div>
                        ) : <span style={{ color: "var(--text-faint)", fontSize: 13 }}>—</span>}
                      </td>
                      <td>
                        {psStyle && psLabel ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "3px 10px", borderRadius: 6, fontSize: 12.5,
                            fontWeight: 700, background: psStyle.bg, color: psStyle.color,
                          }}>
                            {psLabel}
                          </span>
                        ) : <span style={{ color: "var(--text-faint)", fontSize: 13 }}>—</span>}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "3px 10px", borderRadius: 6, fontSize: 12.5, fontWeight: 700,
                          background: s.status === "faol" ? "#d1fae5" : s.status === "yangi" ? "#dbeafe" : "var(--surface-3)",
                          color: s.status === "faol" ? "#059669" : s.status === "yangi" ? "#2563eb" : "var(--text-faint)",
                        }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
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
        )}

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
          onCreated={(tempPassword) => setModal({ mode: "created", tempPassword })}
        />
      )}
      {modal?.mode === "edit" && (
        <StudentModal
          mode="edit"
          student={modal.student}
          onClose={() => setModal(null)}
          onCreated={() => setModal(null)}
        />
      )}
      {modal?.mode === "delete" && (
        <DeleteModal
          student={modal.student}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "created" && (
        <TempPasswordModal
          tempPassword={modal.tempPassword}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Temp password modal shown after creation ─── */
function TempPasswordModal({ tempPassword, onClose }: { tempPassword: string; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>O'quvchi qo'shildi</div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
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
        <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 14 }}>
          O'quvchi muvaffaqiyatli yaratildi. Vaqtinchalik parol:
        </div>
        <div style={{
          padding: "12px 20px", borderRadius: 10, background: "var(--surface-2)",
          fontFamily: "monospace", fontWeight: 800, fontSize: 22, letterSpacing: 2,
          color: "var(--text)",
        }}>
          {tempPassword}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
          Bu parolni o'quvchiga bering. Uni saqlang — keyinchalik ko'rsatilmaydi.
        </div>
      </div>
      <div style={{ height: 1, background: "var(--border)" }} />
      <div style={{ padding: "18px 24px" }}>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={onClose}>
          Tushunarli
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Add / Edit modal ─── */
type StudentModalProps =
  | { mode: "add"; student?: undefined; onClose: () => void; onCreated: (tempPassword: string) => void }
  | { mode: "edit"; student: Student; onClose: () => void; onCreated: (tempPassword?: string) => void };

function StudentModal({ mode, student, onClose, onCreated }: StudentModalProps) {
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const { data: groups = [] } = useGroups();

  const [form, setForm] = useState({
    fullName: student?.fullName ?? "",
    phone:    student?.phone   ?? "+998",
    level:    student?.level   ?? "",
    age:      student?.age     ? String(student.age) : "",
    groupId:  student?.groups?.[0]?.id ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const isAdd = mode === "add";
  const isPending = createStudent.isPending || updateStudent.isPending;

  async function handleSave() {
    setError(null);
    try {
      if (isAdd) {
        const res = await createStudent.mutateAsync({
          fullName: form.fullName,
          phone:    form.phone,
          level:    form.level || undefined,
          age:      form.age ? Number(form.age) : undefined,
          groupId:  form.groupId || undefined,
        });
        onCreated((res as { id: string; tempPassword: string }).tempPassword ?? "");
      } else {
        await updateStudent.mutateAsync({
          id:       student!.id,
          fullName: form.fullName,
          phone:    form.phone,
          level:    form.level || undefined,
          age:      form.age ? Number(form.age) : undefined,
        });
        onCreated();
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

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
          <div style={{ borderRadius: 12, flexShrink: 0, display: "inline-flex" }}><Avatar name={student!.fullName} size="lg" /></div>
        )}
        <div>
          <div style={{ fontWeight: 750, fontSize: 15 }}>
            {isAdd ? "Yangi o'quvchi" : student!.fullName}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>
            {isAdd ? "Ma'lumotlarni to'ldiring" : "Ma'lumotlarni o'zgartiring"}
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

        {/* TELEFON */}
        <FieldWrap label="TELEFON">
          <input className="inp" value={form.phone} placeholder="+998 90 000 00 00"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FieldWrap>

        {/* DARAJASI + GURUH */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="DARAJASI">
            <SelectField value={form.level} onChange={(v) => setForm({ ...form, level: v })}>
              <option value="">Tanlang...</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="GURUH">
            <SelectField value={form.groupId} onChange={(v) => setForm({ ...form, groupId: v })}>
              <option value="">Guruhsiz</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </SelectField>
          </FieldWrap>
        </div>

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
            onClick={handleSave} disabled={!form.fullName || isPending}>
            <Icon name="check" size={15} /> {isPending ? "Saqlanmoqda..." : isAdd ? "Qo'shish" : "Saqlash"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Delete confirmation modal ─── */
function DeleteModal({ student, onClose }: {
  student: Student;
  onClose: () => void;
}) {
  const deleteStudent = useDeleteStudent();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await deleteStudent.mutateAsync(student.id);
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
            border: "none", cursor: "pointer", opacity: deleteStudent.isPending ? 0.7 : 1,
          }}
          onClick={handleConfirm}
          disabled={deleteStudent.isPending}
        >
          <Icon name="trash" size={14} /> {deleteStudent.isPending ? "O'chirilmoqda..." : "O'chirish"}
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
