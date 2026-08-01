import { Card, CardHead } from "@chess-school/ui";
import { useTeacherLessonHistory } from "../../lib/queries.js";

const ATT_COLOR: Record<string, string> = { presentCount: "#22c55e", lateCount: "#f59e0b", absentCount: "#ef4444", excusedCount: "#8b5cf6" };

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < Math.round(rating) ? "#f59e0b" : "var(--border)" }}>★</span>
      ))}
    </div>
  );
}

export default function TLessonHistoryPage() {
  const { data: history = [], isLoading } = useTeacherLessonHistory();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Darslar tarixi</h2>

      <Card style={{ padding: 0 }}>
        <CardHead icon="calendar" title="O'tkazilgan darslar" sub="Davomat va o'quvchilar bahosi (tasdiqlangan izohlar)" />
        <div style={{ padding: "6px 0" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              Hali o'tkazilgan dars yo'q
            </div>
          ) : history.map((l) => (
            <div key={l.lessonId} style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 750, fontSize: 14.5 }}>{l.topic ?? "Dars"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {l.conductedAt} · {l.groupName ?? "Individual"}
                  </div>
                </div>
                {l.avgRating != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Stars rating={l.avgRating} />
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{l.avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>({l.reviewCount} baho)</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 14, rowGap: 4, flexWrap: "wrap", fontSize: 12, color: "var(--text-faint)", marginBottom: l.reviews.length > 0 ? 10 : 0 }}>
                <span style={{ color: ATT_COLOR.presentCount }}>✓ {l.presentCount} keldi</span>
                <span style={{ color: ATT_COLOR.lateCount }}>! {l.lateCount} kechikdi</span>
                <span style={{ color: ATT_COLOR.absentCount }}>− {l.absentCount} kelmadi</span>
                {l.excusedCount > 0 && <span style={{ color: ATT_COLOR.excusedCount }}>• {l.excusedCount} sababli</span>}
              </div>

              {l.reviews.filter((r) => r.comment).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {l.reviews.filter((r) => r.comment).map((r, i) => (
                    <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12.5 }}>
                      <span style={{ fontWeight: 700 }}>{r.studentName}:</span> «{r.comment}»
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
