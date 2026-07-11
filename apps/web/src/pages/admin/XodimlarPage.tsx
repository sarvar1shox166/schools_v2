import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon } from "@chess-school/ui";
import {
  useStaff, useUpdateStaff, useDeleteStaff,
  useTeachers, useModeratorTeachers, useAssignModeratorTeachers,
  type StaffMember,
} from "../../lib/queries.js";

const ROLE_LABELS: Record<string, string> = {
  admin:            "Administrator",
  assistant_admin:  "Yordamchi admin",
  moderator:        "Moderator",
  operator:         "Operator",
  accountant:       "Buxgalter",
};

const ROLE_COLORS: Record<string, string> = {
  admin:            "#3b82f6",
  assistant_admin:  "#6366f1",
  moderator:        "#06b6d4",
  operator:         "#f59e0b",
  accountant:       "#a855f7",
};

const ROLE_DESCS: Record<string, string> = {
  admin:            "To'liq huquq",
  assistant_admin:  "Sozlamalardan tashqari hammasi",
  moderator:        "Darslar/davomat nazorati",
  operator:         "Arizalar, o'quvchilar, davomat",
  accountant:       "Moliya bo'limi",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: ROLE_COLORS[role] + "22",
      color: ROLE_COLORS[role],
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: active ? "#22c55e22" : "#6b728022",
      color: active ? "#16a34a" : "#6b7280",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {active ? "Faol" : "Nofaol"}
    </span>
  );
}

/* ─── Main page ─── */
export default function XodimlarPage() {
  const navigate = useNavigate();
  const { data: staff = [], isLoading } = useStaff();
  const updateMut = useUpdateStaff();
  const deleteMut = useDeleteStaff();

  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null);
  const [assignTarget, setAssignTarget] = useState<StaffMember | null>(null);

  function toggleActive(member: StaffMember) {
    updateMut.mutate({ id: member.id, isActive: !member.isActive });
  }

  const byRole = ["admin", "assistant_admin", "moderator", "operator", "accountant"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Xodimlar</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 14 }}>
            Tizim foydalanuvchilari va ularning rollari
          </p>
        </div>
        <button className="btn primary" onClick={() => navigate("/admin/staff/new")}>
          <Icon name="userPlus" size={15} /> Xodim qo'shish
        </button>
      </div>

      {/* Role summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--gap)" }}>
        {byRole.map(role => {
          const count = staff.filter(s => s.role === role).length;
          return (
            <Card key={role} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: ROLE_COLORS[role] + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="user" size={20} style={{ color: ROLE_COLORS[role] }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 22 }}>{count}</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{ROLE_LABELS[role]}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{ROLE_DESCS[role]}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Yuklanmoqda...</div>
        ) : staff.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontWeight: 700 }}>Xodimlar yo'q</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Birinchi xodimni qo'shing</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Xodim</th>
                  <th>Login</th>
                  <th>Rol</th>
                  <th>Holat</th>
                  <th>Qo'shilgan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={member.fullName} size="sm" />
                        <div>
                          <div style={{ fontWeight: 700 }}>{member.fullName}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{member.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: 13, background: "var(--surface-2)", padding: "2px 8px", borderRadius: 6 }}>
                        {member.login}
                      </code>
                    </td>
                    <td><RoleBadge role={member.role} /></td>
                    <td><StatusBadge active={member.isActive} /></td>
                    <td style={{ color: "var(--text-dim)", fontSize: 13 }}>
                      {new Date(member.createdAt).toLocaleDateString("uz-UZ")}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {member.role === "moderator" && (
                          <button
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => setAssignTarget(member)}
                          >
                            O'qituvchilar
                          </button>
                        )}
                        <button
                          className="btn"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => toggleActive(member)}
                          disabled={updateMut.isPending}
                        >
                          {member.isActive ? "Bloklash" : "Faollashtirish"}
                        </button>
                        <button
                          className="btn"
                          style={{ padding: "4px 8px", color: "#dc2626" }}
                          onClick={() => setConfirmDelete(member)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {confirmDelete && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <Card style={{ padding: 28, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>O'chirishni tasdiqlang</h3>
            <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
              <strong>{confirmDelete.fullName}</strong> o'chirilsinmi?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Bekor</button>
              <button className="btn" style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none" }}
                onClick={() => { deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}>
                O'chirish
              </button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {assignTarget && (
        <ModeratorTeachersModal member={assignTarget} onClose={() => setAssignTarget(null)} />
      )}
    </div>
  );
}

/* ─── Moderatorga o'qituvchi biriktirish modali ─── */
function ModeratorTeachersModal({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const { data: teachers = [] } = useTeachers();
  const { data: assignedIds, isLoading } = useModeratorTeachers(member.id);
  const assignMut = useAssignModeratorTeachers();
  const [selected, setSelected] = useState<string[] | null>(null);

  const current = selected ?? assignedIds ?? [];

  function toggle(id: string) {
    setSelected((current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  async function save() {
    await assignMut.mutateAsync({ id: member.id, teacherIds: current });
    onClose();
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Card style={{ padding: 28, maxWidth: 420, width: "100%" }}>
        <h3 style={{ margin: "0 0 4px", fontWeight: 800 }}>{member.fullName} — biriktirilgan o'qituvchilar</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 13, margin: "0 0 16px" }}>
          Moderator faqat shu o'qituvchilarning dars davomatini ko'radi va to'g'irlaydi
        </p>
        {isLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>Yuklanmoqda...</div>
        ) : (
          <div style={{
            border: "1px solid var(--border)", borderRadius: 10, padding: 10,
            display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto", marginBottom: 20,
          }}>
            {teachers.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 4 }}>O'qituvchilar topilmadi</div>
            )}
            {teachers.map((t) => (
              <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={current.includes(t.id)} onChange={() => toggle(t.id)} />
                {t.fullName}
              </label>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 1 }} disabled={assignMut.isPending} onClick={save}>
            {assignMut.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </Card>
    </div>,
    document.body
  );
}
