import { useState } from "react";
import { Chess } from "chess.js";
import { useAttemptPuzzle, usePuzzleHint, usePuzzleStats, usePuzzles } from "../../lib/queries.js";
import { ChessBoard } from "../../components/ChessBoard.js";

/* ── Sections ────────────────────────────────────────────────────────────── */
interface Section { id: string; title: string; sub: string; icon: string; color: string; locked?: boolean; }
const SECTIONS: Section[] = [
  { id:"mot1",   title:"1 xodlik motlar",     sub:"1 ta masala",  icon:"♛", color:"#22c55e" },
  { id:"mot2",   title:"2 xodlik motlar",     sub:"1 ta masala",  icon:"♚", color:"#3b82f6" },
  { id:"mot3",   title:"3 xodlik motlar",     sub:"Tez orada",    icon:"♞", color:"#f59e0b", locked:true },
  { id:"series", title:"Zadachalar seriyasi", sub:"1 ta masala",  icon:"🎯", color:"#ec4899" },
  { id:"time",   title:"Time zadachalar",     sub:"Tez orada",    icon:"⏱️", color:"#f87171", locked:true },
];

/* ── Left panel ──────────────────────────────────────────────────────────── */
function StatsPanel({ correct, wrong, accuracy }: { correct:number; wrong:number; accuracy:number }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Umumiy statistika */}
      <div style={{ background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:16, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:"0.08em", marginBottom:12 }}>
          📊 Umumiy statistika
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.2)", borderRadius:12, padding:"10px 12px" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{correct}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:2 }}>✓ To'g'ri</div>
          </div>
          <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:12, padding:"10px 12px" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#ef4444" }}>{wrong}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:2 }}>✗ Noto'g'ri</div>
          </div>
          <div style={{ gridColumn:"1/-1", background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.15)", borderRadius:12, padding:"10px 12px" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#f87171" }}>{accuracy}%</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:2 }}>🎯 To'g'rilik</div>
          </div>
        </div>
      </div>

      {/* Jami yechilgan */}
      <div style={{ background:"linear-gradient(135deg,rgba(234,88,12,.25) 0%,rgba(251,146,60,.15) 100%)", border:"1.5px solid rgba(234,88,12,.3)", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:26 }}>🔥</div>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fb923c" }}>{correct + wrong}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:1 }}>Jami urinishlar</div>
        </div>
      </div>
    </div>
  );
}

/* ── Right panel ─────────────────────────────────────────────────────────── */
function SectionsPanel({ active, onSelect }: { active:string; onSelect:(id:string)=>void }) {
  return (
    <div style={{ background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:16, padding:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:"0.08em", marginBottom:12 }}>
        🎮 Bo'limlar
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {SECTIONS.map(s => {
          const isActive = s.id === active;
          return (
            <div key={s.id} onClick={()=>!s.locked && onSelect(s.id)}
              style={{ display:"flex", alignItems:"center", gap:12,
                background: isActive ? `${s.color}18` : "rgba(255,255,255,.04)",
                border: `1.5px solid ${isActive ? s.color+"55" : "rgba(255,255,255,.08)"}`,
                borderRadius:12, padding:"10px 12px",
                cursor: s.locked ? "default" : "pointer",
                opacity: s.locked ? 0.5 : 1,
                transition:"all .15s" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${s.color}22`,
                border:`1px solid ${s.color}44`, display:"grid", placeItems:"center",
                fontSize:20, flexShrink:0 }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color: isActive ? "#fff" : "rgba(255,255,255,.75)", marginBottom:1 }}>
                  {s.title}
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{s.sub}</div>
              </div>
              {s.locked && <div style={{ marginLeft:"auto", fontSize:14 }}>🔒</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Center puzzle ───────────────────────────────────────────────────────── */
function PuzzleCenter({ puzzles }: { puzzles: ReturnType<typeof usePuzzles>["data"] }) {
  const attempt = useAttemptPuzzle();
  const hint = usePuzzleHint();
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<string|null>(null);
  const [solved, setSolved] = useState(false);
  const [hintSquare, setHintSquare] = useState<string|undefined>(undefined);
  const [fen, setFen] = useState<string|null>(null);
  const [moveIndex, setMoveIndex] = useState(0);

  const puzzle = puzzles?.[idx];
  const activeFen = fen ?? puzzle?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const turnColor = activeFen.includes(" b ") ? "b" : "w";

  function goNext() {
    if (!puzzles || idx >= puzzles.length - 1) return;
    setIdx(i => i+1);
    setFen(null);
    setMoveIndex(0);
    setFeedback(null);
    setSolved(false);
    setHintSquare(undefined);
  }

  async function handleMove(from: string, to: string) {
    if (solved || !puzzle) return;
    setHintSquare(undefined);
    const res = await attempt.mutateAsync({ puzzleId:puzzle.id, moveIndex, move:`${from}${to}` });
    if (!res.correct) { setFeedback("Noto'g'ri yurish. Yana urinib ko'ring."); return; }
    setFen(res.fenAfter);
    if (res.finished) {
      setSolved(true);
      setFeedback(`✅ To'g'ri! +${res.xpAwarded} XP`);
    } else {
      setMoveIndex(moveIndex + 2);
      setFeedback("To'g'ri yurish! Davom eting.");
    }
  }

  async function handleHint() {
    if (!puzzle) return;
    const res = await hint.mutateAsync({ puzzleId:puzzle.id, moveIndex });
    setHintSquare(res.from);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {/* Turn indicator */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12,
        background:"rgba(255,255,255,.05)", border:"1.5px solid rgba(255,255,255,.09)",
        borderRadius:12, padding:"10px 16px" }}>
        <div style={{ width:18, height:18, borderRadius:4, flexShrink:0,
          background: turnColor==="w" ? "#fff" : "#1a1a2e",
          border: turnColor==="b" ? "2px solid rgba(255,255,255,.3)" : "none" }} />
        <div style={{ fontWeight:700, fontSize:14 }}>
          {turnColor==="w" ? "Oq" : "Qora"} yuradi — eng yaxshi yurishni toping
        </div>
      </div>

      {/* Board */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, overflow:"hidden", border:"1.5px solid rgba(255,255,255,.08)", padding:"16px 16px 28px" }}>
        {puzzle ? (
          <ChessBoard
            fen={activeFen}
            onMove={handleMove}
            disabled={solved}
            hintSquare={hintSquare}
            getMoves={(sq) => {
              try { return new Chess(activeFen).moves({ square: sq as import("chess.js").Square, verbose: true }).map((m: {to: string}) => m.to); }
              catch { return []; }
            }}
          />
        ) : (
          <div style={{ aspectRatio:"1", background:"rgba(255,255,255,.05)", borderRadius:12, display:"grid", placeItems:"center", color:"rgba(255,255,255,.3)", fontSize:14 }}>
            Masalalar yuklanmoqda...
          </div>
        )}

        {feedback && (
          <div style={{ marginTop:10, fontSize:13, fontWeight:600,
            color: feedback.startsWith("✅") ? "#4ade80" : feedback.startsWith("Noto") ? "#f87171" : "#60a5fa",
            textAlign:"center" }}>
            {feedback}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
        <button onClick={handleHint} disabled={hint.isPending || solved || !puzzle}
          style={{ padding:"13px", borderRadius:12, border:"1.5px solid rgba(255,255,255,.12)",
            background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.8)",
            fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", gap:7 }}>
          💡 Maslahat
        </button>
        <button onClick={goNext} disabled={!puzzle}
          style={{ padding:"13px", borderRadius:12, border:"none",
            background:"#22c55e", color:"#fff",
            fontWeight:700, fontSize:14, cursor:"pointer" }}>
          → Keyingisi
        </button>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PuzzlesPage() {
  const { data: puzzles } = usePuzzles();
  const { data: stats } = usePuzzleStats();
  const [activeSection, setActiveSection] = useState("mot1");

  const correct  = stats?.correct  ?? 0;
  const wrong    = stats?.incorrect ?? 0;
  const accuracy = stats?.accuracyPct ?? 0;

  return (
    <div>
      {/* 3-column layout */}
      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr 270px", gap:16, alignItems:"start" }}>
        {/* Left */}
        <StatsPanel correct={correct} wrong={wrong} accuracy={accuracy} />

        {/* Center */}
        <PuzzleCenter puzzles={puzzles} />

        {/* Right */}
        <SectionsPanel active={activeSection} onSelect={setActiveSection} />
      </div>
    </div>
  );
}
