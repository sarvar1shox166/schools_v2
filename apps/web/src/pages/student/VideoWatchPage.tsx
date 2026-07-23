import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { showXp } from "@chess-school/ui";
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
  const gradient    = state?.gradient    ?? "linear-gradient(135deg,#111827,#0f1a2e)";
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

  const lessonXp = course?.lessonCompletionXp ?? 0;

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
  const lessons = course?.lessons ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: lessons.length > 0 ? "1fr 340px" : "1fr", gap: 20, alignItems: "start" }}>
      <div>
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#18181c", border: "1px solid #232328", borderRadius: 10, color: "#c7d0e8", cursor: "pointer", fontSize: 12.5, fontWeight: 700, marginBottom: 16, padding: "8px 12px 8px 10px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          {courseTitle}
        </button>

        {/* Video player */}
        <div style={{ position: "relative", background: "#141417", border: "1px solid #232328", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
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
                style={{ width: "100%", height: "100%", display: "block", background: "#000" }}
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, background: gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 130, opacity: .15, userSelect: "none", color: "#fff" }}>♟</div>
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: "20px 22px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ color: "#8b93b0", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", marginBottom: 5 }}>{courseTitle.toUpperCase()}</div>
              <div style={{ color: "#f5f5f6", fontSize: 22, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{title}</div>
            </div>
            {lessonXp > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 10.5, fontWeight: 800, padding: "4px 9px", borderRadius: 99 }}>
                  +{lessonXp} XP olinadi
                </div>
                <div style={{ color: "#65666f", fontSize: 10.5 }}>Video va test tugagach</div>
              </div>
            )}
          </div>

          {/* Test section */}
          {!quizLoading && questions.length === 0 ? null : (
            <div style={{ marginTop: 8 }}>
              {phase === "idle" && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.25)", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>📝</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#f5f5f6" }}>Dars testi</div>
                    <div style={{ fontSize: 12.5, color: "#8b8d98", marginTop: 3 }}>{questions.length} ta savol</div>
                  </div>
                  <button
                    onClick={startTest} disabled={quizLoading}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: 12.5, fontWeight: 800, padding: "10px 16px", borderRadius: 10, cursor: "pointer", border: "none" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    Testni boshlash
                  </button>
                </div>
              )}

              {phase === "test" && q && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#1e1e22", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: "#3b82f6", width: `${((current + 1) / questions.length) * 100}%`, transition: "width .3s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#8b8d98", flexShrink: 0 }}>{current + 1}/{questions.length}</span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, lineHeight: 1.5, color: "#f5f5f6" }}>{q.question}</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {q.options.map((opt, i) => {
                      const picked = answers[current] === i;
                      return (
                        <button key={i} onClick={() => selectAnswer(i)}
                          style={{
                            textAlign: "left", padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s",
                            background: picked ? "rgba(59,130,246,.18)" : "#18181c",
                            border: picked ? "1.5px solid #3b82f6" : "1.5px solid #232328",
                            color: picked ? "#93c5fd" : "#e5e7eb",
                          }}>
                          <span style={{
                            display: "inline-block", width: 24, height: 24, borderRadius: "50%", textAlign: "center", lineHeight: "24px", fontSize: 12, fontWeight: 800, marginRight: 10, flexShrink: 0,
                            background: picked ? "#3b82f6" : "#232328",
                            color: picked ? "#fff" : "#8b8d98",
                          }}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    {current > 0 && (
                      <button onClick={() => setCurrent(c => c - 1)}
                        style={{ padding: "10px 16px", borderRadius: 10, background: "#18181c", border: "1px solid #232328", color: "#c7d0e8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        ← Oldingi
                      </button>
                    )}
                    {current < questions.length - 1 ? (
                      <button
                        disabled={answers[current] === null}
                        onClick={() => setCurrent(c => c + 1)}
                        style={{ padding: "10px 16px", borderRadius: 10, background: "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: answers[current] === null ? .5 : 1 }}>
                        Keyingi →
                      </button>
                    ) : (
                      <button
                        disabled={!allAnswered || submitQuiz.isPending}
                        onClick={finish}
                        style={{ padding: "10px 16px", borderRadius: 10, background: "#22c55e", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !allAnswered ? .5 : 1 }}>
                        {submitQuiz.isPending ? "Yuborilmoqda..." : "Tugatish ✓"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {phase === "done" && result && (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>{result.score === result.total ? "🏆" : result.score >= result.total / 2 ? "🎯" : "📚"}</div>
                  <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: "#f5f5f6" }}>
                    {result.score === result.total ? "Ajoyib!" : result.score >= result.total / 2 ? "Yaxshi natija!" : "Ko'proq mashq qiling!"}
                  </div>
                  <div style={{ fontSize: 15, color: "#8b8d98", marginBottom: 20 }}>
                    {result.score}/{result.total} ta savol to'g'ri
                    {result.xpAwarded ? <> · <span style={{ color: "#facc15", fontWeight: 700 }}>+{result.xpAwarded} XP</span></> : null}
                  </div>
                  <button
                    onClick={() => { setPhase("idle"); setResult(null); }}
                    style={{ padding: "10px 20px", borderRadius: 10, background: "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    Yopish
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Other lessons in this course */}
      {lessons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {course && (
            <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.14) 0%,#141417 60%)", border: "1px solid rgba(59,130,246,0.28)", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ color: "#f5f5f6", fontSize: 13, fontWeight: 800 }}>Kurs progressi</div>
                <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 800 }}>{course.watchedCount} / {course.videoCount}</div>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${course.videoCount ? (course.watchedCount / course.videoCount) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", borderRadius: 99 }} />
              </div>
            </div>
          )}

          <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: "16px 14px" }}>
            <div style={{ color: "#f5f5f6", fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Shu kursdagi darslar</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lessons.map((l) => {
                const isCurrent = l.id === videoId;
                const done = l.lessonDone || l.progressPct >= 100;
                return (
                  <div key={l.id} onClick={() => !isCurrent && goToLesson(l.id, l.title, l.videoUrl, l.thumbnailUrl, l.durationSeconds)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, cursor: isCurrent ? "default" : "pointer",
                      background: isCurrent ? "linear-gradient(135deg,rgba(59,130,246,0.12),#18181c 70%)" : "#18181c",
                      border: isCurrent ? "1px solid rgba(96,165,250,0.4)" : "1px solid #232328",
                    }}>
                    <div style={{ width: 40, height: 32, borderRadius: 7, background: done ? "rgba(34,197,94,0.15)" : isCurrent ? "rgba(59,130,246,0.15)" : "#232328", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.6"><polyline points="4 12 10 18 20 6"/></svg>
                      ) : isCurrent ? (
                        <div style={{ display: "flex", gap: 2, alignItems: "end", height: 12 }}>
                          <div style={{ width: 3, background: "#60a5fa", height: "60%", borderRadius: 1 }} />
                          <div style={{ width: 3, background: "#60a5fa", height: "100%", borderRadius: 1 }} />
                          <div style={{ width: 3, background: "#60a5fa", height: "40%", borderRadius: 1 }} />
                        </div>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b93b0" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: isCurrent ? "#f5f5f6" : "#c7d0e8" }}>{l.title}</div>
                  </div>
                );
              })}
            </div>
            {course?.exam && course.exam.questionCount > 0 && (
              <div style={{ marginTop: 14, padding: 12, background: "linear-gradient(135deg,rgba(234,179,8,0.1),rgba(234,179,8,0.03))", border: "1px dashed rgba(234,179,8,0.28)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#facc15,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏆</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#facc15", fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>Mavzu yakuniy testi</div>
                  <div style={{ color: "#8b8d98", fontSize: 10.5, marginTop: 2 }}>Barcha darslardan keyin</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
