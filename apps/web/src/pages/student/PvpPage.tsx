import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import type { PvpGameState } from "./PvpGamePage.js";
import { ChessBoard } from "../../components/ChessBoard.js";
import { useAuthStore } from "../../lib/auth-store.js";

/* ── Shared helpers ──────────────────────────────────────────────────────── */
function tcToSeconds(tc: string): number {
  const [min, inc = "0"] = tc.split("+");
  return parseInt(min) * 60 + parseInt(inc);
}
function fmt(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function useBoardSizePvp(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState(500);
  useEffect(() => {
    function calc() {
      const el = ref.current;
      const availH = window.innerHeight - 220;
      const availW = el ? el.getBoundingClientRect().width : window.innerWidth - 520;
      setSize(Math.floor(Math.min(availW, availH, 680)));
    }
    calc();
    const obs = ref.current ? new ResizeObserver(calc) : null;
    if (obs && ref.current) obs.observe(ref.current);
    window.addEventListener("resize", calc);
    return () => { obs?.disconnect(); window.removeEventListener("resize", calc); };
  }, [ref]);
  return size;
}

function PvpPlayerCard({ name, elo, seconds, isMe, isActive }: {
  name: string; elo: number; seconds: number; isMe?: boolean; isActive: boolean;
}) {
  const avatarColor = isMe ? "#22c55e" : ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][name.charCodeAt(0)%5];
  const initls = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const isLow = seconds <= 30 && seconds > 0;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
      background: isActive ? "rgba(37,99,235,.18)" : "rgba(255,255,255,.04)",
      border:`1.5px solid ${isActive?"#3b82f6":"rgba(255,255,255,.1)"}`,
      borderRadius:14,transition:"all .2s" }}>
      <div style={{ width:44,height:44,borderRadius:12,background:avatarColor,
        display:"grid",placeItems:"center",fontSize:15,fontWeight:900,color:"#fff",flexShrink:0 }}>
        {initls}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:800,fontSize:14 }}>{name}</div>
        <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:1 }}>{elo} ELO</div>
      </div>
      <div style={{ padding:"8px 16px",borderRadius:10,
        background: isLow?"#ef4444":isActive?"#3b82f6":"rgba(255,255,255,.08)",
        fontWeight:900,fontSize:22,letterSpacing:1,color:"#fff",
        fontVariantNumeric:"tabular-nums",transition:"background .3s" }}>
        {fmt(seconds)}
      </div>
    </div>
  );
}

function PvpBoardWithCoords({ fen, onMove, flipped, disabled, getMoves }: {
  fen: string; onMove:(f:string,t:string)=>void;
  flipped:boolean; disabled:boolean; getMoves?:(sq:string)=>string[];
}) {
  const FILES = ["a","b","c","d","e","f","g","h"];
  const RANKS = ["8","7","6","5","4","3","2","1"];
  const dFiles = flipped ? [...FILES].reverse() : FILES;
  const dRanks = flipped ? [...RANKS].reverse() : RANKS;
  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%" }}>
      <div style={{ display:"flex",flex:1,minHeight:0 }}>
        <div style={{ flex:1,minWidth:0,minHeight:0 }}>
          <ChessBoard fen={fen} onMove={onMove} flipped={flipped} disabled={disabled} getMoves={getMoves}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",width:22,paddingBottom:24 }}>
          {dRanks.map(r=>(
            <div key={r} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)" }}>{r}</div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",paddingRight:22,marginTop:5 }}>
        {dFiles.map(f=>(
          <div key={f} style={{ flex:1,textAlign:"center",
            fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)" }}>{f}</div>
        ))}
      </div>
    </div>
  );
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const RESULT_LABELS: Record<string, string> = {
  white_wins:           "Oq g'alaba qozondi (mat)",
  black_wins:           "Qora g'alaba qozondi (mat)",
  white_wins_resign:    "Oq g'alaba qozondi (raqib taslim bo'ldi)",
  black_wins_resign:    "Qora g'alaba qozondi (raqib taslim bo'ldi)",
  draw_stalemate:       "Durang (pat)",
  draw_repetition:      "Durang (takrorlanish)",
  draw_material:        "Durang (yetarli material yo'q)",
  draw:                 "Durang",
  opponent_disconnected:"Raqib o'yindan chiqdi",
};

const TIME_CONTROLS = [
  { tc:"1+0",   type:"BULLET",  color:"#ef4444" },
  { tc:"2+1",   type:"BULLET",  color:"#f97316" },
  { tc:"3+0",   type:"BLITS",   color:"#f59e0b" },
  { tc:"3+2",   type:"BLITS",   color:"#f59e0b" },
  { tc:"5+0",   type:"BLITS",   color:"#f59e0b" },
  { tc:"5+3",   type:"BLITS",   color:"#f59e0b" },
  { tc:"10+0",  type:"RAPID",   color:"#3b82f6" },
  { tc:"10+5",  type:"RAPID",   color:"#3b82f6" },
  { tc:"15+10", type:"RAPID",   color:"#3b82f6" },
  { tc:"30+0",  type:"KLASSIK", color:"#22c55e" },
  { tc:"30+20", type:"KLASSIK", color:"#22c55e" },
  { tc:"...",   type:"BOSHQA",  color:"rgba(255,255,255,.25)" },
];

const DIFF_ELO: Record<number, number> = {
  1:720, 2:840, 3:960, 4:1080, 5:1200, 6:1320, 7:1440, 8:1560, 9:1680, 10:1800,
};

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

type Status = "disconnected" | "connecting" | "lobby" | "queued" | "playing" | "finished";

interface OnlinePlayer { studentId: string; fullName: string; elo: number; inGame: boolean; }
interface IncomingChallenge { fromStudentId: string; fromName: string; fromElo: number; tc: string; tcType: string; }

/* ── Challenge notification (rasmdagi kabi) ──────────────────────────────── */
function ChallengeNotification({ ch, onAccept, onDecline }: {
  ch: IncomingChallenge;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const color = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][
    ch.fromName.charCodeAt(0) % 5
  ];
  return createPortal(
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background:"#1a1f35", border:"1.5px solid rgba(255,255,255,.18)",
      borderRadius:20, padding:"20px 22px", minWidth:300, maxWidth:340,
      boxShadow:"0 12px 48px rgba(0,0,0,.7)",
      animation:"slideInRight .25s ease",
    }}>
      <style>{`@keyframes slideInRight{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* Player info */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{
          width:46, height:46, borderRadius:13, background:color,
          display:"grid", placeItems:"center",
          fontWeight:900, fontSize:15, color:"#fff", flexShrink:0,
        }}>
          {initials(ch.fromName)}
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#fff" }}>{ch.fromName}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginTop:2 }}>
            {ch.tc} {ch.tcType} · {ch.fromElo} ELO
          </div>
        </div>
      </div>

      <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", marginBottom:16 }}>
        ✈ Sizni o'yinga chaqirmoqda!
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onDecline} style={{
          flex:1, padding:"10px", borderRadius:11,
          border:"1.5px solid rgba(239,68,68,.4)",
          background:"rgba(239,68,68,.1)", color:"#f87171",
          fontWeight:700, fontSize:13, cursor:"pointer",
        }}>
          ✕ Rad etish
        </button>
        <button onClick={onAccept} style={{
          flex:1, padding:"10px", borderRadius:11,
          border:"none", background:"#22c55e", color:"#fff",
          fontWeight:700, fontSize:13, cursor:"pointer",
        }}>
          ✓ Qabul
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ── Time control picker for challenging a player ────────────────────────── */
function ChallengePickerModal({ target, onClose, onChallenge }: {
  target: OnlinePlayer;
  onClose: () => void;
  onChallenge: (tc: string, tcType: string) => void;
}) {
  const color = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][
    target.fullName.charCodeAt(0) % 5
  ];
  return createPortal(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"grid", placeItems:"center", zIndex:2000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#1a1f35", borderRadius:22, width:420, maxWidth:"95vw", overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${color},${color}cc)`, padding:"20px 22px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(255,255,255,.2)",display:"grid",placeItems:"center",fontWeight:900,fontSize:16,color:"#fff",flexShrink:0 }}>
            {initials(target.fullName)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:17, color:"#fff" }}>{target.fullName}</div>
            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.7)", marginTop:3 }}>{target.elo} ELO · Vaqt nazoratini tanlang</div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"grid",placeItems:"center" }}>✕</button>
        </div>

        {/* TC grid */}
        <div style={{ padding:"20px 22px 26px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {TIME_CONTROLS.filter(t => t.tc !== "...").map(({ tc, type, color: c }) => (
              <button key={tc} onClick={() => onChallenge(tc, type)}
                style={{
                  padding:"18px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
                  border:`1.5px solid rgba(255,255,255,.08)`, background:"rgba(255,255,255,.04)",
                  transition:"all .12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background=`${c}18`; e.currentTarget.style.borderColor=`${c}66`; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,.08)"; }}>
                <div style={{ fontSize:26, fontWeight:900, color:c, marginBottom:4, letterSpacing:-1 }}>{tc}</div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", color:"rgba(255,255,255,.35)" }}>{type}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Computer modal ──────────────────────────────────────────────────────── */
function ComputerModal({ tc, tcType, tcColor, onClose, onStart }: {
  tc: string; tcType: string; tcColor: string;
  onClose: () => void;
  onStart: (difficulty: number, color: "white"|"random"|"black", unbeatable: boolean) => void;
}) {
  const [diff, setDiff]      = useState(3);
  const [side, setSide]      = useState<"white"|"random"|"black">("white");
  const [unbeat, setUnbeat]  = useState(false);
  const COLORS = [
    { v:"white"  as const, label:"Oq",      icon:"⚪" },
    { v:"random" as const, label:"Tasodif", icon:"🎲" },
    { v:"black"  as const, label:"Qora",    icon:"⚫" },
  ];
  return createPortal(
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",zIndex:2000 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#1a1f35",borderRadius:22,width:440,maxWidth:"95vw",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        <div style={{ background: unbeat ? "linear-gradient(135deg,#92400e,#f59e0b)" : "linear-gradient(135deg,#2563eb,#3b82f6)", padding:"20px 22px",display:"flex",alignItems:"center",gap:14,transition:"background .3s" }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(255,255,255,.2)",display:"grid",placeItems:"center",fontSize:24,flexShrink:0 }}>
            {unbeat ? "👑" : "🤖"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900,fontSize:17,color:"#fff" }}>{unbeat ? "Yengilmas rejim" : "Kompyuterga qarshi"}</div>
            <div style={{ fontSize:12.5,color:"rgba(255,255,255,.7)",marginTop:3,display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:tcColor,display:"inline-block" }}/>
              {tc} · {tcType}
            </div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"grid",placeItems:"center" }}>✕</button>
        </div>
        <div style={{ padding:"22px 22px 26px" }}>
          {/* Unbeatable toggle */}
          <button onClick={()=>setUnbeat(u=>!u)}
            style={{ width:"100%",padding:"14px 16px",borderRadius:14,marginBottom:18,border:`1.5px solid ${unbeat?"#f59e0b":"rgba(255,255,255,.1)"}`,background:unbeat?"rgba(245,158,11,.15)":"rgba(255,255,255,.04)",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .2s" }}>
            <div style={{ fontSize:28 }}>👑</div>
            <div style={{ flex:1,textAlign:"left" }}>
              <div style={{ fontWeight:800,fontSize:14,color:unbeat?"#fbbf24":"rgba(255,255,255,.8)" }}>Yengilmas rejim</div>
              <div style={{ fontSize:11.5,color:"rgba(255,255,255,.4)",marginTop:2 }}>Dunyoning eng kuchli dasturi · ~3500 ELO</div>
            </div>
            <div style={{ width:22,height:22,borderRadius:6,background:unbeat?"#f59e0b":"rgba(255,255,255,.1)",display:"grid",placeItems:"center",fontSize:14 }}>{unbeat?"✓":""}</div>
          </button>

          {/* Difficulty */}
          <div style={{ opacity:unbeat?.35:1,transition:"opacity .2s",pointerEvents:unbeat?"none":"auto" }}>
            <div style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)",marginBottom:12 }}>🖥 Kompyuter kuchi</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:22 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={()=>setDiff(n)}
                  style={{ padding:"10px 6px",borderRadius:12,border:`1.5px solid ${diff===n?"#3b82f6":"rgba(255,255,255,.1)"}`,background:diff===n?"#3b82f6":"rgba(255,255,255,.05)",cursor:"pointer",textAlign:"center",transition:"all .12s" }}>
                  <div style={{ fontSize:20,fontWeight:900,color:diff===n?"#fff":"rgba(255,255,255,.85)",lineHeight:1 }}>{n}</div>
                  <div style={{ fontSize:10,color:diff===n?"rgba(255,255,255,.8)":"rgba(255,255,255,.3)",marginTop:3 }}>{DIFF_ELO[n]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)",marginBottom:12 }}>👤 Qaysi rangda o'ynaysiz?</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24 }}>
            {COLORS.map(c => (
              <button key={c.v} onClick={()=>setSide(c.v)}
                style={{ padding:"16px 8px",borderRadius:14,border:`1.5px solid ${side===c.v?"#3b82f6":"rgba(255,255,255,.1)"}`,background:side===c.v?"rgba(37,99,235,.25)":"rgba(255,255,255,.04)",cursor:"pointer",textAlign:"center",transition:"all .12s" }}>
                <div style={{ fontSize:28,marginBottom:6 }}>{c.icon}</div>
                <div style={{ fontSize:13,fontWeight:700,color:side===c.v?"#60a5fa":"rgba(255,255,255,.7)" }}>{c.label}</div>
              </button>
            ))}
          </div>
          <button onClick={()=>onStart(diff,side,unbeat)}
            style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:unbeat?"#f59e0b":"#22c55e",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer" }}>
            {unbeat ? "👑 Yengilmas rejimda boshlash" : "▶ O'yinni boshlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Custom time modal ───────────────────────────────────────────────────── */
function CustomTimeModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (tc: string, type: string, color: string) => void;
}) {
  const [mins, setMins] = useState(10);
  const [incr, setIncr] = useState(0);
  const tc    = `${mins}+${incr}`;
  const type  = mins<=2?"BULLET":mins<=5?"BLITS":mins<=15?"RAPID":"KLASSIK";
  const color = mins<=2?"#ef4444":mins<=5?"#f59e0b":mins<=15?"#3b82f6":"#22c55e";
  return createPortal(
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"grid",placeItems:"center",zIndex:2000 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#1a1f35",borderRadius:22,width:400,maxWidth:"95vw",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.6)" }}>
        <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)",padding:"20px 22px",display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(255,255,255,.2)",display:"grid",placeItems:"center",fontSize:24 }}>⏱</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900,fontSize:17,color:"#fff" }}>Maxsus vaqt nazorati</div>
            <div style={{ fontSize:12.5,color:"rgba(255,255,255,.7)",marginTop:3 }}>Vaqtni o'zingiz belgilang</div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"grid",placeItems:"center" }}>✕</button>
        </div>
        <div style={{ padding:"22px 22px 26px" }}>
          <div style={{ textAlign:"center",marginBottom:22,padding:"16px",borderRadius:14,background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize:36,fontWeight:900,color,letterSpacing:-1,lineHeight:1 }}>{tc}</div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,.4)",marginTop:6 }}>{type}</div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)" }}>⏱ Daqiqa</span>
              <span style={{ fontSize:14,fontWeight:900,color:"#fff" }}>{mins}</span>
            </div>
            <input type="range" min={1} max={60} value={mins} onChange={e=>setMins(Number(e.target.value))}
              style={{ width:"100%",accentColor:color,cursor:"pointer" }} />
          </div>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)" }}>➕ Qo'shimcha (son)</span>
              <span style={{ fontSize:14,fontWeight:900,color:"#fff" }}>{incr}</span>
            </div>
            <input type="range" min={0} max={30} value={incr} onChange={e=>setIncr(Number(e.target.value))}
              style={{ width:"100%",accentColor:color,cursor:"pointer" }} />
          </div>
          <button onClick={()=>onConfirm(tc,type,color)}
            style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${color},${color}cc)`,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer" }}>
            ✓ Tasdiqlash — {tc} {type}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Lobby screen ────────────────────────────────────────────────────────── */
function LobbyScreen({ status, onlinePlayers, myElo, onJoinQueue, onChallenge, onComputerGame, challengeSent }: {
  status: Status;
  onlinePlayers: OnlinePlayer[];
  myElo: number;
  onJoinQueue: () => void;
  onChallenge: (p: OnlinePlayer) => void;
  onComputerGame: (tc: string, type: string, color: string) => void;
  challengeSent: string | null;
}) {
  const navigate = useNavigate();
  const [computerModal, setComputerModal] = useState<{tc:string;type:string;color:string}|null>(null);
  const [customTime, setCustomTime] = useState(false);

  const available = onlinePlayers.filter(p => !p.inGame);
  const inGame    = onlinePlayers.filter(p => p.inGame);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* My ELO + Queue button */}
      <div style={{ display:"flex", alignItems:"center", gap:12,
        background:"rgba(255,255,255,.04)", border:"1.5px solid rgba(255,255,255,.08)",
        borderRadius:16, padding:"16px 20px" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginBottom:3 }}>Sizning reytingiz</div>
          <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>{myElo} <span style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>ELO</span></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block" }}/>
          <span style={{ fontSize:13, color:"#4ade80", fontWeight:600 }}>Online</span>
        </div>
        <button onClick={onJoinQueue}
          style={{ padding:"10px 22px", borderRadius:12, border:"none",
            background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
            color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          🔍 Raqib qidirish
        </button>
      </div>

      {/* Time controls */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"rgba(99,102,241,.2)",border:"1px solid rgba(99,102,241,.3)",display:"grid",placeItems:"center",fontSize:18 }}>⏱</div>
          <div>
            <div style={{ fontWeight:800,fontSize:15 }}>Vaqt nazoratini tanlang</div>
            <div style={{ fontSize:12.5,color:"rgba(255,255,255,.4)",marginTop:2 }}>O'yin turini bosib kompyuterga qarshi o'ynang</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)" }}>
          {TIME_CONTROLS.map(({ tc, type, color }, i) => {
            const isLast = tc === "...";
            return (
              <button key={tc}
                onClick={()=>{ if(isLast){ setCustomTime(true); } else { setComputerModal({tc,type,color}); } }}
                style={{ padding:"20px 16px",textAlign:"center",cursor:"pointer",background:"transparent",
                  borderTop:i>=3?"1px solid rgba(255,255,255,.06)":"none",
                  borderLeft:i%3!==0?"1px solid rgba(255,255,255,.06)":"none",
                  borderRight:"none",borderBottom:"none",transition:"background .15s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background=isLast?"rgba(99,102,241,.1)":`${color}10`; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background="transparent"; }}>
                {isLast
                  ? <div style={{ fontSize:22,fontWeight:900,color:"rgba(255,255,255,.5)",letterSpacing:4,marginBottom:6 }}>· · ·</div>
                  : <div style={{ fontSize:30,fontWeight:900,color,marginBottom:5,lineHeight:1,letterSpacing:-1 }}>{tc}</div>
                }
                <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,.35)" }}>{type}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Online players */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", borderRadius:18, overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.25)",display:"grid",placeItems:"center",fontSize:18 }}>👥</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,fontSize:15 }}>Online o'yinchilar</div>
            <div style={{ fontSize:12.5,color:"rgba(255,255,255,.4)",marginTop:2 }}>Taklif yuboring va o'ynang</div>
          </div>
          <div style={{ padding:"4px 12px",borderRadius:99,background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.3)",fontSize:12,fontWeight:700,color:"#4ade80" }}>
            {onlinePlayers.length} online
          </div>
        </div>

        {onlinePlayers.length === 0 ? (
          <div style={{ padding:"32px 20px",textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:13 }}>
            Hozir online o'yinchilar yo'q — biroz kutib turing
          </div>
        ) : (
          <div>
            {/* Available players */}
            {available.map((p, i) => {
              const avatarColor = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][p.fullName.charCodeAt(0) % 5];
              const isSent = challengeSent === p.studentId;
              return (
                <div key={p.studentId} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderTop:i>0?"1px solid rgba(255,255,255,.06)":"none" }}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:42,height:42,borderRadius:12,background:avatarColor,display:"grid",placeItems:"center",fontSize:14,fontWeight:800,color:"#fff" }}>
                      {initials(p.fullName)}
                    </div>
                    <span style={{ position:"absolute",bottom:0,right:0,width:11,height:11,borderRadius:"50%",background:"#4ade80",border:"2px solid #1a1f35" }}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:14 }}>{p.fullName}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2 }}>{p.elo} ELO</div>
                  </div>
                  {isSent ? (
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",fontStyle:"italic" }}>Taklif yuborildi...</div>
                  ) : (
                    <button onClick={()=>onChallenge(p)}
                      style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#3b82f6)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer" }}>
                      ✈ O'ynash
                    </button>
                  )}
                </div>
              );
            })}

            {/* In-game players */}
            {inGame.length > 0 && (
              <div style={{ borderTop:"1px solid rgba(255,255,255,.06)" }}>
                <div style={{ padding:"8px 20px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"0.08em" }}>O'YINDA</div>
                {inGame.map((p, i) => {
                  const avatarColor = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][p.fullName.charCodeAt(0) % 5];
                  return (
                    <div key={p.studentId} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 20px",opacity:0.5,borderTop:i>0?"1px solid rgba(255,255,255,.04)":"none" }}>
                      <div style={{ width:42,height:42,borderRadius:12,background:avatarColor,display:"grid",placeItems:"center",fontSize:14,fontWeight:800,color:"#fff" }}>
                        {initials(p.fullName)}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:14 }}>{p.fullName}</div>
                        <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2 }}>{p.elo} ELO</div>
                      </div>
                      <div style={{ fontSize:12,color:"rgba(255,255,255,.3)" }}>⚔ O'yinda</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {customTime && (
        <CustomTimeModal
          onClose={()=>setCustomTime(false)}
          onConfirm={(tc,type,color)=>{ setCustomTime(false); setComputerModal({tc,type,color}); }}
        />
      )}

      {computerModal && (
        <ComputerModal
          tc={computerModal.tc} tcType={computerModal.type} tcColor={computerModal.color}
          onClose={()=>setComputerModal(null)}
          onStart={(diff,color,unbeatable)=>{
            setComputerModal(null);
            const gameState: PvpGameState = {
              tc:computerModal.tc, tcType:computerModal.type, tcColor:computerModal.color,
              difficulty:diff, playerColor:color,
              computerElo:unbeatable?3500:(DIFF_ELO[diff]??960),
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
  const accessToken = useAuthStore(s => s.accessToken);
  const [status,           setStatus]           = useState<Status>("disconnected");
  const [color,            setColor]            = useState<"w"|"b"|null>(null);
  const [opponent,         setOpponent]         = useState<string|null>(null);
  const [opponentElo,      setOpponentElo]      = useState<number>(1200);
  const [fen,              setFen]              = useState(START_FEN);
  const [error,            setError]            = useState<string|null>(null);
  const [result,           setResult]           = useState<string|null>(null);
  const [myElo,            setMyElo]            = useState(1200);
  const [onlinePlayers,    setOnlinePlayers]    = useState<OnlinePlayer[]>([]);
  const [incomingChallenge,setIncomingChallenge]= useState<IncomingChallenge|null>(null);
  const [challengeTarget,  setChallengeTarget]  = useState<OnlinePlayer|null>(null);
  const [challengeSent,    setChallengeSent]    = useState<string|null>(null);
  const [gameTc,           setGameTc]           = useState<string|null>(null);
  const [gameTcType,       setGameTcType]       = useState<string|null>(null);
  const [moves,            setMoves]            = useState<string[]>([]);
  const [turn,             setTurn]             = useState<"w"|"b">("w");
  const [mySeconds,        setMySeconds]        = useState(300);
  const [opSeconds,        setOpSeconds]        = useState(300);
  const wsRef    = useRef<WebSocket|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const boardColRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardSizePvp(boardColRef);

  /* ── Auto-connect on mount ── */
  useEffect(() => {
    if (!accessToken) return;
    connect();
    return () => { wsRef.current?.close(); };
  }, [accessToken]);

  function connect() {
    if (wsRef.current && wsRef.current.readyState <= 1) return; // already connecting/open
    setStatus("connecting");
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/ws/pvp?token=${encodeURIComponent(accessToken ?? "")}`);
    wsRef.current = ws;

    ws.onopen    = () => {};
    ws.onerror   = () => { setError("Ulanishda xatolik"); setStatus("disconnected"); };
    ws.onclose   = () => {
      setOnlinePlayers([]);
      setStatus(s => s === "playing" ? "finished" : "disconnected");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "connected":
          setMyElo(msg.myElo ?? 1200);
          setStatus("lobby");
          break;
        case "online_list":
          setOnlinePlayers(msg.players ?? []);
          break;
        case "queued":
          setStatus("queued");
          break;
        case "left_queue":
          setStatus("lobby");
          break;
        case "challenge_received":
          setIncomingChallenge({ fromStudentId:msg.fromStudentId, fromName:msg.fromName, fromElo:msg.fromElo??1200, tc:msg.tc??"5+0", tcType:msg.tcType??"BLITS" });
          break;
        case "challenge_accepted":
          setChallengeSent(null);
          break;
        case "challenge_declined":
          setChallengeSent(null);
          setError(`${msg.byName} taklifni rad etdi`);
          setTimeout(() => setError(null), 3000);
          break;
        case "matched": {
          const secs = tcToSeconds(msg.tc ?? "5+0");
          setIncomingChallenge(null);
          setChallengeSent(null);
          setColor(msg.color);
          setOpponent(msg.opponent ?? null);
          setOpponentElo(msg.opponentElo ?? 1200);
          setFen(msg.fen ?? START_FEN);
          setGameTc(msg.tc ?? null);
          setGameTcType(msg.tcType ?? null);
          setStatus("playing");
          setResult(null);
          setError(null);
          setMoves([]);
          setTurn("w");
          setMySeconds(secs);
          setOpSeconds(secs);
          break;
        }
        case "move":
          setFen(msg.fen);
          setTurn(msg.turn ?? "w");
          setMoves(m => [...m, `${msg.from}${msg.to}`]);
          if (msg.gameOver) { setResult(msg.result); setStatus("finished"); }
          break;
        case "ended":
          setResult(msg.reason);
          setStatus("finished");
          break;
        case "error":
          setError(msg.message);
          break;
      }
    };
  }

  function joinQueue() {
    wsRef.current?.send(JSON.stringify({ type:"join_queue" }));
  }

  function leaveQueue() {
    wsRef.current?.send(JSON.stringify({ type:"leave_queue" }));
  }

  function sendChallenge(target: OnlinePlayer, tc: string, tcType: string) {
    setChallengeTarget(null);
    setChallengeSent(target.studentId);
    wsRef.current?.send(JSON.stringify({ type:"challenge", targetStudentId:target.studentId, tc, tcType }));
  }

  function respondChallenge(accept: boolean) {
    if (!incomingChallenge) return;
    wsRef.current?.send(JSON.stringify({
      type: accept ? "challenge_accept" : "challenge_decline",
      fromStudentId: incomingChallenge.fromStudentId,
    }));
    setIncomingChallenge(null);
  }

  function handleMove(from: string, to: string) {
    setError(null);
    wsRef.current?.send(JSON.stringify({ type:"move", from, to, promotion:"q" }));
  }

  function resign() {
    wsRef.current?.send(JSON.stringify({ type:"resign" }));
  }

  /* ── Timer ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (status !== "playing") return;
    const isMyTurn = turn === color;
    timerRef.current = setInterval(() => {
      if (isMyTurn) {
        setMySeconds(s => { if (s <= 1) { resign(); return 0; } return s - 1; });
      } else {
        setOpSeconds(s => Math.max(0, s - 1));
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, turn, color]);

  function playAgain() {
    setFen(START_FEN);
    setColor(null);
    setOpponent(null);
    setResult(null);
    setError(null);
    setMoves([]);
    setStatus("lobby");
  }

  return (
    <div>
      {/* Incoming challenge notification */}
      {incomingChallenge && (
        <ChallengeNotification
          ch={incomingChallenge}
          onAccept={() => respondChallenge(true)}
          onDecline={() => respondChallenge(false)}
        />
      )}

      {/* Challenge picker modal */}
      {challengeTarget && (
        <ChallengePickerModal
          target={challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onChallenge={(tc, tcType) => sendChallenge(challengeTarget, tc, tcType)}
        />
      )}

      {/* Disconnected */}
      {status === "disconnected" && (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:"64px 20px",
          background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:18 }}>
          <div style={{ fontSize:40 }}>📡</div>
          <div style={{ fontWeight:800,fontSize:17 }}>Ulanilmagan</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,.45)" }}>Server bilan aloqa o'rnatib bo'lmadi</div>
          {error && <div style={{ fontSize:12,color:"#f87171" }}>{error}</div>}
          <button onClick={connect}
            style={{ padding:"11px 28px",borderRadius:12,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,cursor:"pointer" }}>
            Qayta ulanish
          </button>
        </div>
      )}

      {/* Connecting */}
      {status === "connecting" && (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:"64px 20px" }}>
          <div style={{ width:40,height:40,borderRadius:"50%",border:"3px solid rgba(255,255,255,.15)",borderTopColor:"#3b82f6",animation:"spin .8s linear infinite" }}/>
          <div style={{ fontSize:14,color:"rgba(255,255,255,.5)" }}>Serverga ulanilmoqda...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Lobby */}
      {(status === "lobby") && (
        <LobbyScreen
          status={status}
          onlinePlayers={onlinePlayers}
          myElo={myElo}
          onJoinQueue={joinQueue}
          onChallenge={p => setChallengeTarget(p)}
          onComputerGame={() => {}}
          challengeSent={challengeSent}
        />
      )}

      {/* Queued */}
      {status === "queued" && (
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:18,padding:"48px 24px",textAlign:"center" }}>
            <div style={{ fontSize:40,marginBottom:16 }}>⏳</div>
            <div style={{ fontWeight:800,fontSize:18,marginBottom:8 }}>Raqib qidirilmoqda...</div>
            <div style={{ fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:24 }}>
              Siz navbatdasisiz. Yaqin ELOli raqib topilganda o'yin boshlanadi.
            </div>
            <button onClick={leaveQueue}
              style={{ padding:"10px 24px",borderRadius:10,border:"1.5px solid rgba(255,255,255,.15)",background:"transparent",color:"rgba(255,255,255,.7)",fontWeight:700,cursor:"pointer",fontSize:14 }}>
              Bekor qilish
            </button>
          </div>
          {/* Still show online players while queued */}
          {onlinePlayers.length > 0 && (
            <div style={{ background:"rgba(255,255,255,.03)",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:18,overflow:"hidden" }}>
              <div style={{ padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,.07)",fontWeight:700,fontSize:14,color:"rgba(255,255,255,.5)" }}>
                Online o'yinchilar ({onlinePlayers.length})
              </div>
              {onlinePlayers.filter(p=>!p.inGame).map((p,i) => {
                const avatarColor = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e"][p.fullName.charCodeAt(0)%5];
                return (
                  <div key={p.studentId} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 20px",borderTop:i>0?"1px solid rgba(255,255,255,.06)":"none" }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:avatarColor,display:"grid",placeItems:"center",fontSize:12,fontWeight:800,color:"#fff" }}>
                      {initials(p.fullName)}
                    </div>
                    <div style={{ flex:1,fontWeight:600,fontSize:13 }}>{p.fullName}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>{p.elo} ELO</div>
                    <button onClick={()=>{ leaveQueue(); setChallengeTarget(p); }}
                      style={{ padding:"6px 14px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                      Chaqirish
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Playing / Finished — PvpGamePage uslubida */}
      {(status === "playing" || status === "finished") && (
        <div style={{ display:"flex",gap:16,height:"calc(100vh - 220px)",overflow:"hidden" }}>
          {/* Board column */}
          <div ref={boardColRef} style={{ flex:1,minWidth:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:boardSize,height:boardSize,flexShrink:0 }}>
              <PvpBoardWithCoords
                fen={fen}
                onMove={handleMove}
                flipped={color === "b"}
                disabled={status !== "playing" || turn !== color}
                getMoves={sq => {
                  try { return new Chess(fen).moves({ square:sq as import("chess.js").Square, verbose:true }).map((m:{to:string})=>m.to); }
                  catch { return []; }
                }}
              />
            </div>
          </div>

          {/* Right panel */}
          <div style={{ width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:10,overflowY:"auto" }}>
            {/* Opponent card */}
            <PvpPlayerCard
              name={opponent ?? "Raqib"}
              elo={opponentElo}
              seconds={opSeconds}
              isActive={turn !== color}
            />

            {/* Turn indicator */}
            <div style={{ padding:"12px 16px",background:"rgba(255,255,255,.04)",
              border:"1.5px solid rgba(255,255,255,.09)",borderRadius:12,
              display:"flex",alignItems:"center",gap:10,fontWeight:700,fontSize:14 }}>
              <div style={{ width:16,height:16,borderRadius:4,flexShrink:0,
                background:turn==="w"?"#fff":"#1a1a2e",
                border:turn==="b"?"2px solid rgba(255,255,255,.4)":"none" }}/>
              {turn==="w" ? "Oq o'ynaydi" : "Qora o'ynaydi"}
              {gameTc && <span style={{ marginLeft:"auto",fontSize:11,fontWeight:600,color:"rgba(255,255,255,.35)" }}>{gameTc} {gameTcType}</span>}
            </div>

            {/* Move history */}
            <div style={{ padding:"12px 16px",background:"rgba(255,255,255,.04)",
              border:"1.5px solid rgba(255,255,255,.09)",borderRadius:12,
              minHeight:80,maxHeight:160,overflowY:"auto",flex:1 }}>
              {moves.length === 0 ? (
                <div style={{ color:"rgba(255,255,255,.25)",fontSize:13,textAlign:"center",paddingTop:16 }}>
                  Hali yurish yo'q
                </div>
              ) : (
                <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                  {moves.map((m,i)=>(
                    <span key={i} style={{ fontSize:11,fontWeight:600,padding:"2px 7px",
                      borderRadius:6,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.7)" }}>
                      {i%2===0?`${Math.floor(i/2)+1}.`:""}{m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Result */}
            {result && (
              <div style={{ padding:"10px 14px",borderRadius:12,
                background:"rgba(34,197,94,.15)",border:"1px solid rgba(34,197,94,.3)",
                color:"#4ade80",fontSize:13,fontWeight:700,textAlign:"center" }}>
                {RESULT_LABELS[result] ?? result}
              </div>
            )}
            {error && (
              <div style={{ padding:"8px 12px",borderRadius:10,
                background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",
                color:"#f87171",fontSize:13 }}>
                {error}
              </div>
            )}

            {/* Action button */}
            {status === "playing" ? (
              <button onClick={resign}
                style={{ padding:"12px",borderRadius:12,
                  border:"1.5px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.1)",
                  color:"#f87171",fontWeight:700,cursor:"pointer",fontSize:14,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                🏳 Taslim bo'lish
              </button>
            ) : (
              <button onClick={playAgain}
                style={{ padding:"12px",borderRadius:12,border:"none",
                  background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                  color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14 }}>
                ♟ Yana o'ynash
              </button>
            )}

            {/* My card */}
            <PvpPlayerCard
              name="Siz"
              elo={myElo}
              seconds={mySeconds}
              isMe
              isActive={turn === color}
            />
          </div>
        </div>
      )}
    </div>
  );
}
