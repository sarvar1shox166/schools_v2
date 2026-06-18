import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── Types ───────────────────────────────────────────────────────────────── */
type LessonState = "progress" | "active" | "locked";

interface Lesson {
  id: string;
  title: string;
  desc: string;
  icon: string;
  iconColor: string;
  done: number;
  total: number;
  state: LessonState;
}

interface Section {
  title: string;
  lessons: Lesson[];
}

/* ── Data ────────────────────────────────────────────────────────────────── */
const ASOSLAR: Section[] = [
  {
    title: "SHAXMAT DONALARI",
    lessons: [
      { id:"rux",      title:"Rux",              desc:"Rux to'g'ri chiziq bo'yicha harakatlanadi", icon:"♜", iconColor:"rgba(255,255,255,.55)", done:3, total:6, state:"progress" },
      { id:"fil",      title:"Fil",              desc:"Fil diagonal bo'yicha harakatlanadi",        icon:"♝", iconColor:"rgba(255,255,255,.55)", done:2, total:6, state:"progress" },
      { id:"farzin",   title:"Farzin",           desc:"Farzin = rux + fil",                         icon:"♛", iconColor:"rgba(255,255,255,.55)", done:1, total:5, state:"progress" },
      { id:"shoh",     title:"Shoh",             desc:"Eng muhim dona",                              icon:"♚", iconColor:"rgba(255,255,255,.3)",  done:0, total:5, state:"locked"   },
      { id:"ot",       title:"Ot",               desc:"Ot \"L\" shaklida harakatlanadi",             icon:"♞", iconColor:"rgba(255,255,255,.3)",  done:0, total:6, state:"locked"   },
      { id:"piyoda",   title:"Piyoda",           desc:"Faqat oldinga yuradi",                        icon:"♟", iconColor:"rgba(255,255,255,.3)",  done:0, total:5, state:"locked"   },
    ],
  },
  {
    title: "ASOSIY PRINSIPLAR",
    lessons: [
      { id:"urib",     title:"Urib olish",       desc:"Raqib donalarini urib oling",            icon:"⚔️", iconColor:"#e879a0", done:2, total:5, state:"progress" },
      { id:"himoya",   title:"Himoya",           desc:"Donalaringizni ehtiyot qiling",           icon:"🛡️", iconColor:"#60a5fa", done:2, total:8, state:"progress" },
      { id:"jang",     title:"Jang",             desc:"Donalarni urib olish va himoya qilish",   icon:"⚡", iconColor:"#fb923c", done:0, total:6, state:"locked"   },
      { id:"shohber",  title:"Shoh berish",      desc:"Raqib shohiga hujum qiling",              icon:"👑", iconColor:"#fbbf24", done:0, total:5, state:"locked"   },
      { id:"qutulish", title:"Shohdan qutulish", desc:"Shohingizni himoya qiling",               icon:"🛡️", iconColor:"#3b82f6", done:6, total:7, state:"active"   },
      { id:"mot",      title:"Mot berish",       desc:"Raqib shohini taslim qiling",             icon:"♟", iconColor:"rgba(255,255,255,.55)", done:6, total:7, state:"progress" },
    ],
  },
  {
    title: "O'RTA DARAJA",
    lessons: [
      { id:"taxt",     title:"Taxtani terish",         desc:"O'yin qanday boshlanadi",       icon:"♟", iconColor:"rgba(255,255,255,.3)",  done:0, total:5, state:"locked" },
      { id:"rok",      title:"Rokirovka",              desc:"Shohning maxsus yurishi",        icon:"🏰", iconColor:"#f87171", done:0, total:4, state:"locked" },
      { id:"kesib",    title:"Kesib o'tish",           desc:"Piyodaning maxsus yurishi",      icon:"🔴", iconColor:"#f87171", done:0, total:5, state:"locked" },
      { id:"pat",      title:"Pat",                    desc:"O'yin — durang",                 icon:"⚖️", iconColor:"#fbbf24", done:0, total:4, state:"locked" },
    ],
  },
  {
    title: "YUQORI DARAJA",
    lessons: [
      { id:"dona",     title:"Donalar qiymati",        desc:"Donalar kuchini baholang",       icon:"💎", iconColor:"#60a5fa", done:0, total:6, state:"locked" },
      { id:"ikki",     title:"Ikki yurishda shoh berish", desc:"Shoh berish uchun ikki yurish", icon:"⚔️", iconColor:"#e879a0", done:0, total:5, state:"locked" },
    ],
  },
];

const MASHQ: Section[] = [
  {
    title: "TAKTIK MASHQLAR",
    lessons: [
      { id:"fork",    title:"Vilka",         desc:"Bir vaqtda ikki donaga hujum",       icon:"⚡", iconColor:"#fb923c", done:4, total:10, state:"progress" },
      { id:"pin",     title:"Mixlash",       desc:"Donani o'rnidan qimirlatma",         icon:"📌", iconColor:"#f87171", done:2, total:8,  state:"progress" },
      { id:"skewer",  title:"Cho'g'ir",      desc:"Qimmatli donani siqishtirish",       icon:"🎯", iconColor:"#60a5fa", done:0, total:7,  state:"locked"   },
      { id:"disc",    title:"Kashf hujum",   desc:"Yashirin hujumni ochish",            icon:"👁️", iconColor:"#a78bfa", done:0, total:6,  state:"locked"   },
    ],
  },
  {
    title: "OXIRGI O'YIN",
    lessons: [
      { id:"kpawn",   title:"Shoh va piyoda", desc:"Piyodani malika qilish",            icon:"♟", iconColor:"rgba(255,255,255,.3)", done:0, total:6, state:"locked" },
      { id:"rend",    title:"Rux endshpili",  desc:"Rux bilan g'alaba",                 icon:"♜", iconColor:"rgba(255,255,255,.3)", done:0, total:5, state:"locked" },
    ],
  },
];

const KOORDINATLAR: Section[] = [
  {
    title: "ASOSIY",
    lessons: [
      { id:"files",   title:"Ustunlar (a–h)",  desc:"Taxtaning vertikal chiziqlari",    icon:"🔤", iconColor:"#60a5fa", done:3, total:5, state:"progress" },
      { id:"ranks",   title:"Qatorlar (1–8)",  desc:"Taxtaning gorizontal chiziqlari",  icon:"🔢", iconColor:"#34d399", done:2, total:5, state:"progress" },
      { id:"squares", title:"Katak nomi",      desc:"a1 dan h8 gacha",                  icon:"♟", iconColor:"rgba(255,255,255,.3)", done:0, total:8, state:"locked" },
    ],
  },
  {
    title: "MASHQ",
    lessons: [
      { id:"speed",   title:"Tezlik testi",   desc:"30 soniyada qancha katakni topasiz", icon:"⏱️", iconColor:"#f59e0b", done:0, total:5, state:"locked" },
      { id:"blind",   title:"Ko'r o'yin",     desc:"Taxtasiz o'ynash",                   icon:"👁️", iconColor:"#a78bfa", done:0, total:4, state:"locked" },
    ],
  },
];

const TAB_DATA: Record<string, Section[]> = {
  asoslar:       ASOSLAR,
  mashq:         MASHQ,
  koordinatlar:  KOORDINATLAR,
};

const TABS = [
  { v:"asoslar",      label:"Shaxmat asoslari", emoji:"🟣" },
  { v:"mashq",        label:"Mashq",            emoji:"⚡" },
  { v:"koordinatlar", label:"Koordinatlar",     emoji:"📍" },
];

/* ── Card styles ─────────────────────────────────────────────────────────── */
function cardStyle(state: LessonState): React.CSSProperties {
  if (state === "active")
    return { background:"linear-gradient(135deg,rgba(245,158,11,.22) 0%,rgba(251,191,36,.12) 100%)", border:"1.5px solid rgba(245,158,11,.45)", borderRadius:16, padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden" };
  if (state === "progress")
    return { background:"linear-gradient(135deg,rgba(63,140,255,.18) 0%,rgba(99,149,220,.1) 100%)", border:"1.5px solid rgba(63,140,255,.22)", borderRadius:16, padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden" };
  return { background:"rgba(255,255,255,.025)", border:"1.5px solid rgba(255,255,255,.07)", borderRadius:16, padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden" };
}

function iconBoxStyle(state: LessonState): React.CSSProperties {
  if (state === "active")   return { width:48, height:48, borderRadius:13, background:"rgba(245,158,11,.25)", border:"1px solid rgba(245,158,11,.35)", display:"grid", placeItems:"center", fontSize:22, flexShrink:0 };
  if (state === "progress") return { width:48, height:48, borderRadius:13, background:"rgba(63,140,255,.18)", border:"1px solid rgba(63,140,255,.22)", display:"grid", placeItems:"center", fontSize:22, flexShrink:0 };
  return { width:48, height:48, borderRadius:13, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)", display:"grid", placeItems:"center", fontSize:22, flexShrink:0 };
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHead({ title }: { title: string }) {
  const spaced = title.split("").join(" ");
  return (
    <div style={{ textAlign:"center", padding:"28px 0 14px", fontSize:11, fontWeight:700, letterSpacing:"0.18em", color:"rgba(255,255,255,.3)", userSelect:"none" }}>
      {spaced}
    </div>
  );
}

/* ── Lesson card ─────────────────────────────────────────────────────────── */
function LessonCard({ lesson }: { lesson: Lesson }) {
  const navigate = useNavigate();
  const pct = lesson.total > 0 ? (lesson.done / lesson.total) * 100 : 0;
  const isActive = lesson.state === "active";

  return (
    <div style={cardStyle(lesson.state)} onClick={()=>navigate(`/student/learn/${lesson.id}`)}>
      {/* top-right counter or sparkle */}
      {isActive ? (
        <div style={{ position:"absolute", top:12, right:14, fontSize:14 }}>✨</div>
      ) : lesson.done > 0 ? (
        <div style={{ position:"absolute", top:10, right:12, fontSize:11, fontWeight:800, color:"rgba(255,255,255,.35)" }}>
          {lesson.done}/{lesson.total}
        </div>
      ) : null}

      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:lesson.done>0||isActive?12:0 }}>
        <div style={iconBoxStyle(lesson.state)}>
          <span style={{ color: lesson.iconColor, fontSize:20, lineHeight:1 }}>{lesson.icon}</span>
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:15, color: isActive ? "#fbbf24" : lesson.state==="locked" ? "rgba(255,255,255,.4)" : "#fff", marginBottom:3 }}>
            {lesson.title}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", lineHeight:1.4 }}>{lesson.desc}</div>
        </div>
      </div>

      {/* Progress bar */}
      {(lesson.done > 0 || isActive) && (
        <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,.1)", overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99, width:`${pct}%`,
            background: isActive ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#3b82f6,#60a5fa)",
            transition:"width .4s" }} />
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LearnPage() {
  const [tab, setTab] = useState("asoslar");
  const sections = TAB_DATA[tab] ?? [];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        {TABS.map(t => (
          <button key={t.v} onClick={()=>setTab(t.v)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 20px", borderRadius:99, border:"none", cursor:"pointer", fontWeight:700, fontSize:13.5, transition:"background .15s",
              background: tab===t.v ? "linear-gradient(135deg,#6d28d9,#7c3aed)" : "rgba(255,255,255,.07)",
              color: tab===t.v ? "#fff" : "rgba(255,255,255,.45)" }}>
            <span style={{ fontSize:15 }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.title}>
          <SectionHead title={section.title} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {section.lessons.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
