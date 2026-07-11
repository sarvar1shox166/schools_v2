import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon } from "@chess-school/ui";
import { useCreateStaff, useAssignModeratorTeachers, useTeachers, type StaffRole } from "../../lib/queries.js";

export default function NewStaffPage() {
  const navigate = useNavigate();
  const createStaff = useCreateStaff();
  const assignTeachers = useAssignModeratorTeachers();
  const { data: teachers = [] } = useTeachers();

  const [form, setForm] = useState({ fullName: "", phone: "", role: "operator" as StaffRole });
  const [moderatorTeacherIds, setModeratorTeacherIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);

  const canSubmit = form.fullName.trim().length > 0 && form.phone.trim().length > 0;

  function toggleTeacher(id: string) {
    setModeratorTeacherIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    setError(null);
    try {
      const res = await createStaff.mutateAsync(form);
      if (form.role === "moderator" && moderatorTeacherIds.length > 0) {
        await assignTeachers.mutateAsync({ id: res.id, teacherIds: moderatorTeacherIds });
      }
      setResult(res);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", maxWidth: 480, margin: "0 auto" }}>
        <Card style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>{form.fullName} qo'shildi</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>Vaqtinchalik parolni saqlang</p>
          <div style={{
            background: "var(--surface-2)", borderRadius: 10, padding: "12px 16px",
            fontFamily: "monospace", fontSize: 22, fontWeight: 800, letterSpacing: 4, marginBottom: 16,
          }}>
            {result.tempPassword}
          </div>
          <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 20 }}>Login: telefon raqami</p>
          <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => navigate("/admin/staff")}>
            Xodimlar ro'yxatiga qaytish
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="iconbtn" style={{ width: 38, height: 38, flexShrink: 0 }}
          onClick={() => navigate("/admin/staff")}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Yangi xodim</h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>
            Tizimga yangi xodim qo'shing va rol tayinlang
          </div>
        </div>
      </div>

      <Card style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>TO'LIQ ISM</label>
          <input className="input" style={{ width: "100%", boxSizing: "border-box" }} placeholder="Ism Familiya"
            value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>TELEFON / LOGIN</label>
          <input className="input" style={{ width: "100%", boxSizing: "border-box" }} placeholder="+998901234567"
            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>ROL</label>
          <select className="input" style={{ width: "100%", boxSizing: "border-box" }}
            value={form.role} onChange={e => setForm({ ...form, role: e.target.value as StaffRole })}>
            <option value="operator">Operator — Arizalar, o'quvchilar, davomat</option>
            <option value="moderator">Moderator — Darslar/davomat nazorati</option>
            <option value="accountant">Buxgalter — Moliya bo'limi</option>
            <option value="assistant_admin">Yordamchi admin — Sozlamalardan tashqari hammasi</option>
            <option value="admin">Administrator — To'liq huquq</option>
          </select>
        </div>

        {form.role === "moderator" && (
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>
              BIRIKTIRILGAN O'QITUVCHILAR
            </label>
            <div style={{
              border: "1px solid var(--border)", borderRadius: 10, padding: 10,
              display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto",
            }}>
              {teachers.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 4 }}>O'qituvchilar topilmadi</div>
              )}
              {teachers.map((t) => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={moderatorTeacherIds.includes(t.id)} onChange={() => toggleTeacher(t.id)} />
                  {t.fullName}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
              Moderator faqat shu o'qituvchilarning dars davomatini ko'radi va to'g'irlaydi
            </div>
          </div>
        )}

        {error && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate("/admin/staff")}>
            Bekor
          </button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
            disabled={!canSubmit || createStaff.isPending}
            onClick={handleSubmit}>
            <Icon name="userPlus" size={14} /> {createStaff.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        </div>
      </Card>
    </div>
  );
}
