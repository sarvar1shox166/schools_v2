import { useVideoUploadJobs, cancelVideoUpload } from "../lib/videoUpload.js";

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

const STATUS_TEXT: Record<string, string> = {
  success: "Video yuklandi",
  cancelled: "Bekor qilindi",
};

export function VideoUploadToast() {
  const jobs = useVideoUploadJobs();
  if (jobs.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 2000,
      display: "flex", flexDirection: "column", gap: 8, width: 300,
    }}>
      {jobs.map((j) => (
        <div key={j.id} style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {j.status === "uploading" && (
              <span style={{
                width: 16, height: 16, flexShrink: 0, borderRadius: "50%",
                border: "2px solid var(--border)", borderTopColor: "var(--accent)",
                animation: "video-upload-spin 0.8s linear infinite",
              }} />
            )}
            {j.status === "success" && <span style={{ color: "#10b981", fontSize: 16, flexShrink: 0 }}>✓</span>}
            {j.status === "error" && <span style={{ color: "#ef4444", fontSize: 16, flexShrink: 0 }}>✕</span>}
            {j.status === "cancelled" && <span style={{ color: "var(--text-faint)", fontSize: 16, flexShrink: 0 }}>⊘</span>}
            <div style={{ fontSize: 13, minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                {j.status === "uploading"
                  ? `${j.progressPct}% • ${formatMB(j.loadedBytes)} / ${formatMB(j.totalBytes)} MB`
                  : j.status === "error" ? j.error : STATUS_TEXT[j.status]}
              </div>
            </div>
            {j.status === "uploading" && (
              <button
                onClick={() => cancelVideoUpload(j.id)}
                title="Bekor qilish"
                style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: "none",
                  background: "var(--surface-2)", color: "var(--text-faint)", cursor: "pointer",
                  display: "grid", placeItems: "center", fontSize: 13, lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
          {j.status === "uploading" && (
            <div style={{ height: 4, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${j.progressPct}%`, background: "var(--accent)",
                borderRadius: 99, transition: "width 0.15s linear",
              }} />
            </div>
          )}
        </div>
      ))}
      <style>{`@keyframes video-upload-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
