import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, showXp } from "@chess-school/ui";
import { useVideoQuiz, useSubmitQuiz, useUpdateVideoProgress, useVideoCourseDetail } from "../../lib/queries.js";

export interface VideoWatchState {
  title: string;
  courseTitle: string;
  courseId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  gradient: string;
  duration?: string;
  watched?: boolean;
}

function fmtSec(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoWatchPage() {
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();
  const { state } = useLocation() as { state: VideoWatchState | null };

  const title       = state?.title       ?? "Video dars";
  const courseTitle = state?.courseTitle ?? "Video darslar";
  const courseId    = state?.courseId;
  const gradient    = state?.gradient    ?? "linear-gradient(135deg,#1e3a5f,#1565c0)";
  const videoUrl    = state?.videoUrl;
  const thumbnailUrl = state?.thumbnailUrl;

  const { data: questions = [], isLoading: quizLoading } = useVideoQuiz(videoId);
  const submitQuiz = useSubmitQuiz();
  const updateProgress = useUpdateVideoProgress();
  const { data: course } = useVideoCourseDetail(courseId);
  const lastSentPct = useRef(0);

  const [phase, setPhase]   = useState<"idle"|"test"|"done">("idle");
  const [answers, setAnswers] = useState<(number|null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number; xpAwarded?: number } | null>(null);

  function startTest() {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setPhase("test");
  }

  function selectAnswer(idx: number) {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  }

  async function finish() {
    if (!videoId) return;
    const res = await submitQuiz.mutateAsync({ videoId, answers: answers.map(a => a ?? -1), courseId });
    setResult(res);
    setPhase("done");
    if (res.xpAwarded) showXp(res.xpAwarded, `Test tugadi! ${res.score}/${res.total} to'g'ri`);
    if (res.lessonXpAwarded) setTimeout(() => showXp(res.lessonXpAwarded!, "Dars to'liq tugallandi!"), res.xpAwarded ? 1600 : 0);
    if (res.courseXpAwarded) setTimeout(() => showXp(res.courseXpAwarded!, "Kurs tugatildi! Tabriklaymiz 🏆"), (res.xpAwarded ? 1600 : 0) + (res.lessonXpAwarded ? 1600 : 0));
  }

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (!videoId) return;
    const v = e.currentTarget;
    if (!v.duration || !isFinite(v.duration)) return;
    const pct = Math.min(99, Math.floor((v.currentTime / v.duration) * 100));
    if (pct >= lastSentPct.current + 5) {
      lastSentPct.current = pct;
      updateProgress.mutate({ videoId, progressPct: pct, courseId });
    }
  }

  function handleEnded() {
    if (!videoId) return;
    lastSentPct.current = 100;
    updateProgress.mutate({ videoId, progressPct: 100, courseId }, {
      onSuccess: (res) => {
        if (res.xpAwarded) showXp(res.xpAwarded, "Video ko'rib bo'ldingiz!");
        if (res.lessonXpAwarded) setTimeout(() => showXp(res.lessonXpAwarded!, "Dars to'liq tugallandi!"), res.xpAwarded ? 1600 : 0);
        if (res.courseXpAwarded) setTimeout(() => showXp(res.courseXpAwarded!, "Kurs tugatildi! Tabriklaymiz 🏆"), (res.xpAwarded ? 1600 : 0) + (res.lessonXpAwarded ? 1600 : 0));
      },
    });
  }

  function goToLesson(lessonId: string, lessonTitle: string, lessonVideoUrl: string, lessonThumb: string | null, durationSeconds: number | null) {
    const nextState: VideoWatchState = {
      title: lessonTitle,
      courseTitle,
      courseId,
      videoUrl: lessonVideoUrl,
      thumbnailUrl: lessonThumb ?? undefined,
      gradient,
      duration: fmtSec(durationSeconds),
    };
    navigate(`/student/videos/watch/${lessonId}`, { state: nextState, replace: true });
  }

  const q = questions[current];
  const allAnswered = answers.length > 0 && answers.every(a => a !== null);
  const otherLessons = course?.lessons.filter((l) => l.id !== videoId) ?? [];

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* Back */}
      <button onClick={()=>navigate(-1)}
        style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:16,padding:0 }}>
        ← {courseTitle}
      </button>

      <div style={{ display: "grid", gridTemplateColumns: otherLessons.length > 0 ? "1fr 320px" : "1fr", gap: 24, alignItems: "start" }}>
        <div>
          {/* Video player */}
          <div style={{ borderRadius:16,overflow:"hidden",background:"#000",aspectRatio:"16/9",position:"relative",marginBottom:18 }}>
            {videoUrl && videoUrl !== "#" ? (
              <video
                key={videoId}
                src={videoUrl}
                poster={thumbnailUrl}
                controls
                playsInline
                autoPlay
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture={false}
                onContextMenu={(e) => e.preventDefault()}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                style={{ width:"100%",height:"100%",display:"block",background:"#000" }}
              />
            ) : (
              <div style={{ position:"absolute",inset:0,background:gradient,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <div style={{ fontSize:130,opacity:.15,userSelect:"none",color:"#fff" }}>♟</div>
              </div>
            )}
          </div>

          {/* Title */}
          <h2 style={{ margin:"0 0 6px",fontSize:21,fontWeight:900 }}>{title}</h2>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 22 }}>{courseTitle}</div>

          {/* Test section */}
          {!quizLoading && questions.length === 0 ? null : (
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
                      {questions.length} ta savol · Hammasiga to'g'ri javob berilsa +15 XP
                    </div>
                  </div>
                </div>
                <p style={{ margin:"0 0 20px",fontSize:13.5,color:"var(--text-faint)",lineHeight:1.65 }}>
                  Darsni ko'rgach bilimingizni tekshiring. Hammasini to'g'ri topsangiz XP yutasiz!
                </p>
                <button className="btn" style={{ background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none" }}
                  onClick={startTest} disabled={quizLoading}>
                  Testni boshlash →
                </button>
              </div>
            )}

            {phase === "test" && q && (
              <div style={{ padding:"24px" }}>
                {/* Progress */}
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}>
                  <div style={{ flex:1,height:5,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:99,background:"var(--kacc,#3F8CFF)",
                      width:`${((current+1)/questions.length)*100}%`,transition:"width .3s" }}/>
                  </div>
                  <span style={{ fontSize:12,fontWeight:700,color:"var(--text-faint)",flexShrink:0 }}>
                    {current+1}/{questions.length}
                  </span>
                </div>

                {/* Question */}
                <div style={{ fontWeight:800,fontSize:16,marginBottom:16,lineHeight:1.5 }}>{q.question}</div>

                {/* Options */}
                <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:24 }}>
                  {q.options.map((opt,i)=>{
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
                  {current < questions.length-1 ? (
                    <button className="btn" style={{ background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none",opacity:answers[current]===null?.5:1 }}
                      disabled={answers[current]===null}
                      onClick={()=>setCurrent(c=>c+1)}>
                      Keyingi →
                    </button>
                  ) : (
                    <button className="btn" style={{ background:"#22c55e",color:"#fff",border:"none",opacity:!allAnswered?.5:1 }}
                      disabled={!allAnswered || submitQuiz.isPending}
                      onClick={finish}>
                      {submitQuiz.isPending ? "Yuborilmoqda..." : "Tugatish ✓"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === "done" && result && (
              <div style={{ padding:"32px 24px",textAlign:"center" }}>
                <div style={{ fontSize:56,marginBottom:16 }}>{result.score===result.total?"🏆":result.score>=result.total/2?"🎯":"📚"}</div>
                <div style={{ fontWeight:900,fontSize:22,marginBottom:8 }}>
                  {result.score===result.total ? "Ajoyib!" : result.score>=result.total/2 ? "Yaxshi natija!" : "Ko'proq mashq qiling!"}
                </div>
                <div style={{ fontSize:15,color:"var(--text-faint)",marginBottom:20 }}>
                  {result.score}/{result.total} ta savol to'g'ri
                  {result.xpAwarded ? <> · <span style={{ color:"#f59e0b",fontWeight:700 }}>+{result.xpAwarded} XP</span></> : null}
                </div>
                <button className="btn" style={{ marginTop:8,background:"var(--kacc,#3F8CFF)",color:"#fff",border:"none" }}
                  onClick={()=>{ setPhase("idle"); setResult(null); }}>
                  Yopish
                </button>
              </div>
            )}
          </Card>
          )}
        </div>

        {/* Other lessons in this course */}
        {otherLessons.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Shu kursdagi boshqa darslar</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {otherLessons.map((l) => (
                <div key={l.id} onClick={() => goToLesson(l.id, l.title, l.videoUrl, l.thumbnailUrl, l.durationSeconds)}
                  style={{ display: "flex", gap: 10, cursor: "pointer" }}>
                  <div style={{
                    width: 96, aspectRatio: "16/9", borderRadius: 8, flexShrink: 0, overflow: "hidden",
                    background: gradient, position: "relative",
                  }}>
                    {l.thumbnailUrl && (
                      <img src={l.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    {l.progressPct >= 100 && (
                      <div style={{ position: "absolute", top: 3, left: 3, background: "#22c55e", borderRadius: 99, padding: "1px 5px", fontSize: 9, fontWeight: 700, color: "#fff" }}>✓</div>
                    )}
                    {l.durationSeconds && (
                      <div style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,.7)", borderRadius: 4, padding: "0 4px", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                        {fmtSec(l.durationSeconds)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{l.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
