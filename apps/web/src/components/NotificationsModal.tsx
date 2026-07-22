import { createPortal } from "react-dom";
import { Icon } from "@chess-school/ui";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  type AppNotification,
} from "../lib/queries.js";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozirgina";
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kecha";
  return `${d} kun oldin`;
}

function NotifRow({ n, onMarkRead }: { n: AppNotification; onMarkRead: (id: string) => void }) {
  const unread = !n.readAt;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
      background: unread ? "rgba(59,130,246,.08)" : "transparent",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: unread ? "rgba(59,130,246,.15)" : "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: unread ? "#3b82f6" : "var(--text-faint)",
      }}>
        <Icon name={n.icon} size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: unread ? 700 : 500, fontSize: 13.5 }}>{n.title}</span>
          {unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />}
        </div>
        {n.body && <div style={{ color: "var(--text-faint)", fontSize: 12.5, marginTop: 2 }}>{n.body}</div>}
        <div style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
      </div>
      {unread && (
        <button title="O'qildi" onClick={() => onMarkRead(n.id)}
          style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="check" size={12} style={{ color: "var(--text-faint)" }} />
        </button>
      )}
    </div>
  );
}

export function NotificationsModal({ onClose }: { onClose: () => void }) {
  const { data: notifs = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCnt = notifs.filter((n) => !n.readAt).length;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "24px 0 12px", width: 440, maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px 16px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Bildirishnomalar</div>
            {unreadCnt > 0 && <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{unreadCnt} ta o'qilmagan</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {unreadCnt > 0 && (
              <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }} disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
                Barchasini o'qish
              </button>
            )}
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="x" size={13} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 10px 8px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : notifs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>🔔</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Bildirishnomalar yo'q</div>
              <div style={{ fontSize: 12.5 }}>Yangi xabarlar shu yerda ko'rinadi</div>
            </div>
          ) : notifs.map((n) => (
            <NotifRow key={n.id} n={n} onMarkRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
