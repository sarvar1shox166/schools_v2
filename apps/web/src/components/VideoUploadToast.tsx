import { useVideoUploadJobs } from "../lib/videoUpload.js";

export function VideoUploadToast() {
  const jobs = useVideoUploadJobs();
  if (jobs.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 2000,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {jobs.map((j) => (
        <div key={j.id} style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,.18)", minWidth: 270,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {j.status === "uploading" && (
            <span style={{
              width: 16, height: 16, flexShrink: 0, borderRadius: "50%",
              border: "2px solid var(--border)", borderTopColor: "var(--accent)",
              animation: "video-upload-spin 0.8s linear infinite",
            }} />
          )}
          {j.status === "success" && <span style={{ color: "#10b981", fontSize: 16, flexShrink: 0 }}>✓</span>}
          {j.status === "error" && <span style={{ color: "#ef4444", fontSize: 16, flexShrink: 0 }}>✕</span>}
          <div style={{ fontSize: 13, minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
              {j.status === "uploading" ? "Video yuklanmoqda..." : j.status === "success" ? "Video yuklandi" : j.error}
            </div>
          </div>
        </div>
      ))}
      <style>{`@keyframes video-upload-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
