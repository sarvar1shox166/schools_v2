import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, showXp } from "@chess-school/ui";

export interface VideoWatchState {
  title: string;
  courseTitle: string;
  videoUrl?: string;
  gradient: string;
  duration?: string;
  watched?: boolean;
}

interface Question {
  q: string;
  opts: string[];
  ans: number;
}

const DEMO_QUESTIONS: Question[] = [
  { q:"Shaxmat taxtasida nechta katakcha bor?", opts:["32","48","64","81"], ans:2 },
  { q:"Malika bir hamlada necha yo'nalishda yura oladi?", opts:["4","6","8","Cheksiz yo'nalishlarda"], ans:3 },
  { q:"O'yinni kim boshlaydi?", opts:["Qora","Oq","Tanga tashlash bilan belgilanadi","Kattaroq o'yinchi"], ans:1 },
  { q:"Rok nima deb ataladi?", opts:["Fil","Ot","Piyoda","Qal'a"], ans:3 },
];

export default function VideoWatchPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: VideoWatchState | null };

  const title       = state?.title       ?? "Video dars";
  const courseTitle = state?.courseTitle ?? "Video darslar";
  const gradient    = state?.gradient    ?? "linear-gradient(135deg,#1e3a5f,#1565c0)";
  const videoUrl    = state?.videoUrl;

  const [phase, setPhase]   = useState<"idle"|"test"|"done">("idle");
  const [answers, setAnswers] = useState<(number|null)[]>(DEMO_QUESTIONS.map(()=>null));
  const [current, setCurrent] = useState(0);

  function selectAnswer(idx: number) {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  }

  function finish() {
    setPhase("done");
    const correct = answers.filter((a,i)=>a===DEMO_QUESTIONS[i].ans).length;
    const xp = correct * 25;
    if (xp > 0) showXp(xp, `Test tugadi! ${correct}/${DEMO_QUESTIONS.length} to'g'ri`);
  }

  const correct = answers.filter((a,i)=>a===DEMO_QUESTIONS[i].ans).length;
  const q = DEMO_QUESTIONS[current];
  const allAnswered = answers.every(a=>a!==null);

  return (
    <div style={{ maxWidth:860, margin:"0 auto" }}>
      {/* Back */}
      <button onClick={()=>navigate(-1)}
        style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:16,padding:0 }}>
        ← {courseTitle}
      </button>

      {/* Video player */}
      <div style={{ borderRadius:18,overflow:"hidden",background:gradient,aspectRatio:"16/9",position:"relative",marginBottom:20 }}>
        {videoUrl && videoUrl !== "#" ? (
          <iframe src={videoUrl} title={title}
            style={{ width:"100%",height:"100%",border:"none",display:"block" }}
            allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        ) : (
          <>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:130,opacity:.07,userSelect:"none" }}>♟</div>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <div style={{ textAlign:"center",color:"rgba(255,255,255,.6)" }}>
                <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                  <div style={{ width:0,height:0,borderTop:"14px solid transparent",borderBottom:"14px solid transparent",borderLeft:"24px solid #fff",marginLeft:6 }}/>
                </div>
                <div style={{ fontSize:13,fontWeight:600 }}>{state?.duration ?? ""}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <h2 style={{ margin:"0 0 20px",fontSize:20,fontWeight:900 }}>{title}</h2>

      {/* Test section */}
      <Card>
        {phase === "idle" && (
          <div style={{ padding:"24px 24px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16 }}>
              <div style={{ width:48,height:48,borderRadius:13,background:"rgba(63,140,255,.15)",border:"1px solid rgba(63,140,255,.25)",display:"grid",placeItems:"center",fontSize:22,flexShrink:0 }}>
                📝
              </div>
              <div>
                <div style={{ fontWeight:800,fontSize:16 }}>Dars testi</div>
                <div style={{ fontSize:13,color:"var(--text-faint)",marginTop:3 }}>
                  {DEMO_QUESTIONS.length} ta savol · To'g'ri javob uchun +25 XP
                </div>
              </div>
            </div>
            <p style={{ margin:"0 0 20px",fontSize:13.5,color:"var(--text-faint)",lineHeight:1.65 }}>
              Darsni ko'rgach bilimingizni tekshiring. Har bir to'g'ri javob uchun XP yutasiz!
            </p>
            <button className="btn" style={{ background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none" }}
              onClick={()=>setPhase("test")}>
              Testni boshlash →
            </button>
          </div>
        )}

        {phase === "test" && (
          <div style={{ padding:"24px" }}>
            {/* Progress */}
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}>
              <div style={{ flex:1,height:5,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:99,background:"var(--kacc,#3F8CFF)",
                  width:`${((current+1)/DEMO_QUESTIONS.length)*100}%`,transition:"width .3s" }}/>
              </div>
              <span style={{ fontSize:12,fontWeight:700,color:"var(--text-faint)",flexShrink:0 }}>
                {current+1}/{DEMO_QUESTIONS.length}
              </span>
            </div>

            {/* Question */}
            <div style={{ fontWeight:800,fontSize:16,marginBottom:16,lineHeight:1.5 }}>{q.q}</div>

            {/* Options */}
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:24 }}>
              {q.opts.map((opt,i)=>{
                const picked = answers[current]===i;
                return (
                  <button key={i} onClick={()=>selectAnswer(i)}
                    style={{ textAlign:"left",padding:"12px 16px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600,transition:"all .15s",
                      background: picked ? "rgba(63,140,255,.2)" : "rgba(255,255,255,.05)",
                      border: picked ? "1.5px solid var(--kacc,#3F8CFF)" : "1.5px solid var(--border,rgba(255,255,255,.1))",
                      color: picked ? "var(--kacc,#3F8CFF)" : "inherit" }}>
                    <span style={{ display:"inline-block",width:24,height:24,borderRadius:"50%",textAlign:"center",lineHeight:"24px",fontSize:12,fontWeight:800,marginRight:10,flexShrink:0,
                      background: picked ? "var(--kacc,#3F8CFF)" : "rgba(255,255,255,.08)",
                      color: picked ? "#fff" : "var(--text-faint)" }}>
                      {String.fromCharCode(65+i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              {current > 0 && (
                <button className="btn" style={{ background:"rgba(255,255,255,.07)",border:"1px solid var(--border)" }}
                  onClick={()=>setCurrent(c=>c-1)}>
                  ← Oldingi
                </button>
              )}
              {current < DEMO_QUESTIONS.length-1 ? (
                <button className="btn" style={{ background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none",opacity:answers[current]===null?.5:1 }}
                  disabled={answers[current]===null}
                  onClick={()=>setCurrent(c=>c+1)}>
                  Keyingi →
                </button>
              ) : (
                <button className="btn" style={{ background:"#22c55e",color:"#fff",border:"none",opacity:!allAnswered?.5:1 }}
                  disabled={!allAnswered}
                  onClick={finish}>
                  Tugatish ✓
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div style={{ padding:"32px 24px",textAlign:"center" }}>
            <div style={{ fontSize:56,marginBottom:16 }}>{correct===DEMO_QUESTIONS.length?"🏆":correct>=DEMO_QUESTIONS.length/2?"🎯":"📚"}</div>
            <div style={{ fontWeight:900,fontSize:22,marginBottom:8 }}>
              {correct===DEMO_QUESTIONS.length ? "Ajoyib!" : correct>=DEMO_QUESTIONS.length/2 ? "Yaxshi natija!" : "Ko'proq mashq qiling!"}
            </div>
            <div style={{ fontSize:15,color:"var(--text-faint)",marginBottom:20 }}>
              {correct}/{DEMO_QUESTIONS.length} ta savol to'g'ri · <span style={{ color:"#f59e0b",fontWeight:700 }}>+{correct*25} XP</span>
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
              {DEMO_QUESTIONS.map((_,i)=>(
                <div key={i} style={{ width:36,height:36,borderRadius:10,display:"grid",placeItems:"center",fontSize:16,fontWeight:800,
                  background: answers[i]===DEMO_QUESTIONS[i].ans ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.15)",
                  color:       answers[i]===DEMO_QUESTIONS[i].ans ? "#22c55e" : "#ef4444",
                  border:      `1.5px solid ${answers[i]===DEMO_QUESTIONS[i].ans?"#22c55e":"#ef4444"}` }}>
                  {answers[i]===DEMO_QUESTIONS[i].ans?"✓":"✕"}
                </div>
              ))}
            </div>
            <button className="btn" style={{ marginTop:24,background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none" }}
              onClick={()=>{ setPhase("idle"); setAnswers(DEMO_QUESTIONS.map(()=>null)); setCurrent(0); }}>
              Qayta ishlash
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
