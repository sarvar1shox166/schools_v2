import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import type { PvpGameState } from "./PvpGamePage.js";
import { ChessBoard } from "../../components/ChessBoard.js";
import { CoordinateTrainer } from "../../components/CoordinateTrainer.js";
import { useAuthStore } from "../../lib/auth-store.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const RESULT_LABELS: Record<string, string> = {
  white_wins: "Oq g'alaba qozondi (mat)",
  black_wins: "Qora g'alaba qozondi (mat)",
  white_wins_resign: "Oq g'alaba qozondi (raqib taslim bo'ldi)",
  black_wins_resign: "Qora g'alaba qozondi (raqib taslim bo'ldi)",
  draw_stalemate: "Durang (pat)",
  draw_repetition: "Durang (takrorlanish)",
  draw_material: "Durang (yetarli material yo'q)",
  draw: "Durang",
  opponent_disconnected: "Raqib o'yindan chiqdi",
};

/* ── Time controls ───────────────────────────────────────────────────────── */
const TIME_CONTROLS = [
  { tc:"1+0",  type:"BULLET",  color:"#ef4444" },
  { tc:"2+1",  type:"BULLET",  color:"#f97316" },
  { tc:"3+0",  type:"BLITS",   color:"#f59e0b" },
  { tc:"3+2",  type:"BLITS",   color:"#f59e0b" },
  { tc:"5+0",  type:"BLITS",   color:"#f59e0b" },
  { tc:"5+3",  type:"BLITS",   color:"#f59e0b" },
  { tc:"10+0", type:"RAPID",   color:"#3b82f6" },
  { tc:"10+5", type:"RAPID",   color:"#3b82f6" },
  { tc:"15+10",type:"RAPID",   color:"#3b82f6" },
  { tc:"30+0", type:"KLASSIK", color:"#22c55e" },
  { tc:"30+20",type:"KLASSIK", color:"#22c55e" },
  { tc:"...",  type:"BOSHQA",  color:"rgba(255,255,255,.25)" },
];

function initials(name: string) {
  return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
}

/* ── Difficulty ELO map ──────────────────────────────────────────────────── */
const DIFF_ELO: Record<number, number> = {
  1:720, 2:840, 3:960, 4:1080, 5:1200, 6:1320, 7:1440, 8:1560, 9:1680, 10:1800,
};

/* ── Custom time modal ───────────────────────────────────────────────────── */
function CustomTimeModal({ onClose, onConfirm }:{
  onClose: () => void;
  onConfirm: (tc: string, type: string, color: string) => void;
}) {
  const [mins, setMins] = useState(10);
  const [incr, setIncr] = useState(0);

  const tc    = `${mins}+${incr}`;
  const type  = mins <= 2 ? "BULLET" : mins <= 5 ? "BLITS" : mins <= 15 ? "RAPID" : "KLASSIK";
  const color = mins <= 2 ? "#ef4444" : mins <= 5 ? "#f59e0b" : mins <= 15 ? "#3b82f6" : "#22c55e";

  const overlay = (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"grid", placeItems:"center", zIndex:2000 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#1a1f35", borderRadius:22, width:400, maxWidth:"95vw", overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", padding:"20px 22px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(255,255,255,.2)",display:"grid",placeItems:"center",fontSize:24,flexShrink:0 }}>⏱</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:17, color:"#fff" }}>Maxsus vaqt nazorati</div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.7)", marginTop:3 }}>Vaqtni o'zingiz belgilang</div>
          </div>
          <button onClick={onClose}
            style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"22px 22px 26px" }}>
          {/* Preview */}
          <div style={{ textAlign:"center", marginBottom:22, padding:"16px", borderRadius:14, background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize:36, fontWeight:900, color, letterSpacing:-1, lineHeight:1 }}>{tc}</div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,.4)", marginTop:6 }}>{type}</div>
          </div>

          {/* Minutes */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.55)" }}>⏱ Daqiqa</span>
              <span style={{ fontSize:14, fontWeight:900, color:"#fff" }}>{mins}</span>
            </div>
            <input type="range" min={1} max={60} value={mins}
              onChange={e=>setMins(Number(e.target.value))}
              style={{ width:"100%", accentColor:color, cursor:"pointer" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>
              <span>1</span><span>15</span><span>30</span><span>60</span>
            </div>
          </div>

          {/* Increment */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.55)" }}>➕ Qo'shimcha (soniya)</span>
              <span style={{ fontSize:14, fontWeight:900, color:"#fff" }}>{incr}</span>
            </div>
            <input type="range" min={0} max={30} value={incr}
              onChange={e=>setIncr(Number(e.target.value))}
              style={{ width:"100%", accentColor:color, cursor:"pointer" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>
              <span>0</span><span>10</span><span>20</span><span>30</span>
            </div>
          </div>

          {/* Confirm */}
          <button onClick={()=>onConfirm(tc, type, color)}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none",
              background:`linear-gradient(135deg,${color},${color}cc)`,
              color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
            ✓ Tasdiqlash — {tc} {type}
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}

/* ── Computer modal ──────────────────────────────────────────────────────── */
function ComputerModal({ tc, tcType, tcColor, onClose, onStart }:{
  tc: string; tcType: string; tcColor: string;
  onClose: () => void;
  onStart: (difficulty: number, color: "white"|"random"|"black", unbeatable: boolean) => void;
}) {
  const [diff, setDiff]         = useState(3);
  const [sideColor, setSide]    = useState<"white"|"random"|"black">("white");
  const [unbeatable, setUnbeat] = useState(false);

  const COLORS = [
    { v:"white"  as const, label:"Oq",      icon:"⚪" },
    { v:"random" as const, label:"Tasodif", icon:"🎲" },
    { v:"black"  as const, label:"Qora",    icon:"⚫" },
  ];

  const overlay = (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"grid", placeItems:"center", zIndex:2000 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#1a1f35", borderRadius:22, width:440, maxWidth:"95vw", overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        {/* Header */}
        <div style={{ background: unbeatable ? "linear-gradient(135deg,#92400e,#f59e0b)" : "linear-gradient(135deg,#2563eb,#3b82f6)", padding:"20px 22px", display:"flex", alignItems:"center", gap:14, transition:"background .3s" }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(255,255,255,.2)",display:"grid",placeItems:"center",fontSize:24,flexShrink:0 }}>
            {unbeatable ? "👑" : "🤖"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:17, color:"#fff" }}>
              {unbeatable ? "Yengilmas rejim" : "Kompyuterga qarshi o'yin"}
            </div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.7)", marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:tcColor,display:"inline-block" }}/>
              {tc} · {tcType}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"grid",placeItems:"center",flexShrink:0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"22px 22px 26px" }}>

          {/* Unbeatable toggle */}
          <button onClick={()=>setUnbeat(u=>!u)}
            style={{ width:"100%", padding:"14px 16px", borderRadius:14, marginBottom:18,
              border:`1.5px solid ${unbeatable ? "#f59e0b" : "rgba(255,255,255,.1)"}`,
              background: unbeatable ? "rgba(245,158,11,.15)" : "rgba(255,255,255,.04)",
              cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all .2s" }}>
            <div style={{ fontSize:28 }}>👑</div>
            <div style={{ flex:1, textAlign:"left" }}>
              <div style={{ fontWeight:800, fontSize:14, color: unbeatable ? "#fbbf24" : "rgba(255,255,255,.8)" }}>
                Yengilmas rejim
              </div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                Dunyoning eng kuchli shaxmat dasturi · ~3500 ELO
              </div>
            </div>
            <div style={{
              width:22, height:22, borderRadius:6,
              background: unbeatable ? "#f59e0b" : "rgba(255,255,255,.1)",
              display:"grid", placeItems:"center", fontSize:14, flexShrink:0,
            }}>
              {unbeatable ? "✓" : ""}
            </div>
          </button>

          {/* Difficulty (disabled when unbeatable) */}
          <div style={{ opacity: unbeatable ? 0.35 : 1, transition:"opacity .2s", pointerEvents: unbeatable ? "none" : "auto" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.55)", marginBottom:12 }}>🖥 Kompyuter kuchi</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:22 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const sel = diff === n;
                return (
                  <button key={n} onClick={()=>setDiff(n)}
                    style={{ padding:"10px 6px", borderRadius:12, border:`1.5px solid ${sel?"#3b82f6":"rgba(255,255,255,.1)"}`,
                      background: sel ? "#3b82f6" : "rgba(255,255,255,.05)",
                      cursor:"pointer", textAlign:"center", transition:"all .12s" }}>
                    <div style={{ fontSize:20, fontWeight:900, color: sel?"#fff":"rgba(255,255,255,.85)", lineHeight:1 }}>{n}</div>
                    <div style={{ fontSize:10, color: sel?"rgba(255,255,255,.8)":"rgba(255,255,255,.3)", marginTop:3 }}>{DIFF_ELO[n]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color pick */}
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.55)", marginBottom:12 }}>👤 Qaysi rangda o'ynaysiz?</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
            {COLORS.map(c => {
              const sel = sideColor === c.v;
              return (
                <button key={c.v} onClick={()=>setSide(c.v)}
                  style={{ padding:"16px 8px", borderRadius:14, border:`1.5px solid ${sel?"#3b82f6":"rgba(255,255,255,.1)"}`,
                    background: sel ? "rgba(37,99,235,.25)" : "rgba(255,255,255,.04)",
                    cursor:"pointer", textAlign:"center", transition:"all .12s" }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{c.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: sel?"#60a5fa":"rgba(255,255,255,.7)" }}>{c.label}</div>
                </button>
              );
            })}
          </div>

          {/* Start */}
          <button onClick={()=>onStart(diff, sideColor, unbeatable)}
            style={{ width:"100%", padding:"14px", borderRadius:14, border:"none",
              background: unbeatable ? "#f59e0b" : "#22c55e",
              color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", transition:"background .2s" }}>
            {unbeatable ? "👑 Yengilmas rejimda boshlash" : "▶ O'yinni boshlash"}
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}

type Status = "idle" | "connecting" | "queued" | "playing" | "finished";
type OnlinePlayer = { studentId: string; fullName: string };

/* ── Idle screen ─────────────────────────────────────────────────────────── */
function IdleScreen({ timeControl, setTimeControl, onStart, onlinePlayers, onChallenge }:{
  timeControl: string;
  setTimeControl: (tc: string) => void;
  onStart: () => void;
  onlinePlayers: OnlinePlayer[];
  onChallenge: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ tc:string; type:string; color:string }|null>(null);
  const [customTime, setCustomTime] = useState(false);

  const players = onlinePlayers.map((p, i) => ({
    id:p.studentId, name:p.fullName, elo:1200, tc:"5+0 Blits",
    color:["#f59e0b","#7c3aed","#22c55e","#3b82f6"][i%4],
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Time controls card */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.2)",border:"1px solid rgba(99,102,241,.3)",display:"grid",placeItems:"center",fontSize:18 }}>⏱</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>Vaqt nazoratini tanlang</div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", marginTop:2 }}>O'yin turini bosib boshlang</div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)" }}>
          {TIME_CONTROLS.map(({ tc, type, color }, i) => {
            const isLast = tc === "...";
            return (
              <button key={tc}
                onClick={()=>{ if(isLast){ setCustomTime(true); } else { setTimeControl(tc); setModal({ tc, type, color }); } }}
                style={{ padding:"22px 16px", textAlign:"center", cursor:"pointer",
                  background:"transparent",
                  borderTop: i >= 3 ? "1px solid rgba(255,255,255,.06)" : "none",
                  borderLeft: i%3 !== 0 ? "1px solid rgba(255,255,255,.06)" : "none",
                  borderRight:"none", borderBottom:"none",
                  transition:"background .15s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background=isLast?"rgba(99,102,241,.1)":`${color}10`; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}>
                {isLast ? (
                  <div style={{ fontSize:22, fontWeight:900, color:"rgba(255,255,255,.5)", letterSpacing:4, marginBottom:6 }}>· · ·</div>
                ) : (
                  <div style={{ fontSize:32, fontWeight:900, color, marginBottom:5, lineHeight:1, letterSpacing:-1 }}>{tc}</div>
                )}
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,.35)" }}>{type}</div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 20px",
          borderTop:"1px solid rgba(255,255,255,.07)", background:"rgba(0,0,0,.15)" }}>
          <span style={{ width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block",flexShrink:0 }}/>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.55)" }}>
            Kompyuterga qarshi o'ynash uchun quyidagi vaqt nazoratini tanlang
          </span>
        </div>
      </div>

      {/* Online players */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.25)",display:"grid",placeItems:"center",fontSize:18 }}>👤</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>Online o'yinchilar</div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", marginTop:2 }}>Taklif yuboring — o'yin boshlang</div>
          </div>
          <div style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:99, background:"rgba(34,197,94,.15)", border:"1px solid rgba(34,197,94,.3)", fontSize:12, fontWeight:700, color:"#4ade80" }}>
            {players.length} online
          </div>
        </div>

        {/* Player rows */}
        <div>
          {players.length === 0 && (
            <div style={{ padding:"24px 20px", textAlign:"center", color:"rgba(255,255,255,.3)", fontSize:13 }}>
              Hozir online o'yinchilar yo'q — biroz kutib turing
            </div>
          )}
          {players.map((p, i) => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px",
              borderTop: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
              <div style={{ width:42,height:42,borderRadius:12,background:p.color,display:"grid",placeItems:"center",
                fontSize:14,fontWeight:800,color:"#fff",flexShrink:0 }}>
                {initials(p.name)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
                  {p.elo} ELO · {p.tc}
                </div>
              </div>
              <span style={{ width:8,height:8,borderRadius:"50%",background:"#4ade80",flexShrink:0 }}/>
              <button onClick={()=>onChallenge(p.id)}
                style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:10,border:"none",
                  background:"linear-gradient(135deg,#2563eb,#3b82f6)",color:"#fff",
                  fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0 }}>
                ✈ O'ynash
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom time modal */}
      {customTime && (
        <CustomTimeModal
          onClose={()=>setCustomTime(false)}
          onConfirm={(tc, type, color)=>{
            setCustomTime(false);
            setTimeControl(tc);
            setModal({ tc, type, color });
          }}
        />
      )}

      {/* Computer modal */}
      {modal && (
        <ComputerModal
          tc={modal.tc} tcType={modal.type} tcColor={modal.color}
          onClose={()=>setModal(null)}
          onStart={(diff, color, unbeatable)=>{
            setModal(null);
            const gameState: PvpGameState = {
              tc: modal.tc, tcType: modal.type, tcColor: modal.color,
              difficulty: diff, playerColor: color,
              computerElo: unbeatable ? 3500 : (DIFF_ELO[diff] ?? 960),
              unbeatable,
            };
            navigate("/student/pvp/game", { state: gameState });
          }}
        />
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PvpPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<Status>("idle");
  const [color, setColor] = useState<"w" | "b" | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [fen, setFen] = useState(START_FEN);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [timeControl, setTimeControl] = useState("5+0");
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<{ fromStudentId: string; fromName: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  function startSearch() {
    if (!accessToken) return;
    setError(null); setResult(null); setColor(null);
    setOpponent(null); setFen(START_FEN);
    setOnlinePlayers([]); setIncomingChallenge(null);
    setStatus("connecting");

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/pvp?token=${encodeURIComponent(accessToken)}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("queued");
    ws.onclose = () => setStatus((s) => (s === "playing" ? "finished" : "idle"));
    ws.onerror = () => setError("Ulanishda xatolik yuz berdi");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "queued")             setStatus("queued");
      else if (msg.type === "online_list")   setOnlinePlayers(msg.players);
      else if (msg.type === "challenge_received") setIncomingChallenge({ fromStudentId:msg.fromStudentId, fromName:msg.fromName });
      else if (msg.type === "challenge_declined") setError(`${msg.byName} taklifni rad etdi`);
      else if (msg.type === "matched") {
        setIncomingChallenge(null); setColor(msg.color);
        setOpponent(msg.opponent); setFen(msg.fen); setStatus("playing");
      } else if (msg.type === "move") {
        setFen(msg.fen);
        if (msg.gameOver) { setResult(msg.result); setStatus("finished"); }
      } else if (msg.type === "error") setError(msg.message);
      else if (msg.type === "ended")  { setResult(msg.reason); setStatus("finished"); }
    };
  }

  function handleMove(from: string, to: string) {
    setError(null);
    wsRef.current?.send(JSON.stringify({ type:"move", from, to, promotion:"q" }));
  }

  function resign() { wsRef.current?.send(JSON.stringify({ type:"resign" })); }

  function sendChallenge(targetStudentId: string) {
    wsRef.current?.send(JSON.stringify({ type:"challenge", targetStudentId }));
  }

  function respondChallenge(accept: boolean) {
    if (!incomingChallenge) return;
    wsRef.current?.send(JSON.stringify({
      type: accept ? "challenge_accept" : "challenge_decline",
      fromStudentId: incomingChallenge.fromStudentId,
    }));
    setIncomingChallenge(null);
  }

  return (
    <div>
      {status === "idle" && (
        <IdleScreen
          timeControl={timeControl}
          setTimeControl={setTimeControl}
          onStart={startSearch}
          onlinePlayers={onlinePlayers}
          onChallenge={sendChallenge}
        />
      )}

      {(status === "connecting" || status === "queued") && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, padding:"48px 24px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>Raqib qidirilmoqda...</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginBottom:24 }}>Vaqt nazorati: <b style={{ color:"#fff" }}>{timeControl}</b></div>
            <button onClick={()=>{ wsRef.current?.close(); setStatus("idle"); }}
              style={{ padding:"10px 24px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.15)", background:"transparent", color:"rgba(255,255,255,.7)", fontWeight:700, cursor:"pointer", fontSize:14 }}>
              Bekor qilish
            </button>
          </div>
          {onlinePlayers.length > 0 && (
            <div style={{ background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, padding:16 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:"rgba(255,255,255,.5)" }}>Online o'quvchilar</div>
              {onlinePlayers.map(p => (
                <div key={p.studentId} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderTop:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:"#7c3aed",display:"grid",placeItems:"center",fontSize:12,fontWeight:800,color:"#fff" }}>
                    {initials(p.fullName)}
                  </div>
                  <div style={{ flex:1, fontWeight:700 }}>{p.fullName}</div>
                  <button onClick={()=>sendChallenge(p.studentId)}
                    style={{ padding:"6px 16px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                    Chaqirish
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(status === "playing" || status === "finished") && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
          <div style={{ background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, padding:20 }}>
            <ChessBoard
              fen={fen}
              onMove={handleMove}
              disabled={status !== "playing"}
              flipped={color === "b"}
              getMoves={(sq) => {
                try { return new Chess(fen).moves({ square: sq as import("chess.js").Square, verbose: true }).map((m: {to: string}) => m.to); }
                catch { return []; }
              }}
            />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:16, padding:18 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>Siz: {color === "w" ? "⬜ Oq" : "⬛ Qora"}</div>
              {opponent && <div style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>Raqib: <b style={{ color:"#fff" }}>{opponent}</b></div>}
              {error && <div style={{ marginTop:10, padding:"8px 12px", borderRadius:10, background:"rgba(239,68,68,.15)", border:"1px solid rgba(239,68,68,.3)", color:"#f87171", fontSize:13 }}>{error}</div>}
              {result && <div style={{ marginTop:10, padding:"8px 12px", borderRadius:10, background:"rgba(34,197,94,.15)", border:"1px solid rgba(34,197,94,.3)", color:"#4ade80", fontSize:13 }}>{RESULT_LABELS[result] ?? result}</div>}
              {status === "playing" && (
                <button onClick={resign}
                  style={{ marginTop:14, width:"100%", padding:"10px", borderRadius:10, border:"1.5px solid rgba(239,68,68,.3)", background:"rgba(239,68,68,.1)", color:"#f87171", fontWeight:700, cursor:"pointer" }}>
                  Taslim bo'lish
                </button>
              )}
              {status === "finished" && (
                <button onClick={startSearch}
                  style={{ marginTop:14, width:"100%", padding:"10px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff", fontWeight:700, cursor:"pointer" }}>
                  ♟ Yana o'ynash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {incomingChallenge && createPortal(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"grid", placeItems:"center", zIndex:1000 }}>
          <div style={{ background:"#1e2235", border:"1.5px solid rgba(255,255,255,.15)", borderRadius:20, padding:"32px 28px", textAlign:"center", minWidth:320 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚔️</div>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>{incomingChallenge.fromName}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginBottom:24 }}>sizni o'yinga taklif qilmoqda</div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={()=>respondChallenge(true)}
                style={{ padding:"10px 24px", borderRadius:10, border:"none", background:"#22c55e", color:"#fff", fontWeight:700, cursor:"pointer" }}>
                ✓ Qabul
              </button>
              <button onClick={()=>respondChallenge(false)}
                style={{ padding:"10px 24px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.15)", background:"transparent", color:"rgba(255,255,255,.7)", fontWeight:700, cursor:"pointer" }}>
                ✕ Rad
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
