import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@chess-school/ui";
import { useSubmitLessonReview, type PendingLessonReview } from "../lib/queries.js";

export function LessonReviewModal({ review, onClose }: { review: PendingLessonReview; onClose: () => void }) {
  const submitReview = useSubmitLessonReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function handleSubmit() {
    await submitReview.mutateAsync({ lessonId: review.lessonId, rating, comment: comment || undefined });
    onClose();
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--ksurface, var(--surface))", borderRadius: 18, width: 400, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px 22px" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Ustozni baholang</div>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
          {review.teacherName} · {review.topic ?? "Dars"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}
              style={{ fontSize: 30, background: "none", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.3 }}>
              ★
            </button>
          ))}
        </div>
        <textarea className="inp" style={{ width: "100%", minHeight: 70, resize: "vertical", marginBottom: 16 }}
          placeholder="Izoh (ixtiyoriy)..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitReview.isPending}>
            <Icon name="check" size={14} /> {submitReview.isPending ? "Saqlanmoqda..." : "Bahoni saqlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
