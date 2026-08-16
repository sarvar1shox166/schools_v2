import { useNavigate } from "react-router-dom";
import { usePuzzleStats, usePuzzleSectionCounts, type PuzzleSection } from "../../lib/queries.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

interface SectionMeta { id: PuzzleSection; title: string; desc: string; color: string; locked?: boolean; }
export const SECTIONS: SectionMeta[] = [
  { id:"mot1", title:"1 xodlik motlar",   desc:"Bitta yurishda mot qiling",     color:"#22c55e" },
  { id:"mot2", title:"2 xodlik motlar",   desc:"Ikkita yurishda mot qiling",    color:"#3b82f6" },
  { id:"mot3", title:"3 xodlik motlar",   desc:"Uchta yurishda mot qiling",     color:"#f59e0b" },
  { id:"mot4", title:"4 xodlik motlar",   desc:"To'rtta yurishda mot qiling",   color:"#ec4899" },
  { id:"mot5", title:"5 xodlik motlar",   desc:"Beshta yurishda mot qiling",    color:"#f87171" },
];

function DifficultyIcon({ level, color }: { level: number; color: string }) {
  const bars = [{ h: 8 }, { h: 12 }, { h: 16 }, { h: 20 }];
  return (
    <svg width="24" height="24" viewBox="0 0 26 24" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={2 + i * 6} y={22 - b.h} width={4} height={b.h} rx={1.5} fill={i < level ? color : "#33333a"} />
      ))}
    </svg>
  );
}
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

/* ── Page — boshqotirma kategoriyalari (kartalar) ─────────────────────────── */
export default function PuzzlesPage() {
  const navigate = useNavigate();
  const { data: stats } = usePuzzleStats();
  const { data: counts = {} } = usePuzzleSectionCounts();

  const correct  = stats?.correct  ?? 0;
  const wrong    = stats?.incorrect ?? 0;
  const accuracy = stats?.accuracyPct ?? 0;

  return (
    <div>
      {(correct + wrong) > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 18, marginBottom: 20,
          background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "16px 20px",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckIcon />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{correct}</span>
            <span style={{ fontSize: 11.5, color: "#8b8d98" }}>to'g'ri</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CrossIcon />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>{wrong}</span>
            <span style={{ fontSize: 11.5, color: "#8b8d98" }}>xato</span>
          </div>
          <div style={{ flex: 1, minWidth: 120, height: 6, background: "#232328", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${accuracy}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
          </div>
          <span style={{ fontSize: 12.5, color: "#4ade80", fontWeight: 800 }}>{accuracy}% aniqlik</span>
        </div>
      )}

      <div style={{
        display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}>
        {SECTIONS.map((s, i) => {
          const cnt = counts[s.id] ?? 0;
          return (
            <div key={s.id}
              onClick={() => !s.locked && navigate(`/student/puzzles/${s.id}`)}
              style={{
                background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 18,
                padding: "22px 20px", cursor: s.locked ? "default" : "pointer",
                opacity: s.locked ? 0.5 : 1, transition: "transform .12s, border-color .12s",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DifficultyIcon level={i + 1} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: "#8b8d98" }}>{s.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>
                  {s.locked ? "🔒 Yopiq" : `${cnt} ta masala`}
                </span>
                {!s.locked && (
                  <span style={{ fontSize: 13, color: "#65666f" }}>→</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
