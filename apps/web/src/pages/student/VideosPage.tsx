import { useState } from "react";
import { Card, Icon, PageHead, Segmented } from "@chess-school/ui";
import { useUpdateVideoProgress, useVideos, type VideoLesson } from "../../lib/queries.js";

const CATS = [
  { v: "hammasi", label: "Barchasi" },
  { v: "zoom", label: "Zoom yozuvlari" },
  { v: "debyut", label: "Debyut" },
  { v: "taktika", label: "Taktika" },
  { v: "endshpil", label: "Endshpil" },
  { v: "strategiya", label: "Strategiya" },
];

function fmtDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoCard({ video }: { video: VideoLesson }) {
  const updateProgress = useUpdateVideoProgress();
  const isZoom = video.category === "zoom";
  const color = video.thumbnailColor ?? "#3F8CFF";

  function handlePlay() {
    const next = video.progressPct >= 100 ? 100 : Math.min(100, video.progressPct + 25);
    updateProgress.mutate({ videoId: video.id, progressPct: next });
  }

  return (
    <Card className="vcard" style={{ cursor: "pointer" }}>
      <div onClick={handlePlay}>
      <div
        className="vthumb"
        style={{
          background: isZoom ? "linear-gradient(135deg,#1a3a6b,#1565c0)" : `linear-gradient(135deg,${color}22,${color}55)`,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isZoom ? (
            <div
              style={{
                background: "#2D8CFF",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 800,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon name="video" size={13} /> Zoom yozuvi
            </div>
          ) : (
            <Icon name={video.thumbnailIcon ?? "video"} size={48} style={{ opacity: 0.3 }} />
          )}
        </div>
        <div className="vplay">▶</div>
        <div className="vpb">
          <div className="vpbf" style={{ width: `${video.progressPct}%`, background: isZoom ? "#2D8CFF" : color }} />
        </div>
        {video.progressPct === 100 && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: isZoom ? "#2D8CFF" : color,
              color: "#fff",
              borderRadius: 99,
              padding: "3px 9px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ✓ Ko'rildi
          </div>
        )}
      </div>
      <div className="vinfo">
        <div className="vtitle">{video.title}</div>
        <div className="vmeta">
          <span className="badge">{CATS.find((c) => c.v === video.category)?.label ?? video.category}</span>
          {video.durationSeconds && <span>⏱ {fmtDuration(video.durationSeconds)}</span>}
          {video.progressPct > 0 && video.progressPct < 100 && (
            <span style={{ color: "var(--accent)" }}>{video.progressPct}% ko'rildi</span>
          )}
        </div>
      </div>
      </div>
    </Card>
  );
}

export default function VideosPage() {
  const [cat, setCat] = useState("hammasi");
  const { data: videos, isLoading } = useVideos(cat === "hammasi" ? undefined : cat);

  return (
    <div>
      <PageHead title="Video darslar">
        <Segmented value={cat} onChange={setCat} options={CATS} />
      </PageHead>

      {isLoading && <Card className="card-pad">Yuklanmoqda...</Card>}
      {!isLoading && (videos ?? []).length === 0 && (
        <Card className="card-pad">
          <div className="empty">
            <Icon name="search" size={28} />
            <div>Video darslar yo'q</div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--gap)" }}>
        {(videos ?? []).map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
    </div>
  );
}
