import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon, fmtSom } from "@chess-school/ui";
import {
  useStudentDeletionImpact,
  useDeleteStudent,
  useDeactivateStudent,
} from "../lib/queries.js";
import { extractErrorMessage } from "../lib/errorToast.js";

const warnBox = {
  display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, fontSize: 13, lineHeight: 1.45,
} as const;

/**
 * O'quvchini o'chirish tasdiqlash oynasi. Avval serverdan "nima yo'qoladi / nima bloklaydi"
 * ma'lumotini oladi: moliyaviy yoki dars tarixi bo'lsa o'chirishni taqiqlaydi va "Nofaol qilish"ni
 * taklif qiladi; toza o'quvchi uchun nima o'chishini sanab, qaytarib bo'lmasligi haqida ogohlantiradi.
 */
export function DeleteStudentModal({ studentId, studentName, onClose, onDone }: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onDone?: (result: "deleted" | "deactivated") => void;
}) {
  const { data: impact, isLoading, isError } = useStudentDeletionImpact(studentId);
  const deleteStudent = useDeleteStudent();
  const deactivate = useDeactivateStudent();
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = deleteStudent.isPending || deactivate.isPending;

  async function handleDelete() {
    setError(null);
    try {
      await deleteStudent.mutateAsync(studentId);
      onDone?.("deleted");
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e) || "Xatolik yuz berdi");
    }
  }

  async function handleDeactivate() {
    setError(null);
    try {
      await deactivate.mutateAsync(studentId);
      onDone?.("deactivated");
      onClose();
    } catch (e) {
      setError(extractErrorMessage(e) || "Xatolik yuz berdi");
    }
  }

  const c = impact?.counts;
  const alreadyInactive = impact?.student.status === "nofaol";

  // Tizimdan butunlay yo'qoladigan narsalar (faqat o'chirish mumkin bo'lganda ko'rsatiladi).
  const willBeLost: string[] = [];
  if (c) {
    willBeLost.push("Profil va tizimga kirish ma'lumotlari (login/parol)");
    if (c.attendanceRecords > 0) willBeLost.push(`${c.attendanceRecords} ta davomat yozuvi`);
    if (c.homeworkCompletions > 0) willBeLost.push(`${c.homeworkCompletions} ta bajarilgan uy vazifasi`);
    if (c.xp > 0 || c.achievements > 0) willBeLost.push(`${c.xp} XP va ${c.achievements} ta yutuq`);
    if (c.groups.length > 0) willBeLost.push(`Guruh a'zoligi: ${c.groups.map((g) => g.name).join(", ")}`);
    if (c.futureEmptySlots > 0) willBeLost.push(`Jadvaldagi ${c.futureEmptySlots} ta kelgusi individual/diagnostika dars`);
    willBeLost.push("Xabarlar va bildirishnomalar");
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div style={{ background: "var(--surface)", borderRadius: 18, width: 480, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>O'quvchini o'chirish</div>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose} disabled={busy}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: "0 24px 18px" }}>
          <div style={{ fontWeight: 750, fontSize: 16 }}>{studentName}</div>
          {impact && <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{impact.student.phone}</div>}

          {isLoading && <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-faint)" }}>Ma'lumotlar tekshirilmoqda...</div>}
          {isError && (
            <div style={{ ...warnBox, background: "rgba(239,68,68,.12)", color: "#ef4444", marginTop: 14 }}>
              Ma'lumotni olib bo'lmadi. Xavfsizlik uchun o'chirish mumkin emas — sahifani yangilab qayta urinib ko'ring.
            </div>
          )}

          {impact && !impact.canDelete && c && (
            <>
              <div style={{ ...warnBox, background: "rgba(239,68,68,.12)", color: "#ef4444", marginTop: 14, flexDirection: "column" }}>
                <div style={{ fontWeight: 800 }}>Bu o'quvchini o'chirib bo'lmaydi</div>
                <div style={{ color: "var(--text)" }}>
                  O'chirilsa quyidagi hisob-kitob va tarix yo'qoladi, hisobotlar buziladi:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text)" }}>
                  {impact.blockers.map((b) => <li key={b.code}>{b.message}</li>)}
                </ul>
              </div>

              <div style={{ ...warnBox, background: "var(--surface-2)", marginTop: 10, flexDirection: "column" }}>
                <div style={{ fontWeight: 800 }}>Tavsiya: "Nofaol qilish"</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-dim)" }}>
                  <li>To'lovlar, qarzlar, paketlar va davomat tarixi <b>saqlanadi</b> — hisobotlar o'zgarmaydi.</li>
                  <li>O'quvchi tizimga <b>kira olmaydi</b> va joriy sessiyasi tugatiladi.</li>
                  <li>Istalgan payt "Faollashtirish" bilan qaytarish mumkin.</li>
                  {c.groups.length > 0 && (
                    <li>Guruh ro'yxatlarida qoladi ({c.groups.map((g) => g.name).join(", ")}). Davomatda chiqmasligi uchun avval guruhdan chiqarishingiz mumkin.</li>
                  )}
                  {c.activePackages > 0 && <li>Faol paketi bor ({c.remainingLessons} ta dars qolgan) — nofaol qilinsa ham paket kuchda qoladi.</li>}
                  {c.outstandingDebt > 0 && <li>To'lanmagan {fmtSom(c.outstandingDebt)} so'm qarz hisobda qoladi.</li>}
                </ul>
              </div>
            </>
          )}

          {impact && impact.canDelete && c && (
            <>
              <div style={{ ...warnBox, background: "rgba(245,158,11,.14)", marginTop: 14, flexDirection: "column" }}>
                <div style={{ fontWeight: 800, color: "#d97706" }}>Diqqat: bu amalni qaytarib bo'lmaydi</div>
                <div>Quyidagilar butunlay o'chiriladi:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {willBeLost.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
              <div style={{ ...warnBox, background: "var(--surface-2)", marginTop: 10, color: "var(--text-dim)" }}>
                <div>
                  <b style={{ color: "var(--text)" }}>Moliyaga ta'sir qilmaydi:</b> o'quvchida to'lov, qarz, paket va
                  ustoz maoshiga bog'liq dars tarixi yo'q — hisobotlar va ustoz maoshlari o'zgarmaydi.
                </div>
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Tushundim: bu o'quvchi va yuqoridagi ma'lumotlar qaytarib bo'lmaydigan tarzda o'chiriladi.</span>
              </label>
              {!alreadyInactive && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--text-faint)" }}>
                  Ishonchingiz komil bo'lmasa — o'chirish o'rniga <b>"Nofaol qilish"</b>ni tanlang, hech narsa yo'qolmaydi.
                </div>
              )}
            </>
          )}

          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, fontWeight: 600 }}>{error}</div>}
        </div>

        <div style={{ height: 1, background: "var(--border)" }} />
        <div style={{ display: "flex", gap: 10, padding: "16px 24px", flexWrap: "wrap" }}>
          <button className="btn" style={{ flex: "1 1 90px", justifyContent: "center", fontWeight: 700 }} onClick={onClose} disabled={busy}>
            Bekor
          </button>
          {impact && !alreadyInactive && (
            <button className="btn" style={{ flex: "1 1 140px", justifyContent: "center", fontWeight: 700 }} onClick={handleDeactivate} disabled={busy}>
              {deactivate.isPending ? "Saqlanmoqda..." : "Nofaol qilish"}
            </button>
          )}
          {impact?.canDelete && (
            <button
              style={{
                flex: "1 1 140px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "0 20px", height: 42, borderRadius: 10, background: "#ef4444", color: "#fff",
                fontWeight: 700, fontSize: 14, border: "none",
                cursor: understood && !busy ? "pointer" : "not-allowed", opacity: understood && !busy ? 1 : 0.5,
              }}
              disabled={!understood || busy}
              onClick={handleDelete}
            >
              <Icon name="trash" size={14} /> {deleteStudent.isPending ? "O'chirilmoqda..." : "Butunlay o'chirish"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
