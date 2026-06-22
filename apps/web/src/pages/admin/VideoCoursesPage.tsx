import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon, StatCard } from "@chess-school/ui";

/* ─── Types ─── */
export type VideoCourse = {
  id: string; title: string; teacher: string;
  color: string; videoCount: number; views: number; likes: number;
};

/* ─── Shared mock data (used by detail page too) ─── */
export const COURSES_STORE: VideoCourse[] = [
  { id:"1", title:"Shaxmatni 0 dan boshlash", teacher:"A.Karimov",             color:"#3b82f6", videoCount:12, views:1240, likes:318 },
  { id:"2", title:"Debyutlar",                teacher:"Abduxaliqova Gulchehra", color:"#ec4899", videoCount:12, views:892,  likes:241 },
];

const COURSE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];

/* ─── Page ─── */
export default function VideoCoursesPage() {
  const [courses, setCourses] = useState<VideoCourse[]>(COURSES_STORE);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const totalVideos = courses.reduce((s, c) => s + c.videoCount, 0);
  const totalViews  = courses.reduce((s, c) => s + c.views, 0);

  function handleSave(data: { title: string; teacher: string }) {
    const id = String(Date.now());
    const color = COURSE_COLORS[courses.length % COURSE_COLORS.length];
    const newCourse: VideoCourse = { id, title:data.title, teacher:data.teacher, color, videoCount:0, views:0, likes:0 };
    setCourses(prev => [...prev, newCourse]);
    COURSES_STORE.push(newCourse);
    setShowModal(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", margin:0 }}>Video darsliklar</h2>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={15}/> Yangi kurs
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-3">
        <StatCard icon="video" tone="i"
          value={String(courses.length)} label="Jami kurslar"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ +1 bu oy</span>}
        />
        <StatCard icon="students" tone="s"
          value={String(totalVideos)} label="Jami videolar"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ +12</span>}
        />
        <StatCard icon="barChart" tone="w"
          value={totalViews.toLocaleString("ru-RU")} label="Ko'rishlar"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ +8%</span>}
        />
      </div>

      {/* Course list */}
      <Card style={{ padding:0 }}>
        <div style={{
          padding:"18px 22px 14px", fontWeight:800, fontSize:15.5,
          borderBottom:"1px solid var(--border)",
        }}>
          Kurslar ro'yxati
        </div>

        {courses.length === 0 ? (
          <div style={{ padding:"48px 22px", textAlign:"center", color:"var(--text-faint)" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🎬</div>
            <div style={{ fontWeight:700, fontSize:15 }}>Kurslar yo'q</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column" }}>
            {courses.map((c, i) => (
              <div key={c.id} style={{
                display:"flex", alignItems:"center", gap:16, padding:"16px 22px",
                borderBottom: i < courses.length-1 ? "1px solid var(--border)" : "none",
              }}>
                {/* Thumbnail */}
                <div style={{
                  width:76, height:54, borderRadius:10, flexShrink:0,
                  background: c.color + "22",
                  border: "1.5px solid " + c.color + "44",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26,
                }}>♟</div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:750, fontSize:15, marginBottom:5 }}>{c.title}</div>
                  <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:14, fontSize:12.5, color:"var(--text-faint)" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <Icon name="user" size={12}/> {c.teacher}
                    </span>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <Icon name="video" size={12}/> {c.videoCount} ta video
                    </span>
                    <span>👁 {c.views.toLocaleString("ru-RU")} ko'rildi</span>
                    <span>♥ {c.likes} like</span>
                  </div>
                </div>

                {/* Ko'rish */}
                <button
                  className="btn"
                  onClick={() => navigate(`/admin/video-courses/${c.id}`)}
                  style={{ display:"flex", alignItems:"center", gap:6 }}
                >
                  <Icon name="eye" size={14}/> Ko'rish
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showModal && <NewCourseModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}

/* ─── 2-step New Course Modal ─── */
function NewCourseModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (data: { title: string; teacher: string }) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title:"", teacher:"" });

  const STEPS = [
    { n:1, label:"Kurs ma'lumotlari" },
    { n:2, label:"Kurs banneri"      },
  ];

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
        background:"var(--surface)", borderRadius:18,
        width:500, maxWidth:"100%",
        boxShadow:"0 24px 64px rgba(0,0,0,.22)",
        padding:"30px 32px",
      }}>

        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:0, marginBottom:30 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display:"flex", alignItems:"flex-start" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
                <div style={{
                  width:36, height:36, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:15,
                  background: step >= s.n ? "var(--accent)" : "var(--surface-3)",
                  color: step >= s.n ? "#fff" : "var(--text-faint)",
                  flexShrink:0,
                }}>{s.n}</div>
                <div style={{
                  fontSize:11.5, fontWeight:700, whiteSpace:"nowrap",
                  color: step === s.n ? "var(--accent)" : "var(--text-faint)",
                }}>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width:80, height:2, margin:"17px 0 0",
                  background: step > s.n ? "var(--accent)" : "var(--border)",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:22 }}>Kurs ma'lumotlari</div>

            {/* Image upload */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Kurs rasmi</div>
              <div style={{
                border:"1.5px dashed var(--border-strong)", borderRadius:12,
                height:110, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:8,
                cursor:"pointer", background:"var(--surface-2)",
                color:"var(--text-faint)",
              }}>
                <div style={{ fontSize:22, fontWeight:300 }}>+</div>
                <div style={{ fontSize:13 }}>Rasm yuklash uchun bosing</div>
              </div>
            </div>

            {/* Course name */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Kurs nomi</div>
              <input
                className="inp" placeholder="Masalan: Shaxmat asoslari"
                value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))}
                style={{ width:"100%" }}
              />
            </div>

            {/* Teacher */}
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>O'qituvchi ismi</div>
              <input
                className="inp" placeholder="Masalan: A.Karimov"
                value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher:e.target.value }))}
                style={{ width:"100%" }}
              />
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button className="btn" onClick={onClose}>Bekor qilish</button>
              <button className="btn primary" onClick={() => setStep(2)} disabled={!form.title.trim()}>
                Keyingi →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:22 }}>Kurs banneri</div>

            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Banner rasmi</div>
              <div style={{
                border:"1.5px dashed var(--border-strong)", borderRadius:12,
                height:150, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:10,
                cursor:"pointer", background:"var(--surface-2)",
                color:"var(--text-faint)",
              }}>
                <div style={{ fontSize:32 }}>🖼</div>
                <div style={{ fontSize:13 }}>Banner rasm yuklash uchun bosing</div>
                <div style={{ fontSize:11.5, opacity:0.7 }}>1920×400 px tavsiya etiladi</div>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
              <button className="btn" onClick={() => setStep(1)}>← Orqaga</button>
              <button className="btn primary" onClick={() => onSave({ title:form.title, teacher:form.teacher })}>
                <Icon name="check" size={14}/> Saqlash
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
