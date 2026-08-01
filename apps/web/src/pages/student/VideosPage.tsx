import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showXp } from "@chess-school/ui";
import {
  useVideoCourses, useVideoCourseDetail, useCourseExam, useSubmitCourseExam,
  type VideoCourse, type VideoLessonItem,
} from "../../lib/queries.js";
import type { VideoWatchState } from "./VideoWatchPage.js";

/* ── Category metadata ───────────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; gradient: string }> = {
  debyut:     { label: "Debyutlar",      gradient: "linear-gradient(135deg,#111827 0%,#0f1a2e 100%)" },
  taktika:    { label: "Taktika",        gradient: "linear-gradient(135deg,#0f6b3e,#0a4a2a)" },
  endshpil:   { label: "Endshpil",       gradient: "linear-gradient(135deg,#4c1d95,#312e81)" },
  strategiya: { label: "Strategiya",     gradient: "linear-gradient(135deg,#c2410c,#7c2d12)" },
  zoom:       { label: "Zoom yozuvlari", gradient: "linear-gradient(135deg,#1a3a3f,#0f1e28)" },
};

const GRAD_PALETTE = [
  "linear-gradient(135deg,#111827,#0f1a2e)",
  "linear-gradient(135deg,#4c1d95,#312e81)",
  "linear-gradient(135deg,#0f6b3e,#0a4a2a)",
  "linear-gradient(135deg,#c2410c,#7c2d12)",
  "linear-gradient(135deg,#7c1d1d,#450a0a)",
  "linear-gradient(135deg,#1d4ed8,#1e40af)",
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtSec(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Course card (grid) ──────────────────────────────────────────────────── */

function CourseCard({ course, idx, onOpen }: { course: VideoCourse; idx: number; onOpen: () => void }) {
  const meta = CATEGORY_META[course.category] ?? { label: course.category, gradient: GRAD_PALETTE[idx % GRAD_PALETTE.length] };
  const cover = course.thumbnailColor
    ? `linear-gradient(135deg,${course.thumbnailColor}55,${course.thumbnailColor}22)`
    : meta.gradient;
  const done = course.videoCount > 0 && course.watchedCount >= course.videoCount;
  const active = !done && course.watchedCount > 0;
  const pct = course.videoCount ? Math.round((course.watchedCount / course.videoCount) * 100) : 0;
  const statusBg = done ? "linear-gradient(135deg,#22c55e,#16a34a)" : active ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : "rgba(0,0,0,.55)";
  const statusText = done ? "✓ Tugatildi" : active ? "▶ Davom eting" : "Boshlash";

  return (
    <div
      style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}
      onClick={onOpen}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: cover }}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="rgba(255,255,255,0.14)" stroke="none"><path d="M12 2a3 3 0 013 3v3.5c0 1-.5 1.5-1.5 2-1 .5-1.5 1-1.5 2v2h-3v-2c0-1-.5-1.5-1.5-2C6.5 10 6 9.5 6 8.5V5a3 3 0 013-3"/><path d="M8 16h8v3H8z"/><path d="M6 19h12v3H6z"/></svg>
          </div>
        )}
        <div style={{ position: "absolute", top: 10, left: 10, background: statusBg, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "4px 10px", borderRadius: 99, boxShadow: "0 3px 10px rgba(0,0,0,.3)", letterSpacing: "0.03em", backdropFilter: "blur(4px)" }}>
          {statusText}
        </div>
        <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 6 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", color: "#f5f5f6", fontSize: 10.5, fontWeight: 800, padding: "4px 8px", borderRadius: 99 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            {course.videoCount} video
          </div>
          {course.testCount > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", color: "#f5f5f6", fontSize: 10.5, fontWeight: 800, padding: "4px 8px", borderRadius: 99 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              {course.testCount} test
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{course.title}</div>
          {course.lessonCompletionXp > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", color: "#facc15", fontSize: 10.5, fontWeight: 800, padding: "3px 7px", borderRadius: 99, flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>+{course.lessonCompletionXp}/dars
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "#1e1e22", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", borderRadius: 99 }} />
          </div>
          <div style={{ color: "#8b8d98", fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{course.watchedCount}/{course.videoCount} dars</div>
        </div>
      </div>
    </div>
  );
}

/* ── Yakuniy test (kurs oxirida) ─────────────────────────────────────────── */

function CourseExamModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data: questions = [], isLoading } = useCourseExam(courseId);
  const submitExam = useSubmitCourseExam();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<{ score: number; total: number; courseXpAwarded?: number } | null>(null);

  if (isLoading || questions.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: 24, color: "#8b8d98" }}>Yuklanmoqda...</div>
      </div>
    );
  }

  const list = answers.length === questions.length ? answers : questions.map(() => null);
  const q = questions[current];
  const allAnswered = list.length > 0 && list.every((a) => a !== null);

  async function handleFinish() {
    const res = await submitExam.mutateAsync({ courseId, answers: list.map((a) => a ?? -1) });
    setResult(res);
    if (res.courseXpAwarded) showXp(res.courseXpAwarded, "Kurs tugatildi! Tabriklaymiz 🏆");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && result) onClose(); }}>
      <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 20, padding: 26, width: 460, maxWidth: "100%" }}>
        {!result ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#f5f5f6" }}>🏆 Yakuniy test</div>
              <div style={{ fontSize: 12.5, color: "#8b8d98", fontWeight: 700 }}>{current + 1}/{questions.length}</div>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#1e1e22", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ height: "100%", borderRadius: 99, background: "#f59e0b", width: `${((current + 1) / questions.length) * 100}%`, transition: "width .3s" }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 16, lineHeight: 1.5, color: "#f5f5f6" }}>{q.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {q.options.map((opt, i) => {
                const picked = list[current] === i;
                return (
                  <button key={i} onClick={() => setAnswers(list.map((a, idx) => idx === current ? i : a))}
                    style={{
                      textAlign: "left", padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600,
                      background: picked ? "rgba(245,158,11,.15)" : "#18181c",
                      border: picked ? "1.5px solid #f59e0b" : "1.5px solid #232328",
                      color: picked ? "#facc15" : "#e5e7eb",
                    }}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
              <button className="btn" onClick={onClose}>Bekor</button>
              <div style={{ display: "flex", gap: 10 }}>
                {current > 0 && <button className="btn" onClick={() => setCurrent((c) => c - 1)}>← Oldingi</button>}
                {current < questions.length - 1 ? (
                  <button className="btn primary" style={{ opacity: list[current] === null ? .5 : 1 }} disabled={list[current] === null}
                    onClick={() => setCurrent((c) => c + 1)}>Keyingi →</button>
                ) : (
                  <button className="btn primary" style={{ background: "#f59e0b", border: "none", opacity: !allAnswered ? .5 : 1 }}
                    disabled={!allAnswered || submitExam.isPending} onClick={handleFinish}>
                    {submitExam.isPending ? "Yuborilmoqda..." : "Tugatish ✓"}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>{result.score === result.total ? "🏆" : "📚"}</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: "#f5f5f6" }}>
              {result.score === result.total ? "Kurs muvaffaqiyatli tugatildi!" : "Yana urinib ko'ring"}
            </div>
            <div style={{ fontSize: 14.5, color: "#8b8d98", marginBottom: 20 }}>
              {result.score}/{result.total} to'g'ri
              {result.courseXpAwarded ? <> · <span style={{ color: "#facc15", fontWeight: 700 }}>+{result.courseXpAwarded} XP</span></> : null}
            </div>
            <button className="btn primary" onClick={onClose}>Yopish</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({ courseId, exam }: { courseId: string; exam: { questionCount: number; completed: boolean; allLessonsDone: boolean } }) {
  const [open, setOpen] = useState(false);
  if (exam.questionCount === 0) return null;

  return (
    <div style={{
      marginTop: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      background: exam.completed ? "linear-gradient(135deg,rgba(34,197,94,0.14) 0%,#141417 60%)" : "linear-gradient(135deg,rgba(234,179,8,0.14) 0%,#141417 60%)",
      border: `1px solid ${exam.completed ? "rgba(34,197,94,.35)" : "rgba(234,179,8,0.35)"}`, borderRadius: 16, padding: "18px 20px",
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#facc15,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, boxShadow: "0 8px 24px rgba(250,204,21,0.3)" }}>🏆</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#f5f5f6" }}>Yakuniy test</div>
        <div style={{ fontSize: 12.5, color: "#8b8d98", marginTop: 3 }}>
          {exam.completed
            ? "Siz bu kursni muvaffaqiyatli tugatdingiz"
            : exam.allLessonsDone
            ? "Barcha darslar tugallandi — testni topshirishingiz mumkin"
            : "Avval barcha darslarni (video + test) tugating"}
        </div>
      </div>
      {exam.allLessonsDone && (
        <button
          onClick={() => setOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#facc15,#f59e0b)", color: "#1a1305", fontSize: 12.5, fontWeight: 800, padding: "10px 16px", borderRadius: 10, cursor: "pointer", border: "none" }}
        >
          {exam.completed ? "Qayta topshirish" : "Testni boshlash"}
        </button>
      )}
      {open && <CourseExamModal courseId={courseId} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ── Lesson row (course detail) ──────────────────────────────────────────── */

function LessonRow({ lesson, num, xp, onOpen }: { lesson: VideoLessonItem; num: number; xp: number; onOpen: () => void }) {
  const done = lesson.lessonDone || lesson.progressPct >= 100;
  const numBg = done ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#60a5fa,#3b82f6)";
  const thumbBg = done ? "linear-gradient(135deg,#166534,#14532d)" : "linear-gradient(135deg,#1d4ed8,#312e81)";
  const pillBg = done ? "rgba(74,222,128,0.15)" : "rgba(59,130,246,0.18)";
  const pillBorder = done ? "rgba(74,222,128,0.3)" : "rgba(59,130,246,0.35)";
  const pillColor = done ? "#4ade80" : "#93c5fd";
  const pillText = done ? `Ko'rildi${xp > 0 ? ` · +${xp} XP olindi` : ""}` : "Ochiq — hoziroq ko'ring";

  return (
    <div
      onClick={onOpen}
      style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 14px", background: "#141417", border: "1px solid #232328", borderRadius: 14, cursor: "pointer" }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 9, background: numBg, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {done ? "✓" : num}
      </div>
      <div style={{ width: 120, height: 68, borderRadius: 10, background: thumbBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>
        {lesson.thumbnailUrl && <img src={lesson.thumbnailUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <div style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 800, lineHeight: 1.2 }}>{lesson.title}</div>
          <div style={{ background: pillBg, border: `1px solid ${pillBorder}`, color: pillColor, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, letterSpacing: "0.02em" }}>{pillText}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8b8d98", fontSize: 11.5, fontWeight: 600 }}>
          {lesson.durationSeconds ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              {fmtSec(lesson.durationSeconds)}
            </div>
          ) : null}
          {lesson.hasQuiz && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              Video testi{xp > 0 ? ` · +${xp} XP` : ""}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 12, fontWeight: 800, padding: "9px 14px", borderRadius: 10,
          background: done ? "#18181c" : "linear-gradient(135deg,#3b82f6,#2563eb)",
          border: done ? "1px solid #232328" : "none",
          color: done ? "#c7d0e8" : "#fff",
        }}
      >
        {done ? "Qayta ko'rish" : "Boshlash"}
      </div>
    </div>
  );
}

/* ── Course detail view ─────────────────────────────────────────────────── */

function CourseLessons({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const { data: course, isLoading } = useVideoCourseDetail(courseId);
  const navigate = useNavigate();
  const meta = course ? (CATEGORY_META[course.category] ?? { label: course.category, gradient: GRAD_PALETTE[0] }) : { label: "", gradient: GRAD_PALETTE[0] };

  function openLesson(lesson: VideoLessonItem, idx: number) {
    if (!course) return;
    const grad = course.thumbnailColor ? `linear-gradient(135deg,${course.thumbnailColor}44,${course.thumbnailColor}99)` : GRAD_PALETTE[idx % GRAD_PALETTE.length];
    const state: VideoWatchState = {
      title: lesson.title,
      courseTitle: course.title,
      courseId: course.id,
      videoUrl: lesson.videoUrl,
      thumbnailUrl: lesson.thumbnailUrl ?? course.thumbnailUrl ?? undefined,
      gradient: grad,
      duration: fmtSec(lesson.durationSeconds),
      watched: lesson.progressPct >= 100,
    };
    navigate(`/student/videos/watch/${lesson.id}`, { state });
  }

  const pct = course && course.videoCount ? Math.round((course.watchedCount / course.videoCount) * 100) : 0;

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "#18181c", border: "1px solid #232328", borderRadius: 10, color: "#c7d0e8", cursor: "pointer", fontSize: 12.5, fontWeight: 700, marginBottom: 16, padding: "8px 12px 8px 10px" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        Orqaga
      </button>

      {isLoading || !course ? (
        <div style={{ color: "#8b8d98", textAlign: "center", padding: 40, fontSize: 14 }}>Yuklanmoqda...</div>
      ) : (
        <>
          <div style={{ background: meta.gradient, border: "1px solid #232328", borderRadius: 18, padding: "26px 28px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -30, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.28),transparent 70%)" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ width: 88, height: 88, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, flexShrink: 0, boxShadow: "0 10px 30px rgba(59,130,246,0.35)" }}>♞</div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.2)", color: "#93c5fd", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, letterSpacing: "0.05em", marginBottom: 8 }}>{meta.label.toUpperCase()}</div>
                <div style={{ color: "#f5f5f6", fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: 8 }}>{course.title}</div>
                <div style={{ color: "#c7d0e8", fontSize: 13, lineHeight: 1.5, maxWidth: 640 }}>Videolarni tartib bilan ko'rib boring, har biridan keyin testni yeching va XP to'plang.</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ color: "#8b93b0", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", marginBottom: 6 }}>TUGATILDI</div>
                <div style={{ color: "#f5f5f6", fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{course.watchedCount}/{course.videoCount}</div>
                {course.lessonCompletionXp > 0 && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)", color: "#facc15", fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 99, marginTop: 8 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>
                    {course.watchedCount * course.lessonCompletionXp} / {course.videoCount * course.lessonCompletionXp} XP
                  </div>
                )}
              </div>
            </div>
            <div style={{ position: "relative", marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#a78bfa)", borderRadius: 99 }} />
                </div>
                <div style={{ color: "#8b93b0", fontSize: 11.5, fontWeight: 700 }}>{pct}%</div>
              </div>
            </div>
          </div>

          {course.lessons.length === 0 ? (
            <div style={{ color: "#8b8d98", textAlign: "center", padding: 40, fontSize: 14 }}>Video darslar hali qo'shilmagan</div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {course.lessons.map((lesson, i) => (
                  <LessonRow key={lesson.id} lesson={lesson} num={i + 1} xp={course.lessonCompletionXp} onOpen={() => openLesson(lesson, i)} />
                ))}
              </div>
              {course.exam && <ExamCard courseId={course.id} exam={course.exam} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function VideosPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const { data: courses = [], isLoading } = useVideoCourses();

  if (selectedCourseId) {
    return <CourseLessons courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} />;
  }

  if (isLoading) {
    return (
      <div style={{ color: "#8b8d98", textAlign: "center", padding: 60, fontSize: 14 }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#f5f5f6" }}>Video darsliklar hali qo'shilmagan</div>
        <div style={{ color: "#8b8d98", fontSize: 13 }}>
          O'qituvchingiz yangi video darslar qo'shishi bilan bu yerda ko'rinadi
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "linear-gradient(120deg,#0f2418 0%,#1a4a2a 50%,#1a1530 100%)", border: "1px solid #1e4a30", borderRadius: 18, padding: "26px 28px", marginBottom: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -40, fontSize: 180, lineHeight: 1, opacity: 0.06, color: "#fff" }}>♞</div>
        <div style={{ position: "absolute", top: -60, right: 60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.25),transparent 70%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.05em", marginBottom: 10 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            VIDEO DARSLAR
          </div>
          <div style={{ color: "#f5f5f6", fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.15, marginBottom: 6 }}>Ko'rib, o'rganib, XP to'plang</div>
          <div style={{ color: "#c7d0e8", fontSize: 13.5, maxWidth: 640, lineHeight: 1.5 }}>Videolarni tartib bilan tomosha qiling, har bir dars ostidagi testni yeching, mavzu oxirida esa yakuniy testdan o'ting.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {courses.map((c, i) => (
          <CourseCard key={c.id} course={c} idx={i} onOpen={() => setSelectedCourseId(c.id)} />
        ))}
      </div>
    </div>
  );
}
