import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, Icon } from "@chess-school/ui";
import {
  useCreateStudent, useGroups, usePackages, useAssignPackage,
  type Package,
} from "../../lib/queries.js";

const LEVELS = ["Boshlang'ich", "1-razryad", "2-razryad", "3-razryad", "4-razryad", "Nomzod"];
const METHODS = [
  { v: "naqd",   label: "Naqd pul",     icon: "💵" },
  { v: "uzcard", label: "UzCard",        icon: "💳" },
  { v: "click",  label: "Click",         icon: "📱" },
  { v: "payme",  label: "Payme",         icon: "🟢" },
] as const;

type Method = "naqd" | "uzcard" | "click" | "payme";

export default function NewStudentPage() {
  const navigate = useNavigate();
  const createStudent = useCreateStudent();
  const assignPackage = useAssignPackage();
  const { data: groups = [] } = useGroups();
  const { data: packages = [] } = usePackages();

  /* Student form */
  const [info, setInfo] = useState({
    fullName: "",
    phone: "+998",
    age: "",
    level: "",
    groupId: "",
  });

  /* Payment form */
  const [withPayment, setWithPayment] = useState(true);
  const [pay, setPay] = useState({
    packageId: "",
    method: "naqd" as Method,
    expiresAt: "",
  });

  /* Result */
  type Result = { tempPassword: string; studentName: string; packageName?: string; amount?: number };
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPkg = packages.find((p: Package) => p.id === pay.packageId);
  const isPending = createStudent.isPending || assignPackage.isPending;
  const canSubmit = info.fullName.trim().length > 0 &&
    (!withPayment || (!!pay.packageId));

  async function handleSubmit() {
    setError(null);
    try {
      const res = await createStudent.mutateAsync({
        fullName: info.fullName.trim(),
        phone: info.phone.trim(),
        level: info.level || undefined,
        age: info.age ? Number(info.age) : undefined,
        groupId: info.groupId || undefined,
      }) as { id: string; tempPassword: string };

      if (withPayment && pay.packageId) {
        await assignPackage.mutateAsync({
          studentId: res.id,
          packageId: pay.packageId,
          method: pay.method,
          expiresAt: pay.expiresAt || undefined,
        });
      }

      setResult({
        tempPassword: res.tempPassword,
        studentName: info.fullName.trim(),
        packageName: selectedPkg?.name,
        amount: selectedPkg?.price,
      });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    }
  }

  /* ── Success screen ── */
  if (result) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "var(--gap)" }}>
        <Card style={{ padding: "40px 36px", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, margin: "0 auto 20px", borderRadius: 20,
            background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="check" size={32} style={{ color: "#059669" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            O'quvchi qo'shildi!
          </div>
          <div style={{ color: "var(--text-faint)", fontSize: 14, marginBottom: 28 }}>
            {result.studentName} muvaffaqiyatli ro'yxatdan o'tkazildi
          </div>

          {/* Temp password */}
          <div style={{
            background: "var(--surface-2)", borderRadius: 14,
            padding: "18px 24px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 10 }}>
              VAQTINCHALIK PAROL
            </div>
            <div style={{
              fontFamily: "monospace", fontWeight: 800, fontSize: 28,
              letterSpacing: 4, color: "var(--text)",
            }}>
              {result.tempPassword}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
              Bu parolni o'quvchiga bering — keyinchalik ko'rsatilmaydi
            </div>
          </div>

          {/* Package info */}
          {result.packageName && (
            <div style={{
              background: "#d1fae522", border: "1px solid #d1fae5",
              borderRadius: 12, padding: "14px 18px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#059669", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="wallet" size={16} style={{ color: "#fff" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{result.packageName}</div>
                <div style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                  {result.amount?.toLocaleString()} so'm to'landi
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                setResult(null);
                setInfo({ fullName: "", phone: "+998", age: "", level: "", groupId: "" });
                setPay({ packageId: "", method: "naqd", expiresAt: "" });
              }}
            >
              Yana qo'shish
            </button>
            <button
              className="btn primary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => navigate("/admin/students")}
            >
              <Icon name="students" size={15} /> O'quvchilar
            </button>
          </div>
        </Card>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          className="iconbtn"
          style={{ width: 38, height: 38, flexShrink: 0 }}
          onClick={() => navigate("/admin/students")}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Yangi o'quvchi qo'shish
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>
            Ma'lumotlarni to'ldiring va to'lovni rasmiylashtiring
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)", alignItems: "start" }}>

        {/* ── Section 1: Student info ── */}
        <Card style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 22, color: "#fff", flexShrink: 0,
            }}>
              {info.fullName ? <Avatar name={info.fullName} size="md" /> : "?"}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {info.fullName || "Yangi o'quvchi"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                Shaxsiy ma'lumotlar
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          {/* ISM FAMILYA + YOSHI */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 12 }}>
            <Field label="ISM FAMILYA">
              <input className="inp" style={{ width: "100%" }}
                placeholder="Asilbek Komilov" value={info.fullName}
                onChange={(e) => setInfo({ ...info, fullName: e.target.value })} />
            </Field>
            <Field label="YOSHI">
              <input className="inp" style={{ width: "100%" }}
                placeholder="9" value={info.age} type="number" min={3} max={99}
                onChange={(e) => setInfo({ ...info, age: e.target.value })} />
            </Field>
          </div>

          {/* TELEFON */}
          <Field label="TELEFON">
            <input className="inp" style={{ width: "100%" }}
              placeholder="+998 90 000 00 00" value={info.phone}
              onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
          </Field>

          {/* DARAJASI + GURUH */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="DARAJASI">
              <Sel value={info.level} onChange={(v) => setInfo({ ...info, level: v })}>
                <option value="">Tanlang...</option>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </Sel>
            </Field>
            <Field label="GURUH">
              <Sel value={info.groupId} onChange={(v) => setInfo({ ...info, groupId: v })}>
                <option value="">Guruhsiz</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Sel>
            </Field>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px" }}>
            💡 Username va parol avtomatik yaratiladi
          </div>
        </Card>

        {/* ── Section 2: Payment ── */}
        <Card style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Toggle header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: withPayment ? "#d1fae5" : "var(--surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .2s",
              }}>
                <Icon name="wallet" size={22} style={{ color: withPayment ? "#059669" : "var(--text-faint)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>To'lov</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                  {withPayment ? "To'lov hozir rasmiylashtirish" : "Keyinroq qo'shiladi"}
                </div>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={() => setWithPayment(!withPayment)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                background: withPayment ? "var(--accent)" : "var(--border)",
                position: "relative", transition: "background .2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: withPayment ? 25 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff", transition: "left .2s",
                boxShadow: "0 1px 4px rgba(0,0,0,.2)",
              }} />
            </button>
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          {withPayment ? (
            <>
              {/* Package selector */}
              <Field label="PAKET">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {packages.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--text-faint)", padding: "12px 0" }}>
                      Paketlar topilmadi. Avval paket yarating.
                    </div>
                  ) : (
                    packages.map((pkg: Package) => (
                      <button
                        key={pkg.id}
                        onClick={() => setPay({ ...pay, packageId: pkg.id })}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                          border: pay.packageId === pkg.id
                            ? "2px solid var(--accent)"
                            : "1.5px solid var(--border)",
                          background: pay.packageId === pkg.id
                            ? "color-mix(in oklab, var(--accent) 8%, var(--surface))"
                            : "var(--surface-2)",
                          transition: "all .15s",
                          textAlign: "left",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                            {pkg.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                            {pkg.lessonsCount} dars
                          </div>
                        </div>
                        <div style={{
                          fontWeight: 800, fontSize: 15,
                          color: pay.packageId === pkg.id ? "var(--accent)" : "var(--text)",
                        }}>
                          {pkg.price.toLocaleString()} so'm
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Field>

              {/* Payment method */}
              <Field label="TO'LOV USULI">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {METHODS.map((m) => (
                    <button
                      key={m.v}
                      onClick={() => setPay({ ...pay, method: m.v })}
                      style={{
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        border: pay.method === m.v ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                        background: pay.method === m.v
                          ? "color-mix(in oklab, var(--accent) 8%, var(--surface))"
                          : "var(--surface-2)",
                        fontWeight: 700, fontSize: 13, color: "var(--text)",
                        transition: "all .15s",
                      }}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Expiry date (optional) */}
              <Field label="MUDDATI (ixtiyoriy)">
                <input className="inp" style={{ width: "100%" }}
                  type="date" value={pay.expiresAt}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPay({ ...pay, expiresAt: e.target.value })} />
              </Field>

              {/* Summary */}
              {selectedPkg && (
                <div style={{
                  borderRadius: 12, padding: "14px 18px",
                  background: "color-mix(in oklab, var(--accent) 6%, var(--surface))",
                  border: "1px solid color-mix(in oklab, var(--accent) 20%, transparent)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: 8 }}>
                    JAMI TO'LOV
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, color: "var(--text-faint)" }}>
                      {selectedPkg.name} · {selectedPkg.lessonsCount} dars
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>
                      {selectedPkg.price.toLocaleString()} so'm
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{
              padding: "28px 20px", textAlign: "center",
              color: "var(--text-faint)", fontSize: 14,
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
              To'lov keyinroq "To'lovlar" bo'limidan rasmiylashtirish mumkin.
              <div style={{ marginTop: 8, fontSize: 12 }}>
                O'quvchi "Paket yo'q" holida qo'shiladi.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 18px", borderRadius: 10,
          background: "#fee2e2", color: "#dc2626",
          fontSize: 14, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, maxWidth: 480 }}>
        <button
          className="btn"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => navigate("/admin/students")}
        >
          Bekor
        </button>
        <button
          className="btn primary"
          style={{ flex: 2, justifyContent: "center" }}
          disabled={!canSubmit || isPending}
          onClick={handleSubmit}
        >
          <Icon name="check" size={15} />
          {isPending ? "Saqlanmoqda..." : withPayment ? "Qo'shish va to'lovni rasmiylashtirish" : "O'quvchi qo'shish"}
        </button>
      </div>
    </div>
  );
}

/* ── Shared tiny components ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

function Sel({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
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
