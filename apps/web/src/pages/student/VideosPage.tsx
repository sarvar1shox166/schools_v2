import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, showXp } from "@chess-school/ui";
import {
  useVideoCourses, useVideoCourseDetail, useCourseExam, useSubmitCourseExam,
  type VideoCourse, type VideoLessonItem,
} from "../../lib/queries.js";
import type { VideoWatchState } from "./VideoWatchPage.js";

/* ── Category metadata ───────────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; gradient: string }> = {
  debyut:     { label: "Debyutlar",      gradient: "linear-gradient(135deg,#1e3a5f 0%,#1565c0 60%,#1e88e5 100%)" },
  taktika:    { label: "Taktika",        gradient: "linear-gradient(135deg,#064e3b 0%,#059669 100%)" },
  endshpil:   { label: "Endshpil",       gradient: "linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)" },
  strategiya: { label: "Strategiya",     gradient: "linear-gradient(135deg,#78350f 0%,#d97706 100%)" },
  zoom:       { label: "Zoom yozuvlari", gradient: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" },
};

const GRAD_PALETTE = [
  "linear-gradient(135deg,#1e3a5f,#1565c0)",
  "linear-gradient(135deg,#4c1d95,#7c3aed)",
  "linear-gradient(135deg,#064e3b,#059669)",
  "linear-gradient(135deg,#78350f,#d97706)",
  "linear-gradient(135deg,#7c1d1d,#dc2626)",
  "linear-gradient(135deg,#1e1b4b,#4f46e5)",
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtSec(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Lesson card ─────────────────────────────────────────────────────────── */

function LessonCard({ lesson, idx, course }: { lesson: VideoLessonItem; idx: number; course: VideoCourse }) {
  const navigate = useNavigate();
  const watched = lesson.progressPct >= 100;
  const grad = course.thumbnailColor
    ? `linear-gradient(135deg,${course.thumbnailColor}44,${course.thumbnailColor}99)`
    : GRAD_PALETTE[idx % GRAD_PALETTE.length];

  function handleClick() {
    const state: VideoWatchState = {
      title: lesson.title,
      courseTitle: course.title,
      courseId: course.id,
      videoUrl: lesson.videoUrl,
      thumbnailUrl: lesson.thumbnailUrl ?? course.thumbnailUrl ?? undefined,
      gradient: grad,
      duration: fmtSec(lesson.durationSeconds),
      watched,
    };
    navigate(`/student/videos/watch/${lesson.id}`, { state });
  }

  return (
    <div style={{ cursor: "pointer" }} onClick={handleClick}>
      <div style={{ borderRadius: 14, overflow: "hidden", background: grad, aspectRatio: "16/9", position: "relative", marginBottom: 10 }}>
        {lesson.thumbnailUrl && (
          <img src={lesson.thumbnailUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {lesson.lessonDone ? (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#22c55e", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
            🏅 Tugallandi
          </div>
        ) : watched && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#3b82f6", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
            ✓ Ko'rildi
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid #fff", marginLeft: 4 }} />
          </div>
        </div>
        {lesson.durationSeconds && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.7)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
            {fmtSec(lesson.durationSeconds)}
          </div>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{lesson.title}</div>
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
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, color: "var(--text-faint)" }}>Yuklanmoqda...</div>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && result) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 26, width: 460, maxWidth: "100%" }}>
        {!result ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>🏆 Yakuniy test</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", fontWeight: 700 }}>{current + 1}/{questions.length}</div>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ height: "100%", borderRadius: 99, background: "#f59e0b", width: `${((current + 1) / questions.length) * 100}%`, transition: "width .3s" }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 16, lineHeight: 1.5 }}>{q.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {q.options.map((opt, i) => {
                const picked = list[current] === i;
                return (
                  <button key={i} onClick={() => setAnswers(list.map((a, idx) => idx === current ? i : a))}
                    style={{
                      textAlign: "left", padding: "12px 16px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600,
                      background: picked ? "rgba(245,158,11,.18)" : "var(--surface-2)",
                      border: picked ? "1.5px solid #f59e0b" : "1.5px solid var(--border)",
                      color: picked ? "#f59e0b" : "inherit",
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
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
              {result.score === result.total ? "Kurs muvaffaqiyatli tugatildi!" : "Yana urinib ko'ring"}
            </div>
            <div style={{ fontSize: 14.5, color: "var(--text-faint)", marginBottom: 20 }}>
              {result.score}/{result.total} to'g'ri
              {result.courseXpAwarded ? <> · <span style={{ color: "#f59e0b", fontWeight: 700 }}>+{result.courseXpAwarded} XP</span></> : null}
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
    <div style={{ marginTop: 24, padding: 20, borderRadius: 16, background: exam.completed ? "rgba(34,197,94,.08)" : "var(--surface-2)", border: `1.5px solid ${exam.completed ? "rgba(34,197,94,.3)" : "var(--border)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 30 }}>{exam.completed ? "🏆" : exam.allLessonsDone ? "🏆" : "🔒"}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>Yakuniy test</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>
            {exam.completed
              ? "Siz bu kursni muvaffaqiyatli tugatdingiz"
              : exam.allLessonsDone
              ? "Barcha darslar tugallandi — testni topshirishingiz mumkin"
              : "Avval barcha darslarni (video + test) tugating"}
          </div>
        </div>
        {exam.allLessonsDone && (
          <button className="btn primary" style={{ background: "#f59e0b", border: "none" }} onClick={() => setOpen(true)}>
            {exam.completed ? "Qayta topshirish" : "Testni boshlash"}
          </button>
        )}
      </div>
      {open && <CourseExamModal courseId={courseId} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ── Course detail view ─────────────────────────────────────────────────── */

function CourseLessons({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const { data: course, isLoading } = useVideoCourseDetail(courseId);
  const meta = course ? (CATEGORY_META[course.category] ?? { label: course.category, gradient: GRAD_PALETTE[0] }) : { label: "", gradient: GRAD_PALETTE[0] };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}
      >
        ← {course?.title ?? meta.label}
      </button>

      <div style={{ width: "100%", height: 220, borderRadius: 18, background: meta.gradient, marginBottom: 18, position: "relative", overflow: "hidden" }}>
        {course?.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, opacity: .08, userSelect: "none" }}>
            ♟
          </div>
        )}
      </div>

      {isLoading || !course ? (
        <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 40, fontSize: 14 }}>Yuklanmoqda...</div>
      ) : course.lessons.length === 0 ? (
        <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 40, fontSize: 14 }}>Video darslar hali qo'shilmagan</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {course.lessons.map((lesson, i) => (
              <LessonCard key={lesson.id} lesson={lesson} idx={i} course={course} />
            ))}
          </div>
          {course.exam && <ExamCard courseId={course.id} exam={course.exam} />}
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
      <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 60, fontSize: 14 }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card style={{ padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Video darsliklar hali qo'shilmagan</div>
        <div style={{ color: "var(--text-faint)", fontSize: 13 }}>
          O'qituvchingiz yangi video darslar qo'shishi bilan bu yerda ko'rinadi
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
      {courses.map((c) => {
        const meta = CATEGORY_META[c.category] ?? { label: c.category, gradient: GRAD_PALETTE[0] };

        return (
          <div key={c.id} onClick={() => setSelectedCourseId(c.id)} style={{ cursor: "pointer" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", background: meta.gradient, aspectRatio: "16/9", position: "relative", marginBottom: 12 }}>
              {c.thumbnailUrl ? (
                <img src={c.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, opacity: .08, userSelect: "none" }}>
                  ♟
                </div>
              )}
              <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.65)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                {c.videoCount} video
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{c.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "#f59e0b", width: c.videoCount ? `${(c.watchedCount / c.videoCount) * 100}%` : "0%" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-faint)", flexShrink: 0, fontWeight: 600 }}>
                {c.watchedCount}/{c.videoCount} dars
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
