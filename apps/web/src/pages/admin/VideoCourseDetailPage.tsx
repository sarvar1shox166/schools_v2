import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Icon } from "@chess-school/ui";
import {
  useVideoCourseDetail, useDeleteVideoCourse, useUpdateVideoLesson, useDeleteVideoLesson,
  useVideoQuiz, useAddQuizQuestion, useDeleteQuizQuestion, useUploadImage, useUpdateVideoCourse,
  useCourseExam, useAddExamQuestion, useDeleteExamQuestion,
  type VideoCourse, type VideoLessonItem, type VideoCourseDetail,
} from "../../lib/queries.js";
import { startLessonUpload, MAX_VIDEO_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_GB } from "../../lib/videoUpload.js";
import { showError } from "../../lib/errorToast.js";
import {
  CATEGORIES, CAT_COLORS, formatDuration, AddCourseModal, labelSt,
} from "./VideoCoursesPage.js";

// ---- Yakuniy test (kurs darajasida) ----
function ExamSection({ courseId }: { courseId: string }) {
  const { data: questions = [] } = useCourseExam(courseId);
  const addQuestion = useAddExamQuestion();
  const deleteQuestion = useDeleteExamQuestion();

  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  async function handleAdd() {
    const cleanOpts = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || cleanOpts.length < 2) return;
    await addQuestion.mutateAsync({ courseId, question: q.trim(), options: cleanOpts, correctIndex: Math.min(correctIndex, cleanOpts.length - 1) });
    setQ(""); setOpts(["", "", "", ""]); setCorrectIndex(0);
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Yakuniy test</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
            Kursning barcha darslarini tugatgan o'quvchi shu testni topshiradi
          </div>
        </div>
      </div>

      <label style={labelSt}>SAVOLLAR ({questions.length})</label>
      {questions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {questions.map((qq, i) => (
            <div key={qq.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{i + 1}. {qq.question}</span>
              <button onClick={() => deleteQuestion.mutate({ questionId: qq.id, courseId })}
                style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <Icon name="x" size={12} style={{ color: "#ef4444" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <input className="inp" style={{ width: "100%" }} placeholder="Savol matni"
          value={q} onChange={(e) => setQ(e.target.value)} />
        {opts.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} title="To'g'ri javob" />
            <input className="inp" style={{ width: "100%" }} placeholder={`Variant ${i + 1}${i < 2 ? "" : " (ixtiyoriy)"}`}
              value={o} onChange={(e) => setOpts(opts.map((v, idx) => idx === i ? e.target.value : v))} />
          </div>
        ))}
        <button type="button" className="btn sm" onClick={handleAdd} disabled={addQuestion.isPending}>
          <Icon name="plus" size={12} /> Savol qo'shish
        </button>
      </div>
    </Card>
  );
}

// ---- Kurs sozlamalari: XP miqdorlari ----
function CourseSettingsCard({ course }: { course: VideoCourseDetail }) {
  const updateCourse = useUpdateVideoCourse();
  const [lessonXp, setLessonXp] = useState(String(course.lessonCompletionXp));
  const [courseXp, setCourseXp] = useState(String(course.courseCompletionXp));
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await updateCourse.mutateAsync({
      id: course.id,
      lessonCompletionXp: Math.max(0, Number(lessonXp) || 0),
      courseCompletionXp: Math.max(0, Number(courseXp) || 0),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Kurs sozlamalari</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
            XP faqat video to'liq ko'rilgan VA testi (bo'lsa) muvaffaqiyatli topshirilganda beriladi
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelSt}>HAR BIR DARSNI TUGATISH UCHUN XP</label>
          <input className="inp" style={{ width: "100%" }} type="number" min={0} value={lessonXp}
            onChange={(e) => setLessonXp(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={labelSt}>KURSNI TUGATISH UCHUN XP</label>
          <input className="inp" style={{ width: "100%" }} type="number" min={0} value={courseXp}
            onChange={(e) => setCourseXp(e.target.value)} />
        </div>
      </div>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={updateCourse.isPending} onClick={handleSave}>
        {updateCourse.isPending ? "Saqlanmoqda..." : saved ? "✓ Saqlandi" : "Saqlash"}
      </button>
    </Card>
  );
}

// ---- Quiz section (per lesson) ----
function QuizSection({ videoId }: { videoId: string }) {
  const { data: questions = [] } = useVideoQuiz(videoId);
  const addQuestion = useAddQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion();

  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  async function handleAdd() {
    const cleanOpts = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || cleanOpts.length < 2) return;
    await addQuestion.mutateAsync({ videoId, question: q.trim(), options: cleanOpts, correctIndex: Math.min(correctIndex, cleanOpts.length - 1) });
    setQ(""); setOpts(["", "", "", ""]); setCorrectIndex(0);
  }

  return (
    <div style={{ marginTop: 4 }}>
      <label style={labelSt}>TEST SAVOLLARI ({questions.length})</label>

      {questions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {questions.map((qq, i) => (
            <div key={qq.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{i + 1}. {qq.question}</span>
              <button onClick={() => deleteQuestion.mutate({ questionId: qq.id, videoId })}
                style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <Icon name="x" size={12} style={{ color: "#ef4444" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <input className="inp" style={{ width: "100%" }} placeholder="Savol matni"
          value={q} onChange={(e) => setQ(e.target.value)} />
        {opts.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} title="To'g'ri javob" />
            <input className="inp" style={{ width: "100%" }} placeholder={`Variant ${i + 1}${i < 2 ? "" : " (ixtiyoriy)"}`}
              value={o} onChange={(e) => setOpts(opts.map((v, idx) => idx === i ? e.target.value : v))} />
          </div>
        ))}
        <button type="button" className="btn sm" onClick={handleAdd} disabled={addQuestion.isPending}>
          <Icon name="plus" size={12} /> Savol qo'shish
        </button>
      </div>
    </div>
  );
}

// ---- Add / Edit Lesson Modal ----
function AddLessonModal({ courseId, lesson, onClose }: { courseId: string; lesson?: VideoLessonItem; onClose: () => void }) {
  const isEdit = !!lesson;
  const updateLesson = useUpdateVideoLesson();
  const uploadImage = useUploadImage();
  const videoRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState(lesson?.thumbnailUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || (!isEdit && !videoFile)) return;
    if (videoFile) {
      startLessonUpload({ courseId, title: title.trim(), videoFile, thumbnailFile: thumbFile ?? undefined, isEdit, editLessonId: lesson?.id });
      onClose();
      return;
    }
    setSaving(true);
    try {
      let thumbnailUrl: string | undefined;
      if (thumbFile) thumbnailUrl = (await uploadImage.mutateAsync(thumbFile)).url;
      await updateLesson.mutateAsync({ id: lesson!.id, courseId, title: title.trim(), thumbnailUrl });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{isEdit ? "Darsni tahrirlash" : "Yangi video-dars"}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>VIDEO FAYL {isEdit && "(ixtiyoriy — almashtirish uchun)"}</label>
            <div onClick={() => videoRef.current?.click()} style={{
              border: "2px dashed var(--border)", borderRadius: 10, padding: "20px 12px",
              textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
            }}>
              {videoFile ? (
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  <Icon name="check" size={14} style={{ color: "#059669", marginRight: 6 }} />
                  {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              ) : isEdit ? (
                <div style={{ color: "var(--text-faint)", fontSize: 13 }}>
                  <Icon name="check" size={14} style={{ color: "#059669", marginRight: 6 }} />
                  Mavjud video saqlanadi
                </div>
              ) : (
                <div style={{ color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>🎬</div>
                  <div style={{ fontSize: 13 }}>MP4, WebM yoki MOV yuklang</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>
              Maksimal video hajmi: {MAX_VIDEO_UPLOAD_GB} GB
            </div>
            <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > MAX_VIDEO_UPLOAD_BYTES) {
                  showError(`Fayl juda katta (${(f.size / 1024 / 1024 / 1024).toFixed(2)} GB). Maksimal video hajmi: ${MAX_VIDEO_UPLOAD_GB} GB`);
                  e.target.value = "";
                  return;
                }
                setVideoFile(f);
              }} />
          </div>

          <div>
            <label style={labelSt}>MUQOVA RASMI (IXTIYORIY)</label>
            <div onClick={() => imgRef.current?.click()} style={{
              border: "2px dashed var(--border)", borderRadius: 10, padding: thumbPreview ? "8px" : "16px 12px",
              textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
            }}>
              {thumbPreview ? (
                <img src={thumbPreview} alt="" style={{ maxHeight: 80, borderRadius: 6, objectFit: "cover" }} />
              ) : (
                <div style={{ color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🖼</div>
                  <div style={{ fontSize: 12 }}>Muqova rasm (JPG/PNG)</div>
                </div>
              )}
            </div>
            <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
              }} />
          </div>

          <div>
            <label style={labelSt}>DARS NOMI</label>
            <input className="inp" style={{ width: "100%" }} placeholder="Masalan: 1-dars — Kirish" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!title.trim() || (!isEdit && !videoFile) || saving} onClick={handleSave}>
            <Icon name="upload" size={14} /> Saqlash
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---- Lesson row ----
function LessonRow({ lesson, courseId, index }: { lesson: VideoLessonItem; courseId: string; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const deleteLesson = useDeleteVideoLesson();

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`"${lesson.title}" o'chirilsinmi?`)) {
      deleteLesson.mutate({ id: lesson.id, courseId });
    }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div onClick={() => setExpanded((e) => !e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "var(--text-faint)", flexShrink: 0 }}>
          {index + 1}
        </span>
        <div style={{
          width: 52, height: 34, borderRadius: 6, flexShrink: 0, overflow: "hidden",
          background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {lesson.thumbnailUrl ? (
            <img src={lesson.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 16, opacity: 0.5 }}>🎬</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{lesson.title}</div>
          {lesson.durationSeconds != null && (
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>⏱ {formatDuration(lesson.durationSeconds)}</div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="iconbtn" title="Tahrirlash">
          <Icon name="edit" size={13} />
        </button>
        <button onClick={handleDelete} className="iconbtn" title="O'chirish" style={{ color: "#ef4444" }}>
          <Icon name="trash" size={13} />
        </button>
        <Icon name="chevronDown" size={14} style={{ color: "var(--text-faint)", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", flexShrink: 0 }} />
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 18px 54px" }}>
          <div style={{ background: "#000", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", marginBottom: 14, maxWidth: 480 }}>
            <video src={lesson.videoUrl} controls style={{ width: "100%", height: "100%" }} />
          </div>
          <QuizSection videoId={lesson.id} />
        </div>
      )}

      {editing && <AddLessonModal courseId={courseId} lesson={lesson} onClose={() => setEditing(false)} />}
    </div>
  );
}

export default function VideoCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading } = useVideoCourseDetail(courseId);
  const deleteCourse = useDeleteVideoCourse();
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>;
  }

  if (!course) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>
        Kurs topilmadi.
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => navigate("/admin/video-courses")}>← Ro'yxatga qaytish</button>
        </div>
      </div>
    );
  }

  const color = CAT_COLORS[course.category] ?? "#3b82f6";
  const catLabel = CATEGORIES.find((c) => c.key === course.category)?.label ?? course.category;

  function handleDeleteCourse() {
    if (!course) return;
    if (confirm(`"${course.title}" kursi va undagi barcha videolar o'chirilsinmi?`)) {
      deleteCourse.mutate(course.id, { onSuccess: () => navigate("/admin/video-courses") });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <button className="btn" onClick={() => navigate("/admin/video-courses")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="chevronDown" size={13} style={{ transform: "rotate(90deg)" }} /> Orqaga
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowEditCourse(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="edit" size={13} /> Tahrirlash
          </button>
          <button className="btn" onClick={handleDeleteCourse} style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444" }}>
            <Icon name="trash" size={13} /> O'chirish
          </button>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20 }}>
          <div style={{
            width: 96, height: 64, borderRadius: 10, flexShrink: 0, overflow: "hidden",
            background: color + "22", border: "1.5px solid " + color + "44",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 28 }}>♟</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ padding: "2px 10px", borderRadius: 99, background: color + "22", color, fontSize: 11.5, fontWeight: 700 }}>{catLabel}</span>
              <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{course.lessons.length} ta video</span>
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{course.title}</h2>
          </div>
        </div>
      </Card>

      <CourseSettingsCard course={course} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Video darslar</h3>
        <button className="btn primary" onClick={() => setShowAddLesson(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} /> Video qo'shish
        </button>
      </div>

      <Card style={{ padding: 0 }}>
        {course.lessons.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)" }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Bu kursda hali video yo'q</div>
            <div style={{ fontSize: 13 }}>Yuqoridagi "Video qo'shish" tugmasini bosing</div>
          </div>
        ) : (
          course.lessons.map((lesson, i) => (
            <LessonRow key={lesson.id} lesson={lesson} courseId={course.id} index={i} />
          ))
        )}
      </Card>

      <ExamSection courseId={course.id} />

      {showEditCourse && <AddCourseModal course={course} onClose={() => setShowEditCourse(false)} />}
      {showAddLesson && <AddLessonModal courseId={course.id} onClose={() => setShowAddLesson(false)} />}
    </div>
  );
}
