import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";
import {
  useTeacherRankings, useTeacherReviews, useAddTeacherReview, useDeleteTeacherReview, useTeachers,
  useStudentReviewsForTeacher, useModerationQueue, useApproveLessonReview, useRejectLessonReview,
  type TeacherRanking,
} from "../../lib/queries.js";

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
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  async function handleSubmit() {
    if (!teacherId || rating === 0) return;
    await addReview.mutateAsync({ teacherId, rating, comment: comment || undefined });
    onClose();
  }

  const shown = hoverRating || rating;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 440, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Ichki baholash qo'shish</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 18 }}>
          Bu baho faqat adminlarga ko'rinadi va ustozning reytingiga (o'quvchi bahosiga) ta'sir qilmaydi — ichki hisobot uchun.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>USTOZ</label>
            <select className="inp" style={{ width: "100%" }} value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>BAHO (1-5)</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontSize: 18,
                    border: shown >= n ? "2px solid #f59e0b" : "1px solid var(--border)",
                    background: shown >= n ? "#fef3c7" : "var(--surface-2)",
                    transition: "all .12s",
                  }}>
                  {n <= shown ? "★" : "☆"}
                </button>
              ))}
            </div>
            {rating === 0 && (
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>Yulduzlarni bosib baho tanlang</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>IZOH (IXTIYORIY)</label>
            <textarea className="inp" style={{ width: "100%", minHeight: 80, resize: "vertical" }}
              placeholder="Izoh yozing..."
              value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!teacherId || rating === 0 || addReview.isPending} onClick={handleSubmit}>
            <Icon name="check" size={14} /> {addReview.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StudentReviewsCard({ rankings }: { rankings: TeacherRanking[] }) {
  const [teacherId, setTeacherId] = useState(rankings[0]?.id ?? "");
  const { data: reviews = [], isLoading } = useStudentReviewsForTeacher(teacherId || null);

  if (rankings.length === 0) return null;

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 18 }}>🎓</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>O'quvchi izohlari</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>Faqat admin ko'radi</div>
        </div>
        <select className="inp" style={{ minWidth: 160 }} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          {rankings.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
        </select>
      </div>

      <div style={{ padding: "12px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
            Bu ustoz uchun hali o'quvchi izohi yo'q.
          </div>
        ) : reviews.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Avatar name={r.studentName} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 750, fontSize: 14 }}>{r.studentName}</span>
                  <Stars rating={r.rating} size={14} />
                  {r.comment && r.moderationStatus !== "approved" && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: r.moderationStatus === "pending" ? "#fef3c7" : "#fee2e2",
                      color: r.moderationStatus === "pending" ? "#d97706" : "#dc2626",
                    }}>
                      {r.moderationStatus === "pending" ? "Kutilmoqda" : "Olib tashlangan"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                  {r.topic ?? "Dars"} · {r.conductedAt}
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
  );
}

function ModerationQueueCard() {
  const { data: queue = [], isLoading } = useModerationQueue();
  const approve = useApproveLessonReview();
  const reject = useRejectLessonReview();

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 18 }}>🚦</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>Moderatsiya navbati</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
            Yangi izohlar — o'qituvchiga ko'rsatishdan oldin tekshiring
          </div>
        </div>
        {queue.length > 0 && (
          <span style={{ padding: "4px 12px", borderRadius: 99, background: "#fef3c7", color: "#d97706", fontSize: 12, fontWeight: 700 }}>
            {queue.length} ta kutilmoqda
          </span>
        )}
      </div>

      <div style={{ padding: "12px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
            Ko'rib chiqiladigan izoh yo'q 🎉
          </div>
        ) : queue.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Avatar name={r.studentName} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 750, fontSize: 14 }}>{r.studentName}</span>
                  <Stars rating={r.rating} size={14} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                  → {r.teacherName} · {r.topic ?? "Dars"} · {r.conductedAt}
                </div>
              </div>
            </div>
            {r.comment && (
              <div style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 13.5, marginBottom: 10 }}>
                «{r.comment}»
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1, background: "#fee2e2", color: "#dc2626", border: "none" }}
                disabled={reject.isPending} onClick={() => reject.mutate(r.id)}>
                <Icon name="x" size={13} /> Olib tashlash
              </button>
              <button className="btn" style={{ flex: 1, background: "#d1fae5", color: "#059669", border: "none" }}
                disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                <Icon name="check" size={13} /> Tasdiqlash
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TeacherRatingPage() {
  const { data: rankings = [], isLoading } = useTeacherRankings();
  const { data: reviews = [] } = useTeacherReviews();
  const deleteReview = useDeleteTeacherReview();
  const [showAddModal, setShowAddModal] = useState(false);

  const totalReviews = rankings.reduce((s, t) => s + t.reviewCount, 0);
  const ratedTeachers = rankings.filter((t) => t.reviewCount > 0).length;
  const avgRating = totalReviews > 0
    ? rankings.reduce((s, t) => s + (t.avgRating ?? 0) * t.reviewCount, 0) / totalReviews
    : (rankings.length > 0 ? rankings.reduce((s, t) => s + (t.avgRating ?? 0), 0) / rankings.length : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Ustoz reytingi</h2>
        <button className="btn primary" onClick={() => setShowAddModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={14} /> Ichki baho qo'shish
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-3">
        <StatCard icon="star" tone="w"
          value={isLoading ? "—" : avgRating.toFixed(1)}
          label="O'rtacha baho (o'quvchilardan)"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>5 balldan</span>}
        />
        <StatCard icon="barChart" tone="i"
          value={isLoading ? "—" : String(totalReviews)}
          label="Jami o'quvchi baholari"
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
          <CardHead icon="award" title="Ustozlar reytingi" sub="O'quvchilarning dars-baholariga asoslangan" />
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
                  <Stars rating={t.avgRating ?? 0} />
                  <span style={{ fontWeight: 800, fontSize: 18, minWidth: 36 }}>{(t.avgRating ?? 0).toFixed(1)}</span>
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
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>Admin ichki baholari</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
                Faqat admin ko'radi va reytingga ta'sir qilmaydi — ichki hisobot uchun
              </div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 99, background: "#fce7f3", color: "#db2777", fontSize: 12, fontWeight: 700 }}>
              👁 Admin only
            </span>
          </div>

          <div style={{ padding: "12px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-faint)" }}>
                Hali ichki baho yo'q. "Ichki baho qo'shish" tugmasini bosing.
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
                  <button
                    onClick={() => deleteReview.mutate(r.id)}
                    disabled={deleteReview.isPending}
                    title="O'chirish"
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name="x" size={12} style={{ color: "#ef4444" }} />
                  </button>
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

        <ModerationQueueCard />

        <StudentReviewsCard rankings={rankings} />
      </div>

      {showAddModal && <AddReviewModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", color: "var(--text-faint)",
  marginBottom: 6, textTransform: "uppercase",
};
