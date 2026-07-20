import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card, Icon, StatCard } from "@chess-school/ui";
import {
  useVideoCourses, useCreateVideoCourse, useUpdateVideoCourse, useUploadImage,
  type VideoCourse,
} from "../../lib/queries.js";

export const CATEGORIES = [
  { key: "zoom",       label: "Zoom yozuvlari" },
  { key: "debyut",     label: "Debyutlar"      },
  { key: "taktika",    label: "Taktika"        },
  { key: "endshpil",   label: "Endshpil"       },
  { key: "strategiya", label: "Strategiya"     },
] as const;
export type Category = typeof CATEGORIES[number]["key"];

export const CAT_COLORS: Record<string, string> = {
  zoom: "#3b82f6", debyut: "#10b981", taktika: "#f59e0b",
  endshpil: "#8b5cf6", strategiya: "#ec4899",
};

export function formatDuration(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  color: "var(--text-faint)", marginBottom: 5, textTransform: "uppercase",
};

// ---- Add / Edit Course Modal ----
export function AddCourseModal({ course, onClose }: { course?: VideoCourse; onClose: () => void }) {
  const isEdit = !!course;
  const createCourse = useCreateVideoCourse();
  const updateCourse = useUpdateVideoCourse();
  const uploadImage = useUploadImage();
  const imgRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: course?.title ?? "",
    category: (course?.category ?? "debyut") as Category,
    thumbnailColor: course?.thumbnailColor ?? CAT_COLORS.debyut,
  });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState(course?.thumbnailUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let thumbnailUrl: string | undefined;
      if (imgFile) thumbnailUrl = (await uploadImage.mutateAsync(imgFile)).url;
      if (isEdit) {
        await updateCourse.mutateAsync({
          id: course!.id,
          title: form.title.trim(),
          category: form.category,
          thumbnailUrl,
          thumbnailColor: form.thumbnailColor,
        });
      } else {
        await createCourse.mutateAsync({
          title: form.title.trim(),
          category: form.category,
          thumbnailUrl,
          thumbnailColor: form.thumbnailColor,
        });
      }
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
          <div style={{ fontWeight: 800, fontSize: 17 }}>{isEdit ? "Kursni tahrirlash" : "Yangi kurs"}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>MUQOVA RASMI (IXTIYORIY)</label>
            <div onClick={() => imgRef.current?.click()} style={{
              border: "2px dashed var(--border)", borderRadius: 10, padding: imgPreview ? "8px" : "16px 12px",
              textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
            }}>
              {imgPreview ? (
                <img src={imgPreview} alt="" style={{ maxHeight: 90, borderRadius: 6, objectFit: "cover" }} />
              ) : (
                <div style={{ color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>🖼</div>
                  <div style={{ fontSize: 12 }}>Muqova rasm (JPG/PNG)</div>
                </div>
              )}
            </div>
            <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)); }
              }} />
          </div>

          <div>
            <label style={labelSt}>KURS NOMI</label>
            <input className="inp" style={{ width: "100%" }} placeholder="Masalan: Siciliya mudofaasi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <label style={labelSt}>KATEGORIYA</label>
            <select className="inp" style={{ width: "100%" }} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category, thumbnailColor: CAT_COLORS[e.target.value] ?? "#3b82f6" })}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
          <button className="btn primary" style={{ flex: 2 }} disabled={!form.title.trim() || saving} onClick={handleSave}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---- Course Card ----
function CourseCard({ c, onClick }: { c: VideoCourse; onClick: () => void }) {
  const color = CAT_COLORS[c.category] ?? "#3b82f6";
  const catLabel = CATEGORIES.find((cat) => cat.key === c.category)?.label ?? c.category;

  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
      <div style={{
        width: 80, height: 52, borderRadius: 8, flexShrink: 0, overflow: "hidden",
        background: color + "22", border: "1.5px solid " + color + "44",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {c.thumbnailUrl ? (
          <img src={c.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 24 }}>♟</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--text-faint)" }}>
          <span style={{ padding: "1px 8px", borderRadius: 99, background: color + "22", color, fontSize: 11, fontWeight: 700 }}>{catLabel}</span>
          <span>{c.videoCount} ta video</span>
        </div>
      </div>
      <Icon name="chevronDown" size={15} style={{ color: "var(--text-faint)", transform: "rotate(-90deg)", flexShrink: 0 }} />
    </div>
  );
}

// ---- Page ----
export default function VideoCoursesPage() {
  const navigate = useNavigate();
  const { data: courses = [], isLoading } = useVideoCourses();
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("hammasi");

  const filtered = filterCat === "hammasi" ? courses : courses.filter((c) => c.category === filterCat);
  const totalVideos = courses.reduce((sum, c) => sum + c.videoCount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Video darsliklar</h2>
        <button className="btn primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} /> Kurs qo'shish
        </button>
      </div>

      <div className="grid cols-3">
        <StatCard icon="video" tone="i" value={String(courses.length)} label="Jami kurslar" />
        <StatCard icon="students" tone="s" value={String(totalVideos)} label="Jami videolar" />
        <StatCard icon="barChart" tone="w"
          value={String(CATEGORIES.filter((c) => courses.some((x) => x.category === c.key)).length)}
          label="Kategoriyalar" />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[{ key: "hammasi", label: "Barchasi" }, ...CATEGORIES].map((c) => (
          <button key={c.key} onClick={() => setFilterCat(c.key)}
            style={{
              padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer",
              fontWeight: filterCat === c.key ? 700 : 500, fontSize: 13,
              background: filterCat === c.key ? "var(--accent)" : "var(--surface-2)",
              color: filterCat === c.key ? "#fff" : "var(--text-faint)",
            }}>
            {c.label}
            {c.key !== "hammasi" && (
              <span style={{ marginLeft: 5, opacity: 0.7 }}>({courses.filter((x) => x.category === c.key).length})</span>
            )}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "56px 0", textAlign: "center", color: "var(--text-faint)" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Kurs yo'q</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Yuqoridagi "Kurs qo'shish" tugmasini bosing</div>
            <button className="btn primary" onClick={() => setShowModal(true)}>+ Kurs qo'shish</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((c) => (
              <CourseCard key={c.id} c={c} onClick={() => navigate(`/admin/video-courses/${c.id}`)} />
            ))}
          </div>
        )}
      </Card>

      {showModal && <AddCourseModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
