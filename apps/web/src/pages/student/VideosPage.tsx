import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@chess-school/ui";
import { useVideos, type VideoLesson } from "../../lib/queries.js";
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

/* ── Video card ──────────────────────────────────────────────────────────── */

function VideoCard({ video, idx, categoryLabel }: { video: VideoLesson; idx: number; categoryLabel: string }) {
  const navigate = useNavigate();
  const watched = video.progressPct >= 100;
  const grad = video.thumbnailColor
    ? `linear-gradient(135deg,${video.thumbnailColor}44,${video.thumbnailColor}99)`
    : GRAD_PALETTE[idx % GRAD_PALETTE.length];

  function handleClick() {
    const state: VideoWatchState = {
      title: video.title,
      courseTitle: categoryLabel,
      videoUrl: video.videoUrl,
      gradient: grad,
      duration: fmtSec(video.durationSeconds),
      watched,
    };
    navigate(`/student/videos/watch/${video.id}`, { state });
  }

  return (
    <div style={{ cursor: "pointer" }} onClick={handleClick}>
      <div style={{ borderRadius: 14, overflow: "hidden", background: grad, aspectRatio: "16/9", position: "relative", marginBottom: 10 }}>
        {watched && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#22c55e", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
            ✓ Ko'rildi
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid #fff", marginLeft: 4 }} />
          </div>
        </div>
        {video.durationSeconds && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.7)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
            {fmtSec(video.durationSeconds)}
          </div>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{video.title}</div>
    </div>
  );
}

/* ── Category detail view ────────────────────────────────────────────────── */

function CategoryVideos({ category, onBack }: { category: string; onBack: () => void }) {
  const { data: videos = [], isLoading } = useVideos(category);
  const meta = CATEGORY_META[category] ?? { label: category, gradient: GRAD_PALETTE[0] };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 16, padding: 0 }}
      >
        ← {meta.label}
      </button>

      <div style={{ width: "100%", height: 220, borderRadius: 18, background: meta.gradient, marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, opacity: .08, userSelect: "none" }}>
          ♟
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 40, fontSize: 14 }}>Yuklanmoqda...</div>
      ) : videos.length === 0 ? (
        <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 40, fontSize: 14 }}>Video darslar hali qo'shilmagan</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {videos.map((v, i) => (
            <VideoCard key={v.id} video={v} idx={i} categoryLabel={meta.label} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function VideosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: allVideos = [], isLoading } = useVideos();

  if (selectedCategory) {
    return <CategoryVideos category={selectedCategory} onBack={() => setSelectedCategory(null)} />;
  }

  // Group videos by category
  const byCategory = allVideos.reduce<Record<string, VideoLesson[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const categories = Object.keys(byCategory);

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 60, fontSize: 14 }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (categories.length === 0) {
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
      {categories.map(cat => {
        const videos = byCategory[cat];
        const meta = CATEGORY_META[cat] ?? { label: cat, gradient: GRAD_PALETTE[0] };
        const watched = videos.filter(v => v.progressPct >= 100).length;

        return (
          <div key={cat} onClick={() => setSelectedCategory(cat)} style={{ cursor: "pointer" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", background: meta.gradient, aspectRatio: "16/9", position: "relative", marginBottom: 12 }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, opacity: .08, userSelect: "none" }}>
                ♟
              </div>
              <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.65)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                {videos.length} video
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{meta.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "#f59e0b", width: `${(watched / videos.length) * 100}%` }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-faint)", flexShrink: 0, fontWeight: 600 }}>
                {watched}/{videos.length} dars
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
