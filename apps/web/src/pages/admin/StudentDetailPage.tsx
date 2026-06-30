import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Card, Icon } from "@chess-school/ui";
import {
  useStudent, useUpdateStudent, useDeleteStudent,
  useResetStudentPassword, useStudentPackages, useAssignPackage,
  useGroups, usePackages,
  type Package, type StudentDetail,
} from "../../lib/queries.js";

const LEVELS = ["Boshlang'ich", "1-razryad", "2-razryad", "3-razryad", "4-razryad", "Nomzod"];
const METHODS = [
  { v: "naqd",   label: "Naqd",    icon: "💵" },
  { v: "uzcard", label: "UzCard",  icon: "💳" },
  { v: "click",  label: "Click",   icon: "📱" },
  { v: "payme",  label: "Payme",   icon: "🟢" },
] as const;
type PayMethod = "naqd" | "uzcard" | "click" | "payme";

const PAY_STATUS_LABEL: Record<string, string> = {
  active: "To'langan", debt: "Qarzdor",
  no_package: "Paket yo'q", inactive: "Nofaol",
};
const PAY_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  active:     { bg: "#d1fae5", color: "#059669" },
  debt:       { bg: "#fee2e2", color: "#dc2626" },
  no_package: { bg: "var(--surface-3)", color: "var(--text-faint)" },
  inactive:   { bg: "var(--surface-3)", color: "var(--text-faint)" },
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: student, isLoading } = useStudent(id);
  const { data: pkgHistory = [] } = useStudentPackages(id ?? null);
  const { data: groups = [] } = useGroups();
  const { data: packages = [] } = usePackages();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const resetPassword = useResetStudentPassword();
  const assignPackage = useAssignPackage();

  /* Edit mode */
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ fullName: string; phone: string; age: string; level: string; status: string } | null>(null);

  /* New password reveal */
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);

  /* Add package modal */
  const [showPayModal, setShowPayModal] = useState(false);
  const [pay, setPay] = useState({ packageId: "", method: "naqd" as PayMethod, expiresAt: "" });

  /* Delete confirm */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-faint)", fontWeight: 600 }}>
        Yuklanmoqda...
      </div>
    );
  }
  if (!student) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12 }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontWeight: 700, color: "var(--text-faint)" }}>O'quvchi topilmadi</div>
        <button className="btn" onClick={() => navigate("/admin/students")}>Orqaga</button>
      </div>
    );
  }

  const ps = student.paymentStatus;
  const psStyle = ps ? (PAY_STATUS_COLOR[ps] ?? PAY_STATUS_COLOR.no_package) : null;
  const attendancePct = student.totalLessons > 0
    ? Math.round((student.presentCount / student.totalLessons) * 100)
    : 0;

  function startEdit() {
    setForm({
      fullName: student!.fullName,
      phone: student!.phone,
      age: student!.age ? String(student!.age) : "",
      level: student!.level ?? "",
      status: student!.status,
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!form || !id) return;
    await updateStudent.mutateAsync({
      id,
      fullName: form.fullName,
      phone: form.phone,
      age: form.age ? Number(form.age) : undefined,
      level: form.level || undefined,
      status: form.status as StudentDetail["status"],
    });
    setEditing(false);
  }

  async function handleResetPassword() {
    if (!id) return;
    const res = await resetPassword.mutateAsync(id);
    setNewPassword(res.tempPassword);
    setShowPwModal(true);
  }

  async function handleAssignPackage() {
    if (!id || !pay.packageId) return;
    await assignPackage.mutateAsync({
      studentId: id,
      packageId: pay.packageId,
      method: pay.method,
      expiresAt: pay.expiresAt || undefined,
    });
    setShowPayModal(false);
    setPay({ packageId: "", method: "naqd", expiresAt: "" });
  }

  async function handleDelete() {
    if (!id) return;
    await deleteStudent.mutateAsync(id);
    navigate("/admin/students");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="iconbtn" style={{ width: 38, height: 38, flexShrink: 0 }}
          onClick={() => navigate("/admin/students")}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {student.fullName}
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>
            O'quvchi profili
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={() => setShowDeleteConfirm(true)}>
            <Icon name="trash" size={14} /> O'chirish
          </button>
          {editing ? (
            <>
              <button className="btn" onClick={() => setEditing(false)}>Bekor</button>
              <button className="btn primary" onClick={saveEdit} disabled={updateStudent.isPending}>
                <Icon name="check" size={14} /> {updateStudent.isPending ? "..." : "Saqlash"}
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={startEdit}>
              <Icon name="edit" size={14} /> Tahrirlash
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "var(--gap)", alignItems: "start" }}>

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* Profile card */}
          <Card style={{ padding: "28px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <Avatar name={student.fullName} size="xl" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{student.fullName}</div>
                <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>
                  {student.groups.map(g => g.name).join(", ") || "Guruhsiz"}
                </div>
                {ps && psStyle && (
                  <span style={{
                    display: "inline-flex", marginTop: 8,
                    padding: "3px 12px", borderRadius: 20, fontSize: 12.5,
                    fontWeight: 700, background: psStyle.bg, color: psStyle.color,
                  }}>
                    {PAY_STATUS_LABEL[ps]}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              {[
                { label: "XP",      value: student.xp?.xp ?? 0 },
                { label: "Daraja",  value: student.xp?.level ?? 1 },
                { label: "Streak",  value: `${student.xp?.streak ?? 0}🔥` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: "var(--surface-2)", borderRadius: 10,
                  padding: "10px 8px", textAlign: "center",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Info rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Telefon",    value: student.phone },
                { label: "Yoshi",      value: student.age ? `${student.age} yosh` : "—" },
                { label: "Darajasi",   value: student.level ?? "—" },
                { label: "Holati",     value: student.status },
                { label: "ELO",        value: student.xp?.elo ? String(student.xp.elo) : "—" },
                { label: "Qo'shilgan", value: new Date(student.joinedAt).toLocaleDateString("uz-Latn-UZ") },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid var(--border)",
                  fontSize: 13.5,
                }}>
                  <span style={{ color: "var(--text-faint)" }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Login / password card */}
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Kirish ma'lumotlari</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={labelStyle}>USERNAME</div>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--surface-2)", fontFamily: "monospace",
                  fontWeight: 700, fontSize: 15, color: "var(--text)",
                }}>
                  {student.login ?? student.phone}
                </div>
              </div>
              <div>
                <div style={labelStyle}>PAROL</div>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--surface-2)", fontFamily: "monospace",
                  fontWeight: 700, fontSize: 15, color: "var(--text-faint)",
                  letterSpacing: 3,
                }}>
                  ••••••••
                </div>
              </div>
              <button className="btn" style={{ width: "100%", justifyContent: "center" }}
                onClick={handleResetPassword} disabled={resetPassword.isPending}>
                <Icon name="refresh" size={14} />
                {resetPassword.isPending ? "Yangilanmoqda..." : "Yangi parol yaratish"}
              </button>
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* Edit form (shown when editing) */}
          {editing && form && (
            <Card style={{ padding: "24px 28px" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>Ma'lumotlarni tahrirlash</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FieldWrap label="ISM FAMILYA">
                  <input className="inp" style={{ width: "100%" }} value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="YOSHI">
                  <input className="inp" style={{ width: "100%" }} value={form.age} type="number"
                    onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="TELEFON">
                  <input className="inp" style={{ width: "100%" }} value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="DARAJASI">
                  <Sel value={form.level} onChange={(v) => setForm({ ...form, level: v })}>
                    <option value="">Tanlang...</option>
                    {LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </Sel>
                </FieldWrap>
                <FieldWrap label="HOLATI">
                  <Sel value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                    <option value="yangi">Yangi</option>
                    <option value="faol">Faol</option>
                    <option value="nofaol">Nofaol</option>
                  </Sel>
                </FieldWrap>
                <FieldWrap label="GURUH">
                  <Sel value={student.groups[0]?.id ?? ""} onChange={() => {}}>
                    <option value="">Guruhsiz</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Sel>
                </FieldWrap>
              </div>
            </Card>
          )}

          {/* Attendance summary */}
          <Card style={{ padding: "24px 28px" }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>Davomat statistikasi</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Jami darslar", value: student.totalLessons, color: "var(--accent)" },
                { label: "Qatnashdi",    value: student.presentCount,  color: "#22c55e" },
                { label: "Davomat %",    value: `${attendancePct}%`,   color: attendancePct >= 75 ? "#22c55e" : "#ef4444" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: "var(--surface-2)", borderRadius: 12,
                  padding: "16px 14px", textAlign: "center",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{
                height: 8, borderRadius: 4,
                background: "var(--surface-3)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${attendancePct}%`,
                  background: attendancePct >= 75 ? "#22c55e" : "#ef4444",
                  transition: "width .6s ease",
                }} />
              </div>
            </div>
          </Card>

          {/* Packages */}
          <Card style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>To'lov tarixi</div>
              <button className="btn primary" onClick={() => setShowPayModal(true)}>
                <Icon name="plus" size={14} /> Paket qo'shish
              </button>
            </div>

            {pkgHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-faint)", fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                Hali paket tayinlanmagan
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pkgHistory.map((pkg) => {
                  const pct = Math.round((pkg.usedLessons / pkg.totalLessons) * 100);
                  const statusColor = pkg.status === "active" ? "#22c55e" : pkg.status === "finished" ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={pkg.id} style={{
                      border: "1px solid var(--border)", borderRadius: 12,
                      padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{pkg.packageName}</div>
                          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                            {new Date(pkg.purchasedAt).toLocaleDateString("uz-Latn-UZ")}
                            {pkg.expiresAt && ` — ${new Date(pkg.expiresAt).toLocaleDateString("uz-Latn-UZ")}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{
                            padding: "2px 10px", borderRadius: 20, fontSize: 11.5,
                            fontWeight: 700, background: `${statusColor}22`, color: statusColor,
                          }}>
                            {pkg.status === "active" ? "Faol" : pkg.status === "finished" ? "Tugagan" : "Muddati o'tgan"}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)" }}>
                            {pkg.price.toLocaleString()} so'm
                          </span>
                        </div>
                      </div>
                      {/* Lesson progress */}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
                        <span>{pkg.usedLessons} / {pkg.totalLessons} dars</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          width: `${pct}%`, background: statusColor,
                          transition: "width .4s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Password modal ── */}
      {showPwModal && newPassword && (
        <Overlay onClose={() => { setShowPwModal(false); setNewPassword(null); }}>
          <ModalBox>
            <ModalHead title="Yangi parol yaratildi" onClose={() => { setShowPwModal(false); setNewPassword(null); }} />
            <div style={{ padding: "0 24px 28px", textAlign: "center" }}>
              <div style={{
                width: 60, height: 60, margin: "0 auto 16px", borderRadius: 16,
                background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              }}>🔑</div>
              <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 14 }}>
                <b>{student.fullName}</b> uchun yangi vaqtinchalik parol:
              </div>
              <div style={{
                padding: "16px 24px", borderRadius: 12, background: "var(--surface-2)",
                fontFamily: "monospace", fontWeight: 800, fontSize: 28, letterSpacing: 4,
              }}>
                {newPassword}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
                Bu parolni o'quvchiga bering — keyinchalik ko'rsatilmaydi
              </div>
              <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
                onClick={() => { setShowPwModal(false); setNewPassword(null); }}>
                Tushunarli
              </button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Add package modal ── */}
      {showPayModal && (
        <Overlay onClose={() => setShowPayModal(false)}>
          <ModalBox>
            <ModalHead title="Paket qo'shish" onClose={() => setShowPayModal(false)} />
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <FieldWrap label="PAKET">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {packages.map((pkg: Package) => (
                    <button key={pkg.id} onClick={() => setPay({ ...pay, packageId: pkg.id })}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        border: pay.packageId === pkg.id ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                        background: pay.packageId === pkg.id
                          ? "color-mix(in oklab, var(--accent) 8%, var(--surface))"
                          : "var(--surface-2)",
                      }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{pkg.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{pkg.lessonsCount} dars</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: pay.packageId === pkg.id ? "var(--accent)" : "var(--text)" }}>
                        {pkg.price.toLocaleString()} so'm
                      </div>
                    </button>
                  ))}
                </div>
              </FieldWrap>

              <FieldWrap label="TO'LOV USULI">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {METHODS.map((m) => (
                    <button key={m.v} onClick={() => setPay({ ...pay, method: m.v })}
                      style={{
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        border: pay.method === m.v ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                        background: pay.method === m.v
                          ? "color-mix(in oklab, var(--accent) 8%, var(--surface))"
                          : "var(--surface-2)",
                        fontWeight: 700, fontSize: 13, color: "var(--text)",
                      }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </FieldWrap>

              <FieldWrap label="MUDDATI (ixtiyoriy)">
                <input className="inp" style={{ width: "100%" }} type="date"
                  value={pay.expiresAt} min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPay({ ...pay, expiresAt: e.target.value })} />
              </FieldWrap>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowPayModal(false)}>Bekor</button>
                <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
                  disabled={!pay.packageId || assignPackage.isPending}
                  onClick={handleAssignPackage}>
                  <Icon name="check" size={14} />
                  {assignPackage.isPending ? "Saqlanmoqda..." : "Rasmiylashtirish"}
                </button>
              </div>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <Overlay onClose={() => setShowDeleteConfirm(false)}>
          <ModalBox width={420}>
            <ModalHead title="O'chirishni tasdiqlash" onClose={() => setShowDeleteConfirm(false)} />
            <div style={{ padding: "8px 24px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{student.fullName}</div>
              <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 24 }}>
                Bu o'quvchini o'chirsangiz barcha ma'lumotlari (davomat, paketlar) ham o'chadi.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowDeleteConfirm(false)}>Bekor</button>
                <button style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  height: 42, borderRadius: 10, border: "none", cursor: "pointer",
                  background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14,
                  opacity: deleteStudent.isPending ? 0.7 : 1,
                }} disabled={deleteStudent.isPending} onClick={handleDelete}>
                  <Icon name="trash" size={14} /> {deleteStudent.isPending ? "..." : "O'chirish"}
                </button>
              </div>
            </div>
          </ModalBox>
        </Overlay>
      )}
    </div>
  );
}

/* ── Shared small components ── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function ModalBox({ children, width = 520 }: { children: React.ReactNode; width?: number }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: 18, width,
      maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 24px 64px rgba(0,0,0,.22)",
    }}>
      {children}
    </div>
  );
}

function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 24px 16px",
    }}>
      <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
      <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}
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

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", color: "var(--text-faint)",
  marginBottom: 7, textTransform: "uppercase",
};
