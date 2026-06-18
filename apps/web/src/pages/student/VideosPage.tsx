import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@chess-school/ui";
import { useVideos, useUpdateVideoProgress, type VideoLesson } from "../../lib/queries.js";
import type { VideoWatchState } from "./VideoWatchPage.js";

/* ── Demo course data ─────────────────────────────────────────────────────── */
interface Course {
  id: string;
  title: string;
  description: string;
  totalLessons: number;
  watchedLessons: number;
  views: number;
  teacher: string;
  isNew: boolean;
  gradient: string;
  category: string;
}

const DEMO_COURSES: Course[] = [
  {
    id:"c1", title:"Shaxmatni 0 dan boshlash",
    description:"Shaxmat asoslarini noldan o'rganish kursi. Donalarning yurishlari, asosiy qoidalar, oddiy taktikalar va o'yin strategiyasi bilan tanishasiz.",
    totalLessons:12, watchedLessons:2, views:1240, teacher:"A.Karimov",
    isNew:false, category:"boshlangich",
    gradient:"linear-gradient(135deg,#7c1d1d 0%,#991b1b 50%,#b91c1c 100%)",
  },
  {
    id:"c2", title:"Debyutlar",
    description:"Shaxmat debyutlari strategiyasi va nazariyasi. Italyan ochilishi, Ispaniya gambiti va boshqa mashhur ochilishlarni o'rganing.",
    totalLessons:12, watchedLessons:0, views:850, teacher:"A.Karimov",
    isNew:true, category:"boshlangich",
    gradient:"linear-gradient(135deg,#1e3a5f 0%,#1565c0 60%,#1e88e5 100%)",
  },
];

const DEMO_ZOOM_COURSES: Course[] = [
  {
    id:"z1", title:"Zoom dars — Iyun 2026",
    description:"Iyun oyidagi barcha jonli darslar yozuvlari. Murabbiy bilan muloqot va mashqlar.",
    totalLessons:8, watchedLessons:5, views:320, teacher:"A.Karimov",
    isNew:false, category:"zoom",
    gradient:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
  },
];

interface DemoVideo { id:string; title:string; duration:string; watched:boolean; gradient:string; }

const DEMO_VIDEOS: Record<string, DemoVideo[]> = {
  c1:[
    { id:"v1", title:"1-dars: Shaxmat taxtasi va donalar", duration:"12:30", watched:true,  gradient:"linear-gradient(135deg,#1e3a5f,#1565c0)" },
    { id:"v2", title:"2-dars: Piyodaning yurishi",         duration:"10:15", watched:true,  gradient:"linear-gradient(135deg,#4c1d95,#7c3aed)" },
    { id:"v3", title:"3-dars: Filning yurishi",            duration:"11:40", watched:false, gradient:"linear-gradient(135deg,#064e3b,#059669)" },
    { id:"v4", title:"4-dars: Otning yurishi",             duration:"9:20",  watched:false, gradient:"linear-gradient(135deg,#78350f,#d97706)" },
    { id:"v5", title:"5-dars: Rookning yurishi",           duration:"13:05", watched:false, gradient:"linear-gradient(135deg,#7c1d1d,#dc2626)" },
    { id:"v6", title:"6-dars: Malika va Shoh",             duration:"14:30", watched:false, gradient:"linear-gradient(135deg,#1e1b4b,#4f46e5)" },
    { id:"v7", title:"7-dars: Shoh xavfsizligi",           duration:"10:55", watched:false, gradient:"linear-gradient(135deg,#134e4a,#0f766e)" },
    { id:"v8", title:"8-dars: Pat va mat",                 duration:"8:40",  watched:false, gradient:"linear-gradient(135deg,#3b0764,#7e22ce)" },
  ],
  c2:[
    { id:"d1", title:"1-dars: Debyut nima?",        duration:"8:45",  watched:false, gradient:"linear-gradient(135deg,#1e3a5f,#1565c0)" },
    { id:"d2", title:"2-dars: Italyan ochilishi",   duration:"15:20", watched:false, gradient:"linear-gradient(135deg,#4c1d95,#7c3aed)" },
    { id:"d3", title:"3-dars: Ispaniya gambiti",    duration:"12:10", watched:false, gradient:"linear-gradient(135deg,#064e3b,#059669)" },
    { id:"d4", title:"4-dars: Siciliya himoyasi",   duration:"14:00", watched:false, gradient:"linear-gradient(135deg,#78350f,#d97706)" },
  ],
  z1:[
    { id:"z1v1", title:"Zoom #1 — Ochilishlar",     duration:"54:20", watched:true,  gradient:"linear-gradient(135deg,#0f2027,#2c5364)" },
    { id:"z1v2", title:"Zoom #2 — Taktik mashqlar", duration:"48:15", watched:true,  gradient:"linear-gradient(135deg,#1a1a2e,#16213e)" },
    { id:"z1v3", title:"Zoom #3 — Endshpil asoslari", duration:"51:40", watched:false, gradient:"linear-gradient(135deg,#0d1b2a,#1b2a3b)" },
  ],
};

const TABS = [
  { v:"boshlangich", label:"Boshlang'ich" },
  { v:"zoom",        label:"Zoom yozuvlari" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtSec(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

const GRAD_PALETTE = [
  "linear-gradient(135deg,#1e3a5f,#1565c0)",
  "linear-gradient(135deg,#4c1d95,#7c3aed)",
  "linear-gradient(135deg,#064e3b,#059669)",
  "linear-gradient(135deg,#78350f,#d97706)",
  "linear-gradient(135deg,#7c1d1d,#dc2626)",
  "linear-gradient(135deg,#1e1b4b,#4f46e5)",
];

/* ── Video card (real API video) ─────────────────────────────────────────── */
function RealVideoCard({ video, idx, courseTitle }: { video: VideoLesson; idx: number; courseTitle: string }) {
  const navigate = useNavigate();
  const watched = video.progressPct >= 100;
  const grad = video.thumbnailColor
    ? `linear-gradient(135deg,${video.thumbnailColor}44,${video.thumbnailColor}99)`
    : GRAD_PALETTE[idx % GRAD_PALETTE.length];

  function handleClick() {
    const state: VideoWatchState = { title:video.title, courseTitle, videoUrl:video.videoUrl, gradient:grad, duration:fmtSec(video.durationSeconds), watched };
    navigate(`/student/videos/watch/${video.id}`, { state });
  }

  return (
    <div style={{ cursor:"pointer" }} onClick={handleClick}>
      <div style={{ borderRadius:14, overflow:"hidden", background:grad, aspectRatio:"16/9", position:"relative", marginBottom:10 }}>
        {watched && (
          <div style={{ position:"absolute",top:10,left:10,background:"#22c55e",borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:700,color:"#fff" }}>
            ✓ Ko'rildi
          </div>
        )}
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:50,height:50,borderRadius:"50%",background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:0,height:0,borderTop:"10px solid transparent",borderBottom:"10px solid transparent",borderLeft:"18px solid #fff",marginLeft:4 }}/>
          </div>
        </div>
        {video.durationSeconds && (
          <div style={{ position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.7)",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700,color:"#fff" }}>
            {fmtSec(video.durationSeconds)}
          </div>
        )}
      </div>
      <div style={{ fontWeight:700,fontSize:13.5 }}>{video.title}</div>
    </div>
  );
}

/* ── Course detail page ──────────────────────────────────────────────────── */
function CourseDetail({ course, onBack }: { course: Course; onBack: ()=>void }) {
  const navigate = useNavigate();
  const { data: realVideos } = useVideos(
    course.category === "zoom" ? "zoom" :
    course.id === "c2" ? "debyut" : undefined
  );
  const demoVids = DEMO_VIDEOS[course.id] ?? [];
  const hasReal = realVideos && realVideos.length > 0;

  function goWatch(id: string, state: VideoWatchState) {
    navigate(`/student/videos/watch/${id}`, { state });
  }

  return (
    <div>
      {/* Back */}
      <button onClick={onBack}
        style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:16,padding:0 }}>
        ← {course.title}
      </button>

      {/* Banner */}
      <div style={{ width:"100%",height:220,borderRadius:18,background:course.gradient,marginBottom:18,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:120,opacity:.08,userSelect:"none" }}>♟</div>
      </div>

      {/* Info card */}
      <Card style={{ marginBottom:28,padding:"20px 24px" }}>
        <h2 style={{ margin:"0 0 8px",fontSize:20,fontWeight:900 }}>{course.title}</h2>
        <p style={{ margin:"0 0 16px",color:"var(--text-faint)",fontSize:13.5,lineHeight:1.65 }}>{course.description}</p>
        <div style={{ display:"flex",gap:22,fontSize:13,flexWrap:"wrap" }}>
          <span>🎬 <b>{course.totalLessons} ta</b> video darslik</span>
          <span>👁 <b>{course.views.toLocaleString()}</b> ko'rildi</span>
          <span>🎓 <b>{course.teacher}</b> o'qituvchi</span>
        </div>
      </Card>

      {/* Videos grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20 }}>
        {hasReal
          ? realVideos.map((v,i)=>(
              <RealVideoCard key={v.id} video={v} idx={i} courseTitle={course.title} />
            ))
          : demoVids.map(v=>(
              <div key={v.id} style={{ cursor:"pointer" }}
                onClick={()=>goWatch(v.id,{ title:v.title, courseTitle:course.title, gradient:v.gradient, duration:v.duration, watched:v.watched })}>
                <div style={{ borderRadius:14,overflow:"hidden",background:v.gradient,aspectRatio:"16/9",position:"relative",marginBottom:10 }}>
                  {v.watched && (
                    <div style={{ position:"absolute",top:10,left:10,background:"#22c55e",borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:700,color:"#fff" }}>
                      ✓ Ko'rildi
                    </div>
                  )}
                  <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <div style={{ width:50,height:50,borderRadius:"50%",background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <div style={{ width:0,height:0,borderTop:"10px solid transparent",borderBottom:"10px solid transparent",borderLeft:"18px solid #fff",marginLeft:4 }}/>
                    </div>
                  </div>
                  <div style={{ position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.7)",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700,color:"#fff" }}>
                    {v.duration}
                  </div>
                </div>
                <div style={{ fontWeight:700,fontSize:13.5 }}>{v.title}</div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function VideosPage() {
  const [tab, setTab] = useState("boshlangich");
  const [selected, setSelected] = useState<Course|null>(null);

  if (selected) return <CourseDetail course={selected} onBack={()=>setSelected(null)} />;

  const courses = tab === "zoom" ? DEMO_ZOOM_COURSES : DEMO_COURSES;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {TABS.map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)}
            style={{ padding:"7px 20px",borderRadius:99,border:"none",cursor:"pointer",fontWeight:700,fontSize:13.5,
              background:tab===t.v?"#22c55e":"rgba(255,255,255,.07)",
              color:tab===t.v?"#fff":"var(--text-faint)",
              transition:"background .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Course grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:24 }}>
        {courses.map(course=>(
          <div key={course.id} onClick={()=>setSelected(course)} style={{ cursor:"pointer" }}>
            {/* Thumbnail */}
            <div style={{ borderRadius:16,overflow:"hidden",background:course.gradient,aspectRatio:"16/9",position:"relative",marginBottom:12 }}>
              {course.isNew && (
                <div style={{ position:"absolute",top:12,left:12,background:"#22c55e",borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:800,color:"#fff" }}>
                  ✨ YANGI
                </div>
              )}
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:72,opacity:.08,userSelect:"none" }}>
                ♟
              </div>
              <div style={{ position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.65)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,color:"#fff" }}>
                {course.totalLessons} video
              </div>
            </div>
            {/* Title */}
            <div style={{ fontWeight:800,fontSize:15,marginBottom:8 }}>{course.title}</div>
            {/* Progress */}
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ flex:1,height:5,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:99,background:"#f59e0b",
                  width:`${(course.watchedLessons/course.totalLessons)*100}%` }}/>
              </div>
              <span style={{ fontSize:12,color:"var(--text-faint)",flexShrink:0,fontWeight:600 }}>
                {course.watchedLessons}/{course.totalLessons} dars
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
