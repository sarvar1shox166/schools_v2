import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "@chess-school/chess-engine";
import { useCreatePuzzle } from "../../lib/queries.js";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type PC   = "K"|"Q"|"R"|"B"|"N"|"P"|"k"|"q"|"r"|"b"|"n"|"p";
type Tool = "cursor"|"eraser"|PC;

const PIECE_FILE: Record<string,string> = {
  K:"oq-shox.svg",   Q:"oq-farzin.svg", R:"oq-rux.svg",
  N:"oq-ot.svg",     B:"oq-fil.svg",    P:"oq-piyoda.svg",
  k:"shoh.svg",      q:"farzin.svg",    r:"rux.svg",
  n:"ot.svg",        b:"fil.svg",       p:"pechka.svg",
};

// Sprite crop offsets (same as ChessBoard component)
const IMG_STYLE: React.CSSProperties = {
  position:"absolute", width:"535.3%", left:"-217.5%", top:"-100.4%",
  pointerEvents:"none", userSelect:"none",
};
const SHOH_STYLE: React.CSSProperties = {
  position:"absolute", width:"1147.4%", left:"-523.5%", top:"-272.1%",
  pointerEvents:"none", userSelect:"none",
};

function PieceImg({ piece, size = "90%" }: { piece: string; size?: string }) {
  const file = PIECE_FILE[piece];
  if (!file) return null;
  return (
    <div style={{
      position:"absolute",
      inset: size === "90%" ? "5%" : "0%",
      overflow:"hidden",
    }}>
      <img src={`/pieces/${file}`} alt=""
        style={piece === "k" ? SHOH_STYLE : IMG_STYLE}
        draggable={false} />
    </div>
  );
}

const WH: PC[] = ["K","Q","R","B","N","P"];
const BL: PC[] = ["k","q","r","b","n","p"];

const DIFF = [
  { v:"oson"  as const, label:"Oson",  xp:50  },
  { v:"orta"  as const, label:"O'rta", xp:75  },
  { v:"qiyin" as const, label:"Qiyin", xp:100 },
];

/* ── FEN helpers ─────────────────────────────────────────────── */
function parseFen(fen: string): Record<string,string> {
  const p: Record<string,string> = {};
  const [board] = fen.split(" ");
  board.split("/").forEach((row, ri) => {
    const rank = 8 - ri; let fi = 0;
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") fi += +ch;
      else { p[String.fromCharCode(97 + fi) + rank] = ch; fi++; }
    }
  });
  return p;
}

function buildFen(
  pieces: Record<string,string>,
  turn: "w"|"b",
  cas: {wK:boolean;wQ:boolean;bK:boolean;bQ:boolean},
  ep: string
): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = "", empty = 0;
    for (let fi = 0; fi < 8; fi++) {
      const pc = pieces[String.fromCharCode(97 + fi) + rank];
      if (pc) { if (empty) { row += empty; empty = 0; } row += pc; } else empty++;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const c = (cas.wK?"K":"")+(cas.wQ?"Q":"")+(cas.bK?"k":"")+(cas.bQ?"q":"") || "-";
  return `${rows.join("/")} ${turn} ${c} ${ep} 0 1`;
}

/* ── Piece palette toolbar ───────────────────────────────────── */
function PieceBar({ pcs, active, onSelect }: {
  pcs: PC[], active: Tool, onSelect:(t:Tool)=>void
}) {
  const btn = (t: Tool, children: React.ReactNode) => (
    <button key={t} onClick={() => onSelect(t)}
      title={t === "cursor" ? "Ko'chirish" : t === "eraser" ? "O'chirish" : t}
      style={{
        width:58, height:58, border:"none", borderRadius:5, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        background: active===t ? "#568a5d" : "transparent",
        color: t==="eraser" ? "#ff8080" : "#eee",
        transition:"background .1s",
      }}>
      {children}
    </button>
  );
  return (
    <div style={{
      display:"flex", background:"#302e2c",
      border:"1px solid #484440", borderRadius:6,
      padding:"3px 5px", gap:1, maxWidth:580,
    }}>
      {btn("cursor", <span style={{ fontSize:22 }}>✋</span>)}
      {pcs.map(p => btn(p,
        <div style={{ position:"relative", width:46, height:46, flexShrink:0 }}>
          <PieceImg piece={p} size="0%" />
        </div>
      ))}
      {btn("eraser", <span style={{ fontSize:20 }}>🗑</span>)}
    </div>
  );
}

/* ── Board grid ──────────────────────────────────────────────── */
function BoardGrid({
  displayPieces, flipped, cursorFrom, solFrom, solLegal, onClick,
}: {
  displayPieces: Record<string,string>;
  flipped: boolean;
  cursorFrom: string|null;
  solFrom: string|null;
  solLegal: string[];
  onClick: (sq:string) => void;
}) {
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];

  return (
    <div style={{ display:"flex" }}>
      {/* Rank labels */}
      <div style={{ display:"flex", flexDirection:"column", width:18, flexShrink:0 }}>
        {ranks.map(r => (
          <div key={r} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:"#888", minHeight:0 }}>
            {r}
          </div>
        ))}
      </div>

      <div style={{ flex:1 }}>
        {/* Squares */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(8,1fr)",
          gridTemplateRows:"repeat(8,1fr)",
          border:"2px solid #555", aspectRatio:"1",
        }}>
          {ranks.map((rank, ri) => files.map((file, fi) => {
            const sq = file + rank;
            const piece = displayPieces[sq];
            const isLight = (file.charCodeAt(0) - 97 + rank) % 2 === 1;
            const isFrom  = cursorFrom === sq || solFrom === sq;
            const isTarget = solLegal.includes(sq);

            let bg = isLight ? "#f0d9b5" : "#b58863";
            if (isFrom) bg = "#f6f669";
            else if (isTarget) bg = isLight ? "#cdd26a" : "#aaa23a";

            return (
              <div key={sq} onClick={() => onClick(sq)}
                style={{
                  background: bg, display:"flex", alignItems:"center",
                  justifyContent:"center", cursor:"pointer",
                  position:"relative", userSelect:"none",
                }}>
                {/* coordinates */}
                {fi === 0 && (
                  <span style={{ position:"absolute", top:2, left:3, fontSize:10,
                    fontWeight:700, color:isLight?"#b58863":"#f0d9b5", lineHeight:1, pointerEvents:"none" }}>
                    {rank}
                  </span>
                )}
                {ri === 7 && (
                  <span style={{ position:"absolute", bottom:2, right:3, fontSize:10,
                    fontWeight:700, color:isLight?"#b58863":"#f0d9b5", lineHeight:1, pointerEvents:"none" }}>
                    {file}
                  </span>
                )}

                {/* piece */}
                {piece && <PieceImg piece={piece} />}

                {/* legal move dots */}
                {isTarget && !piece && (
                  <div style={{ width:"28%", height:"28%", borderRadius:"50%",
                    background:"rgba(0,0,0,.2)", position:"absolute" }} />
                )}
                {isTarget && piece && (
                  <div style={{ position:"absolute", inset:0,
                    boxShadow:"inset 0 0 0 4px rgba(0,0,0,.3)", borderRadius:0 }} />
                )}
              </div>
            );
          }))}
        </div>

        {/* File labels */}
        <div style={{ display:"flex", height:18 }}>
          {files.map(f => (
            <div key={f} style={{ flex:1, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:11, fontWeight:700, color:"#888" }}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Right panel section wrapper ─────────────────────────────── */
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"#302e2c", border:"1px solid #484440", borderRadius:8, overflow:"hidden" }}>
      {title && (
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #484440",
          fontSize:12, fontWeight:700, color:"#aaa", letterSpacing:"0.05em" }}>
          {title}
        </div>
      )}
      <div style={{ padding:14 }}>{children}</div>
    </div>
  );
}

const SEL_STYLE: React.CSSProperties = {
  width:"100%", padding:"8px 10px", borderRadius:6,
  border:"1px solid #555", background:"#262421",
  color:"#ddd", fontSize:13, cursor:"pointer", outline:"none",
};

const ROW_STYLE: React.CSSProperties = {
  display:"flex", justifyContent:"space-between", alignItems:"center",
  padding:"5px 0",
};

const ACT_BTN: React.CSSProperties = {
  width:"100%", display:"flex", alignItems:"center", gap:10,
  padding:"9px 12px", border:"none", background:"transparent",
  cursor:"pointer", color:"#ccc", fontSize:13, textAlign:"left",
  borderRadius:6, transition:"background .1s",
};

/* ── Page ────────────────────────────────────────────────────── */
export default function TPuzzleCreatePage() {
  const navigate = useNavigate();
  const createPuzzle = useCreatePuzzle();

  /* editor state */
  const [pieces,     setPieces]     = useState<Record<string,string>>(parseFen(INITIAL_FEN));
  const [turn,       setTurn]       = useState<"w"|"b">("w");
  const [cas,        setCas]        = useState({ wK:true, wQ:true, bK:true, bQ:true });
  const [ep,         setEp]         = useState("-");
  const [flipped,    setFlipped]    = useState(false);
  const [tool,       setTool]       = useState<Tool>("cursor");
  const [cursorFrom, setCursorFrom] = useState<string|null>(null);

  /* solution state */
  const [mode,          setMode]          = useState<"setup"|"solution">("setup");
  const [startFen,      setStartFen]      = useState(INITIAL_FEN);
  const [solFen,        setSolFen]        = useState(INITIAL_FEN);
  const [solFrom,       setSolFrom]       = useState<string|null>(null);
  const [solLegal,      setSolLegal]      = useState<string[]>([]);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);

  /* form */
  const [title,      setTitle]      = useState("");
  const [difficulty, setDifficulty] = useState<"oson"|"orta"|"qiyin">("oson");

  const currentFen = buildFen(pieces, turn, cas, ep);
  const displayPieces = mode === "solution" ? parseFen(solFen) : pieces;

  /* ── Apply FEN from input ──────────────────────────────────── */
  function applyFen(fen: string) {
    try {
      const parsed = parseFen(fen);
      const parts = fen.split(" ");
      const t = parts[1] === "b" ? "b" : "w";
      const castleStr = parts[2] ?? "-";
      const epStr = parts[3] ?? "-";
      setPieces(parsed);
      setTurn(t as "w"|"b");
      setCas({ wK:castleStr.includes("K"), wQ:castleStr.includes("Q"),
               bK:castleStr.includes("k"), bQ:castleStr.includes("q") });
      setEp(epStr);
    } catch {}
  }

  /* ── Setup board click ─────────────────────────────────────── */
  function handleSetupClick(sq: string) {
    if (tool === "cursor") {
      if (cursorFrom === null) {
        if (pieces[sq]) setCursorFrom(sq);
      } else if (cursorFrom === sq) {
        setCursorFrom(null);
      } else {
        const np = { ...pieces };
        const movingPiece = np[cursorFrom];
        delete np[cursorFrom];
        if (movingPiece) np[sq] = movingPiece; else delete np[sq];
        setPieces(np);
        setCursorFrom(null);
      }
    } else if (tool === "eraser") {
      const np = { ...pieces };
      delete np[sq];
      setPieces(np);
    } else {
      const np = { ...pieces };
      if (np[sq] === tool) delete np[sq]; else np[sq] = tool;
      setPieces(np);
    }
  }

  /* ── Solution board click ──────────────────────────────────── */
  function handleSolClick(sq: string) {
    if (solFrom === null) {
      try {
        const chess = new Chess(solFen);
        const moves = chess.moves({ square: sq as import("chess.js").Square, verbose: true }) as { to:string }[];
        if (moves.length > 0) { setSolFrom(sq); setSolLegal(moves.map(m => m.to)); }
      } catch {}
    } else {
      if (sq !== solFrom && solLegal.includes(sq)) {
        const chess = new Chess(solFen);
        chess.move({ from: solFrom, to: sq });
        setSolutionMoves(prev => [...prev, `${solFrom}${sq}`]);
        setSolFen(chess.fen());
      }
      setSolFrom(null); setSolLegal([]);
    }
  }

  /* ── Mode switching ────────────────────────────────────────── */
  function enterSolution() {
    const fen = buildFen(pieces, turn, cas, ep);
    setStartFen(fen); setSolFen(fen);
    setSolutionMoves([]); setSolFrom(null); setSolLegal([]);
    setMode("solution");
  }

  function backToSetup() {
    setMode("setup"); setSolutionMoves([]);
    setSolFrom(null); setSolLegal([]);
  }

  /* ── Solution helpers ──────────────────────────────────────── */
  function undoSolMove() {
    if (solutionMoves.length === 0) return;
    const newMoves = solutionMoves.slice(0, -1);
    let fen = startFen;
    for (const mv of newMoves) {
      const chess = new Chess(fen);
      chess.move({ from: mv.slice(0,2), to: mv.slice(2,4) });
      fen = chess.fen();
    }
    setSolFen(fen); setSolutionMoves(newMoves); setSolFrom(null); setSolLegal([]);
  }

  function formatMoves() {
    const chess = new Chess(startFen);
    return solutionMoves.map((mv, i) => {
      try {
        const r = chess.move({ from: mv.slice(0,2), to: mv.slice(2,4) });
        return `${Math.floor(i/2)+1}${i%2===0?".":"..."} ${r?.san??mv}`;
      } catch { return mv; }
    });
  }

  /* ── Save ──────────────────────────────────────────────────── */
  async function handleSave() {
    if (!title.trim() || solutionMoves.length === 0) return;
    try {
      await createPuzzle.mutateAsync({
        fen: startFen, solution: solutionMoves, difficulty,
        xpReward: DIFF.find(d => d.v === difficulty)?.xp ?? 50,
        title: title.trim(),
      });
      navigate("/teacher/puzzles");
    } catch {}
  }

  const canSave = title.trim().length > 0 && solutionMoves.length > 0 && !createPuzzle.isPending;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:0,
      background:"#1a1a1a", minHeight:"calc(100vh - 60px)",
      color:"#ddd", padding:0,
    }}>
      {/* Top bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"12px 18px", borderBottom:"1px solid #333",
        background:"#262421",
      }}>
        <button onClick={() => navigate("/teacher/puzzles")}
          style={{ padding:"6px 14px", borderRadius:6, border:"1px solid #555",
            background:"transparent", color:"#ccc", cursor:"pointer", fontSize:13,
            display:"flex", alignItems:"center", gap:6 }}>
          ← Orqaga
        </button>
        <div style={{ flex:1 }}>
          <span style={{ fontWeight:800, fontSize:16 }}>Yangi boshqotirma</span>
          <span style={{ marginLeft:12, fontSize:13, color:"#888" }}>
            {mode === "setup" ? "Pozitsiya sozlash" : "Yechim yozish"}
          </span>
        </div>
        {/* Mode indicator */}
        <div style={{
          padding:"4px 14px", borderRadius:99, fontSize:12, fontWeight:700,
          background: mode==="setup" ? "rgba(245,158,11,.2)" : "rgba(34,197,94,.2)",
          color: mode==="setup" ? "#f59e0b" : "#4ade80",
          border: `1px solid ${mode==="setup" ? "rgba(245,158,11,.4)" : "rgba(34,197,94,.4)"}`,
        }}>
          {mode==="setup" ? "⚙ Sozlash" : "▶ Yechim"}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 310px", gap:0, flex:1, alignItems:"start" }}>

        {/* LEFT — board column */}
        <div style={{ padding:18, display:"flex", flexDirection:"column", gap:8 }}>
          {/* White pieces toolbar */}
          {mode === "setup" && (
            <PieceBar pcs={WH} active={tool}
              onSelect={t => { setTool(t); setCursorFrom(null); }} />
          )}

          {/* Board */}
          <div style={{ maxWidth:580 }}>
            <BoardGrid
              displayPieces={displayPieces}
              flipped={flipped}
              cursorFrom={mode==="setup" ? cursorFrom : null}
              solFrom={mode==="solution" ? solFrom : null}
              solLegal={mode==="solution" ? solLegal : []}
              onClick={mode==="solution" ? handleSolClick : handleSetupClick}
            />
          </div>

          {/* Black pieces toolbar */}
          {mode === "setup" && (
            <PieceBar pcs={BL} active={tool}
              onSelect={t => { setTool(t); setCursorFrom(null); }} />
          )}

          {/* Solution controls (below board in solution mode) */}
          {mode === "solution" && (
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={backToSetup}
                style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #555",
                  background:"transparent", color:"#ccc", cursor:"pointer", fontSize:13 }}>
                ← Sozlashga qaytish
              </button>
              <button onClick={undoSolMove} disabled={solutionMoves.length===0}
                style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #555",
                  background:"transparent", color: solutionMoves.length===0 ? "#555" : "#ccc",
                  cursor: solutionMoves.length===0 ? "default" : "pointer", fontSize:13 }}>
                ← Orqaga
              </button>
              <button onClick={() => { setSolFen(startFen); setSolutionMoves([]); setSolFrom(null); setSolLegal([]); }}
                style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #555",
                  background:"transparent", color:"#ccc", cursor:"pointer", fontSize:13 }}>
                ↺ Qayta boshlash
              </button>
            </div>
          )}

          {/* FEN field */}
          <div style={{ display:"flex", alignItems:"center", gap:10, maxWidth:580 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#888", flexShrink:0 }}>FEN</span>
            <input
              value={mode==="setup" ? currentFen : solFen}
              onChange={e => { if (mode==="setup") applyFen(e.target.value); }}
              readOnly={mode==="solution"}
              style={{
                flex:1, padding:"7px 10px", borderRadius:6,
                border:"1px solid #555", background:"#262421",
                color:"#ddd", fontFamily:"monospace", fontSize:12, outline:"none",
              }}
            />
            <button onClick={() => navigator.clipboard.writeText(mode==="setup" ? currentFen : solFen)}
              title="Nusxalash"
              style={{ padding:"7px 10px", borderRadius:6, border:"1px solid #555",
                background:"#302e2c", color:"#aaa", cursor:"pointer", fontSize:13, flexShrink:0 }}>
              📋
            </button>
          </div>
        </div>

        {/* RIGHT — settings column */}
        <div style={{
          borderLeft:"1px solid #333", padding:16,
          display:"flex", flexDirection:"column", gap:12, minHeight:"calc(100vh - 110px)",
        }}>

          {mode === "setup" ? (
            <>
              {/* Turn */}
              <Section>
                <select value={turn} onChange={e => setTurn(e.target.value as "w"|"b")} style={SEL_STYLE}>
                  <option value="w">Yurish oqlardan</option>
                  <option value="b">Yurish qoralardan</option>
                </select>
              </Section>

              {/* Castling */}
              <Section title="Rokirovka">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {([
                    { key:"wK", label:"Oq O-O" },
                    { key:"wQ", label:"Oq O-O-O" },
                    { key:"bK", label:"Qora O-O" },
                    { key:"bQ", label:"Qora O-O-O" },
                  ] as const).map(({ key, label }) => (
                    <label key={key} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      fontSize:12, color:"#bbb", cursor:"pointer", gap:6,
                      padding:"5px 8px", borderRadius:5, background:"rgba(255,255,255,.04)",
                    }}>
                      {label}
                      <input type="checkbox" checked={cas[key]}
                        onChange={e => setCas(c => ({ ...c, [key]: e.target.checked }))}
                        style={{ accentColor:"#568a5d", width:14, height:14, cursor:"pointer" }} />
                    </label>
                  ))}
                </div>
              </Section>

              {/* En passant */}
              <Section title="En passant">
                <select value={ep} onChange={e => setEp(e.target.value)} style={SEL_STYLE}>
                  <option value="-">—</option>
                  {["a","b","c","d","e","f","g","h"].map(f => (
                    <option key={f} value={f+"6"}>{f} ustun</option>
                  ))}
                </select>
              </Section>

              {/* Actions */}
              <Section title="Amallar">
                <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  {[
                    { icon:"↺", label:"Boshlang'ich pozitsiya", fn: () => applyFen(INITIAL_FEN) },
                    { icon:"🗑", label:"Taxtani tozalash",       fn: () => setPieces({}) },
                    { icon:"⇅", label:"Taxtani aylantirish",    fn: () => setFlipped(f=>!f) },
                  ].map(a => (
                    <button key={a.label} onClick={a.fn}
                      style={ACT_BTN}
                      onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.06)"}
                      onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background="transparent"}>
                      <span style={{ fontSize:16, width:22, textAlign:"center" }}>{a.icon}</span>
                      {a.label}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Enter solution mode */}
              <button onClick={enterSolution}
                style={{
                  padding:"12px", borderRadius:8, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#059669,#10b981)",
                  color:"#fff", fontWeight:800, fontSize:14,
                }}>
                ▶ Yechim yozishga o'tish
              </button>
            </>
          ) : (
            <>
              {/* Solution moves */}
              <Section title="Yechim harakatlari">
                {solutionMoves.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"16px 0", color:"#666", fontSize:13 }}>
                    Taxtada harakatlarni o'ynang...
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {formatMoves().map((m, i) => (
                      <span key={i} style={{
                        padding:"3px 9px", borderRadius:5, fontFamily:"monospace", fontSize:13, fontWeight:700,
                        background: i%2===0 ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)",
                        color: i%2===0 ? "#fff" : "#bbb",
                      }}>
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              {/* Puzzle info */}
              <Section title="Boshqotirma ma'lumotlari">
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#aaa", marginBottom:6 }}>Sarlavha</div>
                  <input placeholder="Masalan: Ikki harakat bilan mat"
                    value={title} onChange={e => setTitle(e.target.value)}
                    style={{
                      width:"100%", padding:"8px 10px", borderRadius:6,
                      border:"1px solid #555", background:"#262421",
                      color:"#ddd", fontSize:13, outline:"none", boxSizing:"border-box",
                    }} />
                </div>

                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#aaa", marginBottom:8 }}>Qiyinlik</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                    {DIFF.map(d => (
                      <button key={d.v} onClick={() => setDifficulty(d.v)}
                        style={{
                          padding:"8px 4px", borderRadius:8, cursor:"pointer", textAlign:"center",
                          border: difficulty===d.v ? "2px solid #4ade80" : "1px solid #484440",
                          background: difficulty===d.v ? "rgba(74,222,128,.12)" : "#262421",
                          color: difficulty===d.v ? "#4ade80" : "#aaa",
                          fontWeight:700, fontSize:12, transition:"all .1s",
                        }}>
                        <div>{d.label}</div>
                        <div style={{ fontSize:10, fontWeight:400, marginTop:2, color:"#666" }}>{d.xp} XP</div>
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Error */}
              {createPuzzle.isError && (
                <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(239,68,68,.15)",
                  border:"1px solid rgba(239,68,68,.3)", color:"#f87171", fontSize:13 }}>
                  Saqlashda xatolik yuz berdi.
                </div>
              )}

              {/* Save */}
              <button onClick={handleSave} disabled={!canSave}
                style={{
                  padding:"13px", borderRadius:8, border:"none",
                  cursor: canSave ? "pointer" : "not-allowed",
                  background: canSave ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "#333",
                  color: canSave ? "#fff" : "#666",
                  fontWeight:800, fontSize:14, marginTop:"auto",
                }}>
                {createPuzzle.isPending ? "Saqlanmoqda..." : "✓ Saqlash"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
