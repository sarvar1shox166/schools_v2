import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Icon } from "@chess-school/ui";
import { COURSES_STORE } from "./VideoCoursesPage.js";

/* ─── Types ─── */
type Lesson = {
  id: string; order: number; title: string; desc: string; duration: string; views: number; videoName?: string;
};

/* ─── Mock lessons per course ─── */
const MOCK_LESSONS: Record<string, Lesson[]> = {
  "1": [
    { id:"l1", order:1, title:"Shaxmat taxtasi va donalari",  desc:"Taxtani tushunish va donalarni tanish",    duration:"15:20", views:342 },
    { id:"l2", order:2, title:"Donalarni harakatlantirish",   desc:"Har bir dona qanday harakatlanadi",         duration:"22:10", views:298 },
    { id:"l3", order:3, title:"Shoh va Ferz",                 desc:"Eng muhim donalar: shoh va ferz qoidalari", duration:"18:45", views:276 },
    { id:"l4", order:4, title:"Fil va Ot harakatlari",        desc:"Fil diagonal, ot L-shakl harakat qiladi",   duration:"20:30", views:251 },
    { id:"l5", order:5, title:"Rokichilik",                   desc:"Qal'a va rokichilik qoidasi",               duration:"12:15", views:234 },
    { id:"l6", order:6, title:"Shoh ostiga hujum",            desc:"Shahmat va shohni himoyalash usullari",     duration:"25:00", views:210 },
    { id:"l7", order:7, title:"Pat va dona ayirboshlash",     desc:"Pat holati va moddiy ustunlik",             duration:"17:40", views:198 },
    { id:"l8", order:8, title:"Gandikap o'yini",              desc:"Kuchli raqib bilan tenglashtirish usuli",   duration:"14:55", views:181 },
  ],
  "2": [
    { id:"l1", order:1, title:"Debyut nima?",         desc:"Debyutning maqsadi va asosiy qoidalari",   duration:"10:00", views:180 },
    { id:"l2", order:2, title:"Markazni egallash",    desc:"Markaziy to'rtta katak ustidan nazorat",    duration:"14:30", views:160 },
    { id:"l3", order:3, title:"Italyan ochilishi",    desc:"1.e4 e5 2.Nf3 Nc6 3.Bc4 — klassik ochilish", duration:"18:20", views:142 },
    { id:"l4", order:4, title:"Ispancha ochilish",    desc:"Ruy Lopez — eng mashhur ochilishlardan biri", duration:"22:15", views:128 },
    { id:"l5", order:5, title:"Fransuzcha mudofaa",   desc:"1.e4 e6 — qattiq mudofaa tizimi",           duration:"16:40", views:115 },
    { id:"l6", order:6, title:"Skandinav gambiti",    desc:"1.e4 d5 — keskin kontr-o'yin",              duration:"13:50", views:103 },
  ],
};

/* ─── Page ─── */
export default function VideoCourseDetailPage() {
  const { courseId = "1" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const course = COURSES_STORE.find(c => c.id === courseId) ?? COURSES_STORE[0];
  const [lessons, setLessons] = useState<Lesson[]>(() => MOCK_LESSONS[courseId] ?? []);
  const [showAdd, setShowAdd] = useState(false);

  function handleAdd(data: { title: string; desc: string; videoName?: string }) {
    const next: Lesson = {
      id: String(Date.now()),
      order: lessons.length + 1,
      title: data.title,
      desc: data.desc,
      duration: "00:00",
      views: 0,
      videoName: data.videoName,
    };
    setLessons(prev => [...prev, next]);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    setLessons(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return filtered.map((l, i) => ({ ...l, order: i + 1 }));
    });
  }

  const totalViews = lessons.reduce((s, l) => s + l.views, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <button
          className="iconbtn"
          onClick={() => navigate("/admin/video-courses")}
          style={{ borderRadius:10, border:"1px solid var(--border)" }}
          title="Orqaga"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", margin:0 }}>{course.title}</h2>
          <div style={{ fontSize:13, color:"var(--text-faint)", marginTop:2 }}>
            {course.teacher}
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={15}/> Dars qo'shish
        </button>
      </div>

      {/* Course info */}
      <Card style={{ padding:0 }}>
        <div style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:20 }}>
          {/* Thumbnail */}
          <div style={{
            width:130, height:86, borderRadius:14, flexShrink:0,
            background: course.color + "22",
            border: "1.5px solid " + course.color + "55",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:42,
          }}>♟</div>

          {/* Info */}
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:18, marginBottom:10 }}>{course.title}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:20, fontSize:13.5, color:"var(--text-faint)" }}>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                <Icon name="user" size={13}/> {course.teacher}
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                <Icon name="video" size={13}/> {lessons.length} ta dars
              </span>
              <span>👁 {totalViews.toLocaleString("ru-RU")} ko'rildi</span>
              <span>♥ {course.likes} like</span>
            </div>
          </div>

          {/* Color badge */}
          <div style={{
            padding:"6px 16px", borderRadius:99,
            background: course.color + "1a", color: course.color,
            fontWeight:700, fontSize:13,
          }}>
            Faol
          </div>
        </div>
      </Card>

      {/* Lessons */}
      <Card style={{ padding:0 }}>
        <div style={{
          padding:"18px 22px 14px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:"1px solid var(--border)",
        }}>
          <div style={{ fontWeight:800, fontSize:15.5 }}>Darslar ro'yxati</div>
          <span style={{ fontSize:13, color:"var(--text-faint)", fontWeight:600 }}>
            {lessons.length} ta dars
          </span>
        </div>

        {lessons.length === 0 ? (
          <div style={{ padding:"48px 22px", textAlign:"center", color:"var(--text-faint)" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📹</div>
            <div style={{ fontWeight:750, fontSize:15, marginBottom:6 }}>Hali darslar yo'q</div>
            <div style={{ fontSize:13 }}>Birinchi darsni qo'shing</div>
            <button className="btn primary" style={{ marginTop:16 }} onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={14}/> Dars qo'shish
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column" }}>
            {lessons.map((l, i) => (
              <div key={l.id} style={{
                display:"flex", alignItems:"center", gap:14, padding:"14px 22px",
                borderBottom: i < lessons.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {/* Order badge */}
                <div style={{
                  width:34, height:34, borderRadius:9, flexShrink:0,
                  background: course.color + "1a", color: course.color,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:13,
                }}>{l.order}</div>

                {/* Title + desc */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{l.title}</div>
                  {l.desc && (
                    <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {l.desc}
                    </div>
                  )}
                  {l.videoName && (
                    <div style={{ fontSize:11.5, color:"var(--accent)", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                      <Icon name="video" size={10}/> {l.videoName}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display:"flex", gap:18, fontSize:12.5, color:"var(--text-faint)", flexShrink:0 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <Icon name="clock" size={12}/> {l.duration}
                  </span>
                  <span>👁 {l.views}</span>
                </div>

                {/* Delete */}
                <button
                  className="iconbtn"
                  onClick={() => handleDelete(l.id)}
                  title="O'chirish"
                  style={{ color:"var(--danger)", flexShrink:0 }}
                >
                  <Icon name="x" size={15}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAdd && <AddLessonModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  );
}

/* ─── Add Lesson Modal ─── */
function AddLessonModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (data: { title: string; desc: string; videoName?: string }) => void;
}) {
  const [form, setForm] = useState({ title:"", desc:"", videoName:"" });

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setForm(f => ({ ...f, videoName: file.name }));
  }

  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:200,
        background:"rgba(0,0,0,.45)", backdropFilter:"blur(3px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:"var(--surface)", borderRadius:18, width:480, maxWidth:"100%",
        boxShadow:"0 24px 64px rgba(0,0,0,.22)", padding:"28px 30px",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Yangi dars qo'shish</div>
          <button className="iconbtn" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        {/* Dars nomi */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Dars nomi</div>
          <input
            className="inp" placeholder="Masalan: Shoh va Ferz"
            value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
            style={{ width:"100%" }}
          />
        </div>

        {/* Tavsif */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Tavsif</div>
          <textarea
            className="inp"
            placeholder="Dars haqida qisqacha ma'lumot..."
            value={form.desc}
            onChange={e => setForm(f => ({ ...f, desc:e.target.value }))}
            rows={3}
            style={{ width:"100%", resize:"vertical", fontFamily:"inherit", fontSize:14 }}
          />
        </div>

        {/* Video upload */}
        <div style={{ marginBottom:26 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Video</div>
          <label style={{
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:10, border:"1.5px dashed var(--border-strong)", borderRadius:12,
            padding:"24px 16px", cursor:"pointer", background:"var(--surface-2)",
            color: form.videoName ? "var(--accent)" : "var(--text-faint)",
            transition:"border-color .15s",
          }}>
            <input
              type="file" accept="video/*"
              style={{ display:"none" }}
              onChange={handleVideoChange}
            />
            {form.videoName ? (
              <>
                <div style={{ fontSize:28 }}>🎬</div>
                <div style={{ fontSize:13, fontWeight:700, textAlign:"center", wordBreak:"break-all" }}>
                  {form.videoName}
                </div>
                <div style={{ fontSize:12, color:"var(--text-faint)" }}>Boshqa fayl tanlash uchun bosing</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:28 }}>📹</div>
                <div style={{ fontSize:13, fontWeight:600 }}>Video yuklash uchun bosing</div>
                <div style={{ fontSize:12, opacity:0.7 }}>MP4, MOV, AVI va boshqalar</div>
              </>
            )}
          </label>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button className="btn" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>
            Bekor
          </button>
          <button
            className="btn primary"
            style={{ flex:2, justifyContent:"center" }}
            disabled={!form.title.trim()}
            onClick={() => onSave({ title:form.title, desc:form.desc, videoName:form.videoName || undefined })}
          >
            <Icon name="plus" size={14}/> Qo'shish
          </button>
        </div>
      </div>
    </div>
  );
}
