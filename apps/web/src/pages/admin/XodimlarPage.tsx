import { useState } from "react";
import { Avatar, Card, Icon } from "@chess-school/ui";
import {
  useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  type StaffMember,
} from "../../lib/queries.js";

const ROLE_LABELS: Record<string, string> = {
  admin:      "Administrator",
  operator:   "Operator",
  accountant: "Buxgalter",
};

const ROLE_COLORS: Record<string, string> = {
  admin:      "#3b82f6",
  operator:   "#f59e0b",
  accountant: "#a855f7",
};

const ROLE_DESCS: Record<string, string> = {
  admin:      "To'liq huquq",
  operator:   "Arizalar va davomat",
  accountant: "Moliya bo'limi",
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

/* ─── TempPassword modal ─── */
function TempPasswordModal({ name, password, onClose }: { name: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <Card style={{ padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
        <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>{name} qo'shildi</h3>
        <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>Vaqtinchalik parolni saqlang</p>
        <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 16px", fontFamily: "monospace", fontSize: 22, fontWeight: 800, letterSpacing: 4, marginBottom: 16 }}>
          {password}
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 20 }}>Login: telefon raqami</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={copy}>
            <Icon name="download" size={14} /> {copied ? "Nusxalandi!" : "Nusxalash"}
          </button>
          <button className="btn primary" style={{ flex: 1 }} onClick={onClose}>
            Yopish
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Add modal ─── */
function AddModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { fullName: string; phone: string; role: "operator" | "accountant" | "admin" }) => void;
}) {
  const [form, setForm] = useState({ fullName: "", phone: "", role: "operator" as "operator" | "accountant" | "admin" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <Card style={{ padding: 28, maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 800 }}>Yangi xodim</h3>
          <button className="btn" style={{ padding: "4px 8px" }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option value="operator">Operator — Arizalar va davomat</option>
              <option value="accountant">Buxgalter — Moliya bo'limi</option>
              <option value="admin">Administrator — To'liq huquq</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }}
            disabled={!form.fullName || !form.phone}
            onClick={() => onCreate(form)}>
            <Icon name="userPlus" size={14} /> Qo'shish
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Main page ─── */
export default function XodimlarPage() {
  const { data: staff = [], isLoading } = useStaff();
  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();
  const deleteMut = useDeleteStaff();

  const [showAdd, setShowAdd] = useState(false);
  const [tempPwd, setTempPwd] = useState<{ name: string; password: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null);

  function handleCreate(data: { fullName: string; phone: string; role: "operator" | "accountant" | "admin" }) {
    createMut.mutate(data, {
      onSuccess: (res) => {
        setShowAdd(false);
        setTempPwd({ name: data.fullName, password: res.tempPassword });
      },
    });
  }

  function toggleActive(member: StaffMember) {
    updateMut.mutate({ id: member.id, isActive: !member.isActive });
  }

  const byRole = ["admin", "operator", "accountant"];

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
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          <Icon name="userPlus" size={15} /> Xodim qo'shish
        </button>
      </div>

      {/* Role summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap)" }}>
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

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onCreate={handleCreate} />}

      {tempPwd && (
        <TempPasswordModal
          name={tempPwd.name}
          password={tempPwd.password}
          onClose={() => setTempPwd(null)}
        />
      )}

      {confirmDelete && (
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
        </div>
      )}
    </div>
  );
}
