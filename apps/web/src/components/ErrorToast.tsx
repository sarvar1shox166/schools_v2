import { useErrorToasts } from "../lib/errorToast.js";

export function ErrorToastHost() {
  const toasts = useErrorToasts();
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 3000,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: "#7f1d1d", color: "#fff", borderRadius: 10,
          padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: 340,
          fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
