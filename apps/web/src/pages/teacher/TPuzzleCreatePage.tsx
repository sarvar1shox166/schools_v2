import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "@chess-school/chess-engine";
import { ChessBoard } from "../../components/ChessBoard.js";
import { Card, Icon } from "@chess-school/ui";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const TYPE_OPTIONS = [
  { v: "1mot",   label: "1 mot" },
  { v: "2mot",   label: "2 mot" },
  { v: "3mot",   label: "3 mot" },
  { v: "seriya", label: "Zadachalar seriyasi" },
  { v: "time",   label: "Time zadacha" },
];

export default function TPuzzleCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle]   = useState("");
  const [type, setType]     = useState("1mot");
  const [mode, setMode]     = useState<"setup" | "solution">("setup");
  const [flipped, setFlipped] = useState(false);

  const [fenHistory, setFenHistory]       = useState<string[]>([INITIAL_FEN]);
  const [startFen, setStartFen]           = useState(INITIAL_FEN);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);

  const currentFen = fenHistory[fenHistory.length - 1];

  function getLegalMoves(square: string): string[] {
    const g = new Chess(currentFen);
    const moves = g.moves({ square: square as import("chess.js").Square, verbose: true }) as { to: string }[];
    return moves.map(m => m.to);
  }

  function handleMove(from: string, to: string) {
    const g = new Chess(currentFen);
    try {
      g.move({ from, to });
      setFenHistory(prev => [...prev, g.fen()]);
      if (mode === "solution") {
        setSolutionMoves(prev => [...prev, `${from}${to}`]);
      }
    } catch {}
  }

  function undoMove() {
    if (fenHistory.length <= 1) return;
    setFenHistory(prev => prev.slice(0, -1));
    if (mode === "solution" && solutionMoves.length > 0) {
      setSolutionMoves(prev => prev.slice(0, -1));
    }
  }

  function switchToSolution() {
    setStartFen(currentFen);
    setSolutionMoves([]);
    setMode("solution");
  }

  function switchToSetup() {
    setMode("setup");
  }

  function resetBoard() {
    setFenHistory([INITIAL_FEN]);
    setStartFen(INITIAL_FEN);
    setSolutionMoves([]);
    setMode("setup");
  }

  function clearSolution() {
    setFenHistory([startFen]);
    setSolutionMoves([]);
  }

  function formatMoves(): string[] {
    const g = new Chess(startFen);
    return solutionMoves.map((m, i) => {
      try {
        const result = g.move({ from: m.slice(0, 2), to: m.slice(2, 4) });
        const num  = Math.floor(i / 2) + 1;
        const dots = i % 2 === 0 ? "." : "...";
        return `${num}${dots} ${result?.san ?? m}`;
      } catch {
        return m;
      }
    });
  }

  const formattedMoves = formatMoves();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <button
          className="iconbtn"
          onClick={() => navigate("/teacher/puzzles")}
          style={{ borderRadius:10, border:"1px solid var(--border)" }}
          title="Orqaga"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:0 }}>Yangi boshqotirma</h2>
          <div style={{ fontSize:13, color:"var(--text-faint)", marginTop:2 }}>
            Shaxmat doskasida pozitsiya sozlang va yechimni yozing
          </div>
        </div>
      </div>

      {/* Main 2-column */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"var(--gap)", alignItems:"start" }}>

        {/* LEFT — chess board */}
        <Card style={{ padding:22 }}>

          {/* Mode toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <button
              onClick={switchToSetup}
              style={{
                padding:"7px 18px", borderRadius:99, fontSize:13, fontWeight:700,
                border:"none", cursor:"pointer",
                background: mode === "setup" ? "var(--accent)" : "var(--surface-2)",
                color: mode === "setup" ? "#fff" : "var(--text-dim)",
              }}
            >
              ⚙ Pozitsiya sozlash
            </button>
            <button
              onClick={switchToSolution}
              style={{
                padding:"7px 18px", borderRadius:99, fontSize:13, fontWeight:700,
                border:"none", cursor:"pointer",
                background: mode === "solution" ? "#059669" : "var(--surface-2)",
                color: mode === "solution" ? "#fff" : "var(--text-dim)",
              }}
            >
              ▶ Yechim yozish
            </button>
            <div style={{ flex:1 }}/>
            <button
              className="iconbtn"
              onClick={() => setFlipped(f => !f)}
              title="Taxtani aylantirish"
              style={{ border:"1px solid var(--border)", borderRadius:8, fontSize:16 }}
            >
              ⇅
            </button>
          </div>

          {/* Info banner */}
          {mode === "setup" ? (
            <div style={{
              padding:"9px 14px", borderRadius:8, marginBottom:14,
              background:"#fef3c7", color:"#92400e", fontSize:13, fontWeight:500,
            }}>
              Donalarni ko'chiring — boshlang'ich pozitsiyani sozlang. Tayyor bo'lgach <b>"Yechim yozish"</b>ga o'ting.
            </div>
          ) : (
            <div style={{
              padding:"9px 14px", borderRadius:8, marginBottom:14,
              background:"#d1fae5", color:"#065f46", fontSize:13, fontWeight:500,
            }}>
              Hozir <b>yechim rejimi</b>. To'g'ri harakatlarni o'ynang — ular saqlanib boradi.
            </div>
          )}

          {/* Board */}
          <div style={{ maxWidth:500, margin:"0 auto" }}>
            <ChessBoard
              fen={currentFen}
              onMove={handleMove}
              flipped={flipped}
              getMoves={getLegalMoves}
            />
          </div>

          {/* Board controls */}
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"center" }}>
            <button className="btn" onClick={undoMove} style={{ gap:6 }}>
              ← Orqaga
            </button>
            <button className="btn" onClick={resetBoard} style={{ gap:6 }}>
              ↺ Boshlang'ich
            </button>
          </div>
        </Card>

        {/* RIGHT — form */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Main form */}
          <Card style={{ padding:20 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:18 }}>Ma'lumotlar</div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Sarlavha</div>
              <input
                className="inp"
                placeholder="Masalan: Ikki harakat bilan mat"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width:"100%" }}
              />
            </div>

            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Tur</div>
              <select
                className="inp"
                value={type}
                onChange={e => setType(e.target.value)}
                style={{ width:"100%" }}
              >
                {TYPE_OPTIONS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>

            {/* FEN display */}
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>
                {mode === "solution" ? "Boshlang'ich pozitsiya (FEN)" : "Joriy pozitsiya (FEN)"}
              </div>
              <div style={{
                padding:"8px 12px", borderRadius:8,
                border:"1px solid var(--border)", background:"var(--surface-2)",
                fontSize:11, fontFamily:"monospace", wordBreak:"break-all",
                color:"var(--text-dim)", lineHeight:1.5,
              }}>
                {mode === "solution" ? startFen : currentFen}
              </div>
            </div>
          </Card>

          {/* Solution moves */}
          <Card style={{ padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>Yechim harakatlari</div>
              {solutionMoves.length > 0 && (
                <button
                  className="iconbtn"
                  onClick={clearSolution}
                  title="Tozalash"
                  style={{ color:"var(--danger)", border:"1px solid var(--border)", borderRadius:8 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>

            {solutionMoves.length === 0 ? (
              <div style={{
                padding:"24px 0", textAlign:"center",
                color:"var(--text-faint)", fontSize:13,
              }}>
                {mode === "setup"
                  ? '"Yechim yozish"ga o\'tib harakatlarni o\'ynang'
                  : "Taxtada to'g'ri harakatlarni o'ynang..."}
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {formattedMoves.map((m, i) => (
                  <span key={i} style={{
                    padding:"4px 10px", borderRadius:6, fontFamily:"monospace",
                    fontSize:13, fontWeight:700,
                    background: i % 2 === 0 ? "#dbeafe" : "var(--surface-2)",
                    color: i % 2 === 0 ? "#1d4ed8" : "var(--text)",
                  }}>
                    {m}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button
              className="btn"
              style={{ flex:1, justifyContent:"center" }}
              onClick={() => navigate("/teacher/puzzles")}
            >
              Bekor qilish
            </button>
            <button
              className="btn primary"
              style={{ flex:2, justifyContent:"center" }}
              disabled={!title.trim() || solutionMoves.length === 0}
              onClick={() => navigate("/teacher/puzzles")}
            >
              <Icon name="check" size={14}/> Saqlash
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
