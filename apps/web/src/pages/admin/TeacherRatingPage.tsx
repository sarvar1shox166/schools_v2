import { useState } from "react";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import { useTeacherRankings, useTeacherReviews, useAddTeacherReview, useTeachers } from "../../lib/queries.js";

const MEDALS = ["🥇", "🥈", "🥉"];

function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1, color: i < Math.round(rating) ? "#f59e0b" : "#d1d5db" }}>★</span>
      ))}
    </div>
  );
}

function AddReviewModal({ onClose }: { onClose: () => void }) {
  const { data: teachers = [] } = useTeachers();
  const addReview = useAddTeacherReview();
  const [form, setForm] = useState({ teacherId: teachers[0]?.id ?? "", rating: 5, comment: "" });

  async function handleSubmit() {
    if (!form.teacherId) return;
    await addReview.mutateAsync({ teacherId: form.teacherId, rating: form.rating, comment: form.comment || undefined });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 440, maxWidth: "calc(100vw - 32px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Baho qo'shish</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>USTOZ</label>
            <select className="inp" style={{ width: "100%" }} value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>BAHO (1-5)</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, rating: n })}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontSize: 18,
                    border: form.rating === n ? "2px solid #f59e0b" : "1px solid var(--border)",
                    background: form.rating === n ? "#fef3c7" : "var(--surface-2)",
                  }}>
                  {n <= form.rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>IZOH (IXTIYORIY)</label>
            <textarea className="inp" style={{ width: "100%", minHeight: 80, resize: "vertical" }}
              placeholder="Izoh yozing..."
              value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!form.teacherId || addReview.isPending} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {addReview.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherRatingPage() {
  const { data: rankings = [], isLoading } = useTeacherRankings();
  const { data: reviews = [] } = useTeacherReviews();
  const [showAddModal, setShowAddModal] = useState(false);

  const totalReviews = rankings.reduce((s, t) => s + t.reviewCount, 0);
  const ratedTeachers = rankings.filter((t) => t.reviewCount > 0).length;
  const avgRating = totalReviews > 0
    ? rankings.reduce((s, t) => s + t.avgRating * t.reviewCount, 0) / totalReviews
    : (rankings.length > 0 ? rankings.reduce((s, t) => s + t.avgRating, 0) / rankings.length : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Ustoz reytingi</h2>
        <button className="btn primary" onClick={() => setShowAddModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={14} /> Baho qo'shish
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-3">
        <StatCard icon="star" tone="w"
          value={isLoading ? "—" : avgRating.toFixed(1)}
          label="O'rtacha baho"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>5 balldan</span>}
        />
        <StatCard icon="barChart" tone="i"
          value={isLoading ? "—" : String(totalReviews)}
          label="Jami baholar"
        />
        <StatCard icon="award" tone="s"
          value={isLoading ? "—" : String(ratedTeachers)}
          label="Baholangan ustozlar"
        />
      </div>

      {/* Rankings + Reviews */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

        {/* Rankings */}
        <Card style={{ padding: 0 }}>
          <CardHead icon="award" title="Ustozlar reytingi" />
          <div style={{ padding: "0 0 8px" }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
            ) : rankings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-faint)" }}>Ustoz topilmadi</div>
            ) : rankings.map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 22px",
                borderBottom: i < rankings.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>
                  {MEDALS[i] ?? `#${i + 1}`}
                </div>
                <Avatar name={t.fullName} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 750, fontSize: 15 }}>{t.fullName}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
                    {t.studentsCount} o'quvchi · {t.groupsCount} guruh
                    {t.reviewCount > 0 && ` · ${t.reviewCount} ta baho`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Stars rating={t.avgRating} />
                  <span style={{ fontWeight: 800, fontSize: 18, minWidth: 36 }}>{t.avgRating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Reviews */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>Baholar tarixi</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>Faqat admin ko'radi</div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 99, background: "#fce7f3", color: "#db2777", fontSize: 12, fontWeight: 700 }}>
              👁 Admin only
            </span>
          </div>

          <div style={{ padding: "12px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
                Hali baho yo'q. "Baho qo'shish" tugmasini bosing.
              </div>
            ) : reviews.map((r) => (
              <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Avatar name={r.reviewerName} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 750, fontSize: 14 }}>{r.reviewerName}</span>
                      <Stars rating={r.rating} size={14} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                      → {r.teacherName} · {r.period}
                    </div>
                  </div>
                </div>
                {r.comment && (
                  <div style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 13.5, color: "var(--text-faint)" }}>
                    «{r.comment}»
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showAddModal && <AddReviewModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", color: "var(--text-faint)",
  marginBottom: 6, textTransform: "uppercase",
};
