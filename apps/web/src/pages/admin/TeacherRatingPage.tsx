import { useState } from "react";
import { Avatar, Card, CardHead, Icon, StatCard } from "@chess-school/ui";

/* ─── Types ─── */
type Review = {
  id: string;
  studentName: string;
  group: string;
  groupColor: string;
  teacher: string;
  date: string;
  rating: number;
  comment: string;
};

/* ─── Mock data ─── */
const TEACHER_RANKINGS = [
  { name: "Alisher K.",  reviews: 4, rating: 4.5 },
  { name: "Dilnoza M.", reviews: 2, rating: 4.5 },
  { name: "Sardor T.",  reviews: 2, rating: 4.0 },
];

const MOCK_REVIEWS: Review[] = [
  { id:"1", studentName:"Asilbek Komilov",   group:"Boshlang'ich A", groupColor:"#3b82f6", teacher:"Alisher K.",  date:"10.06.2026", rating:5, comment:"Juda yaxshi tushuntirdilar, rahmat!" },
  { id:"2", studentName:"Asilbek Komilov",   group:"Boshlang'ich A", groupColor:"#3b82f6", teacher:"Alisher K.",  date:"2026-06-15", rating:4, comment:"«kljfkeljfkdlsjk.jdkljdskjf»" },
  { id:"3", studentName:"Gulnoza Tosheva",   group:"O'rta daraja",   groupColor:"#7c3aed", teacher:"Dilnoza M.", date:"09.06.2026", rating:5, comment:"Eng zo'r ustoz!" },
  { id:"4", studentName:"Kamola Yusupova",   group:"Boshlang'ich A", groupColor:"#0891b2", teacher:"Alisher K.",  date:"08.06.2026", rating:5, comment:"" },
  { id:"5", studentName:"Bobur Nazarov",     group:"Boshlang'ich A", groupColor:"#3b82f6", teacher:"Alisher K.",  date:"06.06.2026", rating:4, comment:"Yaxshi, lekin sekinroq tushuntirsa bo'lardi" },
  { id:"6", studentName:"Laylo Ismoilova",   group:"O'rta daraja",   groupColor:"#7c3aed", teacher:"Dilnoza M.", date:"05.06.2026", rating:4, comment:"" },
  { id:"7", studentName:"Shaxzoda Qodirova", group:"Yuqori daraja",  groupColor:"#059669", teacher:"Sardor T.",  date:"04.06.2026", rating:4, comment:"O'rtacha o'tdi" },
  { id:"8", studentName:"Jahongir Aliyev",   group:"Yuqori daraja",  groupColor:"#059669", teacher:"Sardor T.",  date:"02.06.2026", rating:5, comment:"Murakkab mavzularni oson qildilar" },
];

const PERIODS = ["Barcha oylar", "Iyun 2026", "May 2026", "Aprel 2026"];

const MEDALS = ["🥇", "🥈", "🥉"];

/* ─── Page ─── */
export default function TeacherRatingPage() {
  const [period, setPeriod] = useState("Barcha oylar");

  const totalReviews = MOCK_REVIEWS.length;
  const avgRating    = MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / totalReviews;
  const ratedTeachers = new Set(MOCK_REVIEWS.map((r) => r.teacher)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Ustoz reytingi
        </h2>
        <div style={{ position: "relative" }}>
          <select
            className="inp"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ appearance: "none", paddingRight: 32, minWidth: 140, fontWeight: 600 }}
          >
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <Icon name="chevronDown" size={13} style={{
            position: "absolute", right: 10, top: "50%",
            transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)",
          }} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid cols-3">
        <StatCard icon="star" tone="w"
          value={avgRating.toFixed(1)}
          label="O'rtacha baho"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>↗ 5 balldan</span>}
        />
        <StatCard icon="barChart" tone="i"
          value={String(totalReviews)}
          label="Jami baholar"
        />
        <StatCard icon="award" tone="s"
          value={String(ratedTeachers)}
          label="Baholangan ustozlar"
        />
      </div>

      {/* Rankings + Reviews row */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

        {/* Ustozlar reytingi */}
        <Card style={{ padding: 0 }}>
          <CardHead icon="award" title="Ustozlar reytingi" />
          <div style={{ padding: "0 0 8px" }}>
            {TEACHER_RANKINGS.map((t, i) => (
              <div key={t.name} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 22px",
                borderBottom: i < TEACHER_RANKINGS.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {/* Medal */}
                <div style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>
                  {MEDALS[i] ?? `#${i + 1}`}
                </div>
                {/* Name + reviews */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 750, fontSize: 15 }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{t.reviews} ta baho</div>
                </div>
                {/* Stars + score */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Stars rating={t.rating} />
                  <span style={{ fontWeight: 800, fontSize: 18, minWidth: 36 }}>{t.rating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* O'quvchilar izohlari */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>O'quvchilar izohlari</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
                Kim yozgani va qaysi guruhdan ekani ko'rsatilgan
              </div>
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 12px", borderRadius: 99,
              background: "#fce7f3", color: "#db2777",
              fontSize: 12, fontWeight: 700,
            }}>
              👁 Faqat admin ko'radi
            </span>
          </div>

          <div style={{ padding: "12px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            {MOCK_REVIEWS.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Review card ─── */
function ReviewCard({ review: r }: { review: Review }) {
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 12,
      padding: "14px 16px", background: "var(--surface-2)",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Avatar name={r.studentName} size="sm" style={{ borderRadius: 9, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 750, fontSize: 14 }}>{r.studentName}</span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 10px", borderRadius: 99,
              background: r.groupColor + "1a", color: r.groupColor,
              fontSize: 11.5, fontWeight: 700,
            }}>
              <Icon name="students" size={11} /> {r.group}
            </span>
            <Stars rating={r.rating} size={14} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
            → {r.teacher} · {r.date}
          </div>
        </div>
      </div>
      {/* Comment */}
      {r.comment && (
        <div style={{
          padding: "9px 14px", borderRadius: 8,
          border: "1px solid var(--border)", background: "var(--surface)",
          fontSize: 13.5, color: "var(--text-dim)", fontStyle: "normal",
        }}>
          «{r.comment}»
        </div>
      )}
    </div>
  );
}

/* ─── Stars ─── */
function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{
          fontSize: size, lineHeight: 1,
          color: i < Math.round(rating) ? "#f59e0b" : "#d1d5db",
        }}>★</span>
      ))}
    </div>
  );
}
