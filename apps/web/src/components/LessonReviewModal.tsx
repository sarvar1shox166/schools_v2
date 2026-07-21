import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@chess-school/ui";
import { useSubmitLessonReview, type PendingLessonReview } from "../lib/queries.js";

const RATING_LABELS: Record<number, string> = {
  1: "Yomon", 2: "O'rtacha", 3: "Yaxshi", 4: "Juda yaxshi", 5: "Ajoyib",
};

export function LessonReviewModal({ review, onClose }: { review: PendingLessonReview; onClose: () => void }) {
  const submitReview = useSubmitLessonReview();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  async function handleSubmit() {
    if (rating === 0) return;
    await submitReview.mutateAsync({ lessonId: review.lessonId, rating, comment: comment || undefined });
    onClose();
  }

  const shownRating = hoverRating || rating;
  const initials = review.teacherName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{
        background: "var(--ksurface, var(--surface))", borderRadius: 20, width: 420, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{
          padding: "26px 24px 20px", textAlign: "center",
          background: "linear-gradient(180deg, rgba(59,130,246,.12), transparent)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
            background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex",
            alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 19,
          }}>
            {initials}
          </div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Ustozni baholang</div>
          <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginTop: 4 }}>
            {review.teacherName} · {review.topic ?? "Dars"}
          </div>
        </div>

        <div style={{ padding: "4px 24px 24px" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  fontSize: 34, background: "none", border: "none", cursor: "pointer", padding: 2,
                  color: n <= shownRating ? "#f59e0b" : "var(--border)",
                  transform: n <= shownRating ? "scale(1.08)" : "scale(1)",
                  transition: "transform 0.12s, color 0.12s",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: shownRating ? "#f59e0b" : "var(--text-faint)", minHeight: 18, marginBottom: 16 }}>
            {shownRating ? RATING_LABELS[shownRating] : "Yulduzlarni bosib baholang"}
          </div>
          <textarea className="inp" style={{ width: "100%", minHeight: 70, resize: "vertical", marginBottom: 18 }}
            placeholder="Izoh (ixtiyoriy)..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onClose}>Keyinroq</button>
            <button className="btn primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitReview.isPending || rating === 0}>
              <Icon name="check" size={14} /> {submitReview.isPending ? "Saqlanmoqda..." : "Bahoni saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
