import { useRef, useState } from "react";
import { Card, Icon, StatCard } from "@chess-school/ui";
import {
  useVideos, useCreateVideo, useDeleteVideo,
  useUploadVideo, useUploadImage,
  type VideoLesson,
} from "../../lib/queries.js";

const CATEGORIES = [
  { key: "zoom",       label: "Zoom yozuvlari" },
  { key: "debyut",     label: "Debyutlar"      },
  { key: "taktika",    label: "Taktika"        },
  { key: "endshpil",   label: "Endshpil"       },
  { key: "strategiya", label: "Strategiya"     },
] as const;
type Category = typeof CATEGORIES[number]["key"];

const CAT_COLORS: Record<string, string> = {
  zoom: "#3b82f6", debyut: "#10b981", taktika: "#f59e0b",
  endshpil: "#8b5cf6", strategiya: "#ec4899",
};

function formatDuration(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ---- Upload component ----
function FileUploadZone({ accept, label, value, onChange, uploading }: {
  accept: string; label: string;
  value: string; onChange: (url: string) => void;
  uploading: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      style={{
        border: "2px dashed var(--border)", borderRadius: 10,
        padding: "18px 12px", textAlign: "center", cursor: uploading ? "default" : "pointer",
        background: "var(--surface-2)", transition: "border-color 0.2s",
      }}>
      {value ? (
        accept.startsWith("image") ? (
          <img src={value} alt="" style={{ maxHeight: 90, borderRadius: 8, objectFit: "cover" }} />
        ) : (
          <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
            <Icon name="check" size={14} style={{ color: "#059669", marginRight: 6 }} />
            Video yuklandi
          </div>
        )
      ) : uploading ? (
        <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Yuklanmoqda...</div>
      ) : (
        <div style={{ color: "var(--text-faint)" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
          <div style={{ fontSize: 13 }}>{label}</div>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onChange(URL.createObjectURL(f));
        e.target.value = "";
      }} />
    </div>
  );
}

// ---- Add Video Modal ----
function AddVideoModal({ onClose }: { onClose: () => void }) {
  const createVideo = useCreateVideo();
  const uploadVideo = useUploadVideo();
  const uploadImage = useUploadImage();
  const videoRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    category: "debyut" as Category,
    thumbnailColor: CAT_COLORS.debyut,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim() || !videoFile) return;
    setSaving(true);
    try {
      const { url: videoUrl } = await uploadVideo.mutateAsync(videoFile);
      let thumbnailUrl: string | undefined;
      if (imgFile) {
        const res = await uploadImage.mutateAsync(imgFile);
        thumbnailUrl = res.url;
      }
      await createVideo.mutateAsync({
        title: form.title.trim(),
        category: form.category,
        videoUrl,
        thumbnailUrl,
        thumbnailColor: form.thumbnailColor,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 32px", width: 520, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Video qo'shish</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>VIDEO FAYL</label>
            <div onClick={() => videoRef.current?.click()} style={{
              border: "2px dashed var(--border)", borderRadius: 10, padding: "20px 12px",
              textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
            }}>
              {videoFile ? (
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  <Icon name="check" size={14} style={{ color: "#059669", marginRight: 6 }} />
                  {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              ) : (
                <div style={{ color: "var(--text-faint)" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>🎬</div>
                  <div style={{ fontSize: 13 }}>MP4, WebM yoki MOV yuklang</div>
                </div>
              )}
            </div>
            <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
          </div>

          <div>
            <label style={labelSt}>MUQOVA RASMI (IXTIYORIY)</label>
            <div onClick={() => imgRef.current?.click()} style={{
              border: "2px dashed var(--border)", borderRadius: 10, padding: imgPreview ? "8px" : "16px 12px",
              textAlign: "center", cursor: "pointer", background: "var(--surface-2)",
            }}>
              {imgPreview ? (
                <img src={imgPreview} alt="" style={{ maxHeight: 80, borderRadius: 6, objectFit: "cover" }} />
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
                if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)); }
              }} />
          </div>

          <div>
            <label style={labelSt}>VIDEO NOMI</label>
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
          <button className="btn primary" style={{ flex: 2 }} disabled={!form.title.trim() || !videoFile || saving} onClick={handleSave}>
            <Icon name="upload" size={14} /> {saving ? "Yuklanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Video Card ----
function VideoCard({ v, onDelete }: { v: VideoLesson; onDelete: () => void }) {
  const color = CAT_COLORS[v.category] ?? "#3b82f6";
  const catLabel = CATEGORIES.find((c) => c.key === v.category)?.label ?? v.category;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{
        width: 80, height: 52, borderRadius: 8, flexShrink: 0, overflow: "hidden",
        background: color + "22", border: "1.5px solid " + color + "44",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {v.thumbnailUrl ? (
          <img src={v.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 24 }}>♟</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{v.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--text-faint)" }}>
          <span style={{ padding: "1px 8px", borderRadius: 99, background: color + "22", color, fontSize: 11, fontWeight: 700 }}>{catLabel}</span>
          {v.durationSeconds && <span>⏱ {formatDuration(v.durationSeconds)}</span>}
        </div>
      </div>
      <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="trash" size={13} style={{ color: "#ef4444" }} />
      </button>
    </div>
  );
}

// ---- Page ----
export default function VideoCoursesPage() {
  const { data: videos = [], isLoading } = useVideos();
  const deleteVideo = useDeleteVideo();
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("hammasi");

  const filtered = filterCat === "hammasi" ? videos : videos.filter((v) => v.category === filterCat);

  const totalViews = 0; // video_progress ko'rish soni backenddan keyinroq

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Video darsliklar</h2>
        <button className="btn primary" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} /> Video qo'shish
        </button>
      </div>

      <div className="grid cols-3">
        <StatCard icon="video" tone="i" value={String(videos.length)} label="Jami videolar" />
        <StatCard icon="students" tone="s"
          value={String(CATEGORIES.filter((c) => videos.some((v) => v.category === c.key)).length)}
          label="Kategoriyalar" />
        <StatCard icon="barChart" tone="w" value={String(totalViews)} label="Ko'rishlar" />
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
              <span style={{ marginLeft: 5, opacity: 0.7 }}>({videos.filter((v) => v.category === c.key).length})</span>
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
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Video yo'q</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Yuqoridagi "Video qo'shish" tugmasini bosing</div>
            <button className="btn primary" onClick={() => setShowModal(true)}>+ Video qo'shish</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((v) => (
              <VideoCard key={v.id} v={v}
                onDelete={() => { if (confirm(`"${v.title}" o'chirilsinmi?`)) deleteVideo.mutate(v.id); }} />
            ))}
          </div>
        )}
      </Card>

      {showModal && <AddVideoModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  color: "var(--text-faint)", marginBottom: 5, textTransform: "uppercase",
};
