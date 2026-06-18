import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ── Board constants ─────────────────────────────────────────────────────── */
const CELL = 76;
const COLS_LABEL = ["a","b","c","d","e","f","g","h"];

type Pos = [number, number]; // [col 0-7, row 0-7]  row 0 = rank 1

function cellCenter(col: number, row: number): [number, number] {
  return [col * CELL + CELL / 2, (7 - row) * CELL + CELL / 2];
}

/* ── Lesson data ─────────────────────────────────────────────────────────── */
interface Step { from: Pos; to: Pos; }

interface LessonDef {
  id: string; title: string; desc: string;
  pieceIcon: string; instruction: string;
  steps: Step[];
}

const LESSON_MAP: Record<string, LessonDef> = {
  rux: {
    id:"rux", title:"Rux", desc:"Rux to'g'ri chiziq bo'yicha harakatlanadi",
    pieceIcon:"♖", instruction:"Ruxni ustiga bosib yulduzchaga olib boring!",
    steps:[
      { from:[4,1], to:[4,5] }, { from:[0,0], to:[7,0] },
      { from:[3,3], to:[3,7] }, { from:[2,2], to:[2,6] },
      { from:[5,1], to:[0,1] }, { from:[1,4], to:[1,0] },
    ],
  },
  fil: {
    id:"fil", title:"Fil", desc:"Fil diagonal bo'yicha harakatlanadi",
    pieceIcon:"♗", instruction:"Filni yulduzchaga olib boring!",
    steps:[
      { from:[3,0], to:[6,3] }, { from:[2,2], to:[5,5] },
      { from:[4,4], to:[1,7] }, { from:[0,0], to:[4,4] },
      { from:[7,7], to:[3,3] }, { from:[1,6], to:[4,3] },
    ],
  },
  farzin: {
    id:"farzin", title:"Farzin", desc:"Farzin = rux + fil",
    pieceIcon:"♕", instruction:"Farzinni yulduzchaga olib boring!",
    steps:[
      { from:[3,0], to:[3,6] }, { from:[4,4], to:[7,7] },
      { from:[0,0], to:[7,7] }, { from:[3,4], to:[7,0] },
      { from:[2,1], to:[2,7] },
    ],
  },
  shoh: {
    id:"shoh", title:"Shoh", desc:"Eng muhim dona",
    pieceIcon:"♔", instruction:"Shohni yulduzchaga olib boring!",
    steps:[
      { from:[4,0], to:[4,1] }, { from:[4,1], to:[3,2] },
      { from:[3,2], to:[4,3] }, { from:[4,3], to:[5,4] },
    ],
  },
  ot: {
    id:"ot", title:"Ot", desc:"Ot \"L\" shaklida harakatlanadi",
    pieceIcon:"♘", instruction:"Otni yulduzchaga olib boring!",
    steps:[
      { from:[1,0], to:[2,2] }, { from:[3,3], to:[5,4] },
      { from:[4,2], to:[2,3] }, { from:[2,4], to:[4,5] },
      { from:[5,5], to:[3,6] }, { from:[0,1], to:[2,0] },
    ],
  },
  piyoda: {
    id:"piyoda", title:"Piyoda", desc:"Faqat oldinga yuradi",
    pieceIcon:"♙", instruction:"Piyodani yulduzchaga olib boring!",
    steps:[
      { from:[4,1], to:[4,2] }, { from:[4,2], to:[4,3] },
      { from:[2,1], to:[2,3] }, { from:[3,3], to:[3,4] },
      { from:[5,1], to:[5,2] },
    ],
  },
};

/* ── Sidebar data ────────────────────────────────────────────────────────── */
const SIDEBAR = [
  {
    title:"Shaxmat donalari",
    lessons:[
      { id:"rux",    title:"Rux",    icon:"♜" },
      { id:"fil",    title:"Fil",    icon:"♝" },
      { id:"farzin", title:"Farzin", icon:"♛" },
      { id:"shoh",   title:"Shoh",   icon:"♚" },
      { id:"ot",     title:"Ot",     icon:"♞" },
      { id:"piyoda", title:"Piyoda", icon:"♟" },
    ],
  },
  { title:"Asosiy prinsiplar", lessons:[] as {id:string;title:string;icon:string}[] },
  { title:"O'rta daraja",      lessons:[] as {id:string;title:string;icon:string}[] },
  { title:"Yuqori daraja",     lessons:[] as {id:string;title:string;icon:string}[] },
];

/* ── Valid move highlights ────────────────────────────────────────────────── */
function getHighlights(lesson: LessonDef, from: Pos): Pos[] {
  const [col, row] = from;
  const all: Pos[] = [];
  if (lesson.id === "rux" || lesson.id === "farzin") {
    for (let c = 0; c < 8; c++) if (c !== col) all.push([c, row]);
    for (let r = 0; r < 8; r++) if (r !== row) all.push([col, r]);
  }
  if (lesson.id === "fil" || lesson.id === "farzin") {
    for (let d = 1; d < 8; d++) {
      ([[col+d,row+d],[col-d,row+d],[col+d,row-d],[col-d,row-d]] as Pos[]).forEach(([c,r])=>{
        if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
      });
    }
  }
  if (lesson.id === "shoh") {
    for (let dc=-1;dc<=1;dc++) for (let dr=-1;dr<=1;dr++) {
      if (dc===0&&dr===0) continue;
      const c=col+dc, r=row+dr;
      if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
    }
  }
  if (lesson.id === "ot") {
    ([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]] as Pos[]).forEach(([dc,dr])=>{
      const c=col+dc, r=row+dr;
      if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
    });
  }
  if (lesson.id === "piyoda") {
    if (row+1<8) all.push([col, row+1]);
    if (row===1)  all.push([col, row+2]);
  }
  return all;
}

/* ── Board ───────────────────────────────────────────────────────────────── */
function Board({ lesson, stepIdx, showHint, onStepComplete }:
  { lesson: LessonDef; stepIdx: number; showHint: boolean; onStepComplete: ()=>void }) {

  const boardRef = useRef<HTMLDivElement>(null);
  const [dragging,   setDragging]   = useState(false);
  const [relCursor,  setRelCursor]  = useState({ x:0, y:0 }); // relative to board top-left
  const [hoverCell,  setHoverCell]  = useState<Pos|null>(null);

  const step       = lesson.steps[stepIdx] ?? lesson.steps[0];
  const highlights = getHighlights(lesson, step.from);
  const [fromX, fromY] = cellCenter(...step.from);
  const [toX, toY]     = cellCenter(...step.to);

  function clientToBoard(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { rx: clientX - rect.left, ry: clientY - rect.top };
  }

  function clientToCell(clientX: number, clientY: number): Pos | null {
    const pos = clientToBoard(clientX, clientY);
    if (!pos) return null;
    const col  = Math.floor(pos.rx / CELL);
    const dRow = Math.floor(pos.ry / CELL);
    if (col < 0 || col > 7 || dRow < 0 || dRow > 7) return null;
    return [col, 7 - dRow];
  }

  useEffect(() => {
    if (!dragging) return;

    function getClientXY(e: MouseEvent | TouchEvent) {
      if ("changedTouches" in e && e.type === "touchend")
        return { cx: e.changedTouches[0].clientX, cy: e.changedTouches[0].clientY };
      if ("touches" in e)
        return { cx: (e as TouchEvent).touches[0].clientX, cy: (e as TouchEvent).touches[0].clientY };
      return { cx: (e as MouseEvent).clientX, cy: (e as MouseEvent).clientY };
    }

    function onMove(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      const { cx, cy } = getClientXY(e);
      const pos = clientToBoard(cx, cy);
      if (pos) setRelCursor({ x: pos.rx, y: pos.ry });
      setHoverCell(clientToCell(cx, cy));
    }

    function onUp(e: MouseEvent | TouchEvent) {
      const { cx, cy } = getClientXY(e);
      setDragging(false);
      setHoverCell(null);
      document.body.style.cursor = "";
      const cell = clientToCell(cx, cy);
      if (cell && cell[0] === step.to[0] && cell[1] === step.to[1]) onStepComplete();
    }

    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
      document.body.style.cursor = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, step, onStepComplete]);

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pos = clientToBoard(cx, cy);
    if (pos) setRelCursor({ x: pos.rx, y: pos.ry });
    setDragging(true);
  }

  const isHoverTarget = hoverCell?.[0] === step.to[0] && hoverCell?.[1] === step.to[1];

  return (
    <div ref={boardRef}
      style={{ position:"relative", width:CELL*8, height:CELL*8, flexShrink:0,
        boxShadow:"0 8px 40px rgba(0,0,0,.5)", userSelect:"none",
        overflow:"visible" }}>

      {/* Cells */}
      {Array.from({length:8}, (_,displayRow) =>
        Array.from({length:8}, (_,col) => {
          const row      = 7 - displayRow;
          const isLight  = (col + displayRow) % 2 === 0;
          const isTarget = col === step.to[0]   && row === step.to[1];
          const isPiece  = col === step.from[0] && row === step.from[1];
          const isHL     = showHint && highlights.some(([c,r]) => c===col && r===row);
          const isHover  = hoverCell?.[0]===col && hoverCell?.[1]===row;

          return (
            <div key={`${col}-${displayRow}`}
              style={{ position:"absolute", left:col*CELL, top:displayRow*CELL,
                width:CELL, height:CELL,
                background: isHover && isTarget ? "#4ade80"
                  : isLight ? "#f0d9b5" : "#b58863",
                transition:"background .1s",
                display:"flex", alignItems:"center", justifyContent:"center" }}>

              {isHL && !isTarget && (
                <div style={{ width:22,height:22,borderRadius:"50%",
                  background:"rgba(0,0,0,.2)",pointerEvents:"none" }}/>
              )}

              {/* Piece — hidden while dragging */}
              {isPiece && !dragging && (
                <span onMouseDown={startDrag} onTouchStart={startDrag}
                  style={{ fontSize:50,lineHeight:1,color:"#fff",
                    textShadow:"0 2px 8px rgba(0,0,0,.8)",
                    cursor:"grab", position:"relative", zIndex:1, display:"block" }}>
                  {lesson.pieceIcon}
                </span>
              )}

              {/* Dashed placeholder while dragging */}
              {isPiece && dragging && (
                <div style={{ width:CELL-10,height:CELL-10,borderRadius:8,
                  border:"2px dashed rgba(255,255,255,.25)" }}/>
              )}
            </div>
          );
        })
      )}

      {/* SVG: hint arrow + star */}
      <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }}>
        {showHint && (
          <line x1={fromX} y1={fromY} x2={toX} y2={toY}
            stroke="rgba(40,200,90,.55)" strokeWidth={16} strokeLinecap="round"/>
        )}
        <text x={toX} y={toY+12} textAnchor="middle" fontSize={44}
          style={{ userSelect:"none" }}>⭐</text>
      </svg>

      {/* Ghost piece — position: absolute relative to board */}
      {dragging && (
        <div style={{ position:"absolute",
          left: relCursor.x - CELL/2, top: relCursor.y - CELL/2,
          width:CELL, height:CELL, borderRadius:"50%",
          background: isHoverTarget ? "rgba(74,222,128,.4)" : "rgba(37,99,235,.35)",
          display:"grid", placeItems:"center", fontSize:52,
          color:"#fff", textShadow:"0 2px 12px rgba(0,0,0,.9)",
          pointerEvents:"none", zIndex:200, transition:"background .12s",
          boxShadow: isHoverTarget ? "0 0 0 4px rgba(74,222,128,.7)" : "0 4px 20px rgba(0,0,0,.5)" }}>
          {lesson.pieceIcon}
        </div>
      )}

      {/* Coord labels */}
      {COLS_LABEL.map((c,i) => (
        <div key={c} style={{ position:"absolute",bottom:-22,left:i*CELL,width:CELL,
          textAlign:"center",fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600 }}>
          {c}
        </div>
      ))}
      {[8,7,6,5,4,3,2,1].map((r,i) => (
        <div key={r} style={{ position:"absolute",right:-22,top:i*CELL,height:CELL,
          lineHeight:`${CELL}px`,fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600 }}>
          {r}
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LearnLessonPage() {
  const { lessonId = "rux" } = useParams();
  const navigate = useNavigate();
  const lesson = LESSON_MAP[lessonId] ?? LESSON_MAP["rux"];

  const [stepIdx,   setStepIdx]   = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [showDone,  setShowDone]  = useState(false);
  const [showHint,  setShowHint]  = useState(true);

  /* show hint arrow for 2.5 s at each new step, then hide */
  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 2500);
    return () => clearTimeout(t);
  }, [stepIdx, lessonId]);

  function handleStepComplete() {
    const next = stepIdx + 1;
    setCompleted(p => [...p, stepIdx]);
    if (next >= lesson.steps.length) setShowDone(true);
    else setStepIdx(next);
  }

  function reset() {
    setStepIdx(0);
    setCompleted([]);
    setShowDone(false);
  }

  const activeSection = SIDEBAR.find(s => s.lessons.some(l => l.id === lessonId));

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 60px)", margin:"-20px", background:"#181c28" }}>

      {/* ── SIDEBAR (compact) ── */}
      <div style={{ width:200, flexShrink:0, background:"#10131a", borderRight:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <span style={{ fontSize:18 }}>♞</span>
          <span style={{ fontWeight:800, fontSize:14 }}>Menyu</span>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {SIDEBAR.map(section => {
            const isOpen = section === activeSection || section.lessons.some(l => l.id === lessonId);
            return (
              <div key={section.title}>
                <div style={{ padding:"9px 14px", fontSize:12, fontWeight:700, letterSpacing:".01em",
                  color: isOpen ? "#fff" : "rgba(255,255,255,.35)",
                  borderBottom:"1px solid rgba(255,255,255,.05)", cursor:"pointer" }}>
                  {section.title}
                </div>
                {isOpen && section.lessons.map(l => (
                  <div key={l.id}
                    onClick={() => { reset(); navigate(`/student/learn/${l.id}`); }}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px 8px 24px", cursor:"pointer",
                      background: l.id === lessonId ? "#2563eb" : "transparent",
                      borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize:16, flexShrink:0, color: l.id===lessonId ? "#fff" : "rgba(255,255,255,.45)" }}>{l.icon}</span>
                    <span style={{ fontSize:12.5, fontWeight:600, color: l.id===lessonId ? "#fff" : "rgba(255,255,255,.5)" }}>{l.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,.07)" }}>
          <button onClick={() => navigate("/student/learn")}
            style={{ width:"100%", padding:"7px 8px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:11.5, cursor:"pointer" }}>
            ← Qaytish
          </button>
        </div>
      </div>

      {/* ── BOARD ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px 60px" }}>
        {showDone ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:16 }}>🏆</div>
            <div style={{ fontSize:26, fontWeight:900, marginBottom:8 }}>Ajoyib!</div>
            <div style={{ fontSize:15, color:"rgba(255,255,255,.5)", marginBottom:28 }}>
              Barcha {lesson.steps.length} ta mashq bajarildi!
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn" style={{ background:"#2563eb", color:"#fff", border:"none" }} onClick={reset}>
                Qayta ishlash
              </button>
              <button className="btn" style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#fff" }}
                onClick={() => navigate("/student/learn")}>
                O'rganishga qaytish
              </button>
            </div>
          </div>
        ) : (
          <Board lesson={lesson} stepIdx={stepIdx} showHint={showHint} onStepComplete={handleStepComplete} />
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width:270, flexShrink:0, padding:"20px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {/* Lesson card */}
        <div style={{ borderRadius:13, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,.4)" }}>
          {/* Blue header */}
          <div style={{ background:"#2563eb", padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:"rgba(255,255,255,.2)", display:"grid", placeItems:"center", fontSize:24, flexShrink:0 }}>
              {lesson.pieceIcon}
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:17, color:"#fff" }}>{lesson.title}</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.7)", marginTop:2, lineHeight:1.35 }}>{lesson.desc}</div>
            </div>
          </div>
          {/* Instruction */}
          <div style={{ background:"#1a1f30", padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <p style={{ margin:0, fontSize:13.5, textAlign:"center", lineHeight:1.6, color:"rgba(255,255,255,.8)", fontWeight:600 }}>
              {showDone ? "Barcha mashqlar bajarildi! 🎉" : lesson.instruction}
            </p>
          </div>
          {/* Steps */}
          <div style={{ background:"#1a1f30", padding:"10px 16px", display:"flex", gap:6, flexWrap:"wrap" }}>
            {lesson.steps.map((_,i) => {
              const isDone    = completed.includes(i);
              const isCurrent = i === stepIdx && !showDone;
              return (
                <div key={i}
                  onClick={() => { if (!showDone) setStepIdx(i); }}
                  style={{ width:34, height:34, borderRadius:7, display:"grid", placeItems:"center", fontSize:12.5, fontWeight:800, cursor:"pointer",
                    background: isDone ? "#22c55e" : isCurrent ? "#2563eb" : "rgba(255,255,255,.07)",
                    color:      isDone || isCurrent ? "#fff" : "rgba(255,255,255,.35)",
                    border:     isCurrent ? "2px solid #60a5fa" : "1.5px solid transparent" }}>
                  {isDone ? "✓" : i+1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint status */}
        {!showDone && (
          <div style={{ borderRadius:10, padding:"10px 13px", fontSize:12, lineHeight:1.55, color:"rgba(255,255,255,.5)",
            background: showHint ? "rgba(40,200,90,.1)" : "rgba(255,255,255,.04)",
            border: `1px solid ${showHint ? "rgba(40,200,90,.3)" : "rgba(255,255,255,.08)"}`,
            transition:"all .4s" }}>
            {showHint
              ? <><span style={{ color:"#4ade80", fontWeight:700 }}>💡 Ko'rsatma:</span> Yashil yo'l bo'ylab yulduzchaga boring.</>
              : <><span style={{ color:"rgba(255,255,255,.3)", fontWeight:700 }}>🧠 Eslang:</span> Yulduzchani toping va bosing!</>
            }
          </div>
        )}
      </div>
    </div>
  );
}
