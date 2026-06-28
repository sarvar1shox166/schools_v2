import { Card, Icon } from "@chess-school/ui";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  type AppNotification,
} from "../../lib/queries.js";

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

function NotifRow({ n, onMarkRead, isLast }: {
  n: AppNotification;
  onMarkRead: (id: string) => void;
  isLast: boolean;
}) {
  const unread = !n.readAt;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px",
      background: unread ? "#eff6ff" : "var(--surface)",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: unread ? "#dbeafe" : "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: unread ? "#2563eb" : "var(--text-faint)",
      }}>
        <Icon name={n.icon as any} size={17} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: unread ? 700 : 500, fontSize: 14 }}>{n.title}</span>
          {unread && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
          )}
        </div>
        {n.body && (
          <div style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 2 }}>{n.body}</div>
        )}
        <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
      </div>

      {unread && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ background: "#dbeafe", color: "#2563eb", borderRadius: 99, fontSize: 12, fontWeight: 700, padding: "2px 10px" }}>
            Yangi
          </span>
          <button
            title="O'qildi"
            onClick={() => onMarkRead(n.id)}
            style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="check" size={12} style={{ color: "var(--text-faint)" }} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TNotificationsPage() {
  const { data: notifs = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCnt = notifs.filter((n) => !n.readAt).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Bildirishnomalar</h1>
          {unreadCnt > 0 && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>
              {unreadCnt} ta o'qilmagan bildirishnoma
            </div>
          )}
        </div>
        {unreadCnt > 0 && (
          <button
            className="btn"
            style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}>
            <Icon name="check" size={13} />
            {markAllRead.isPending ? "..." : "Barchasini o'qish"}
          </button>
        )}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
            Yuklanmoqda...
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: "var(--text-faint)" }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🔔</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Bildirishnomalar yo'q</div>
            <div style={{ fontSize: 13 }}>Yangi xabarlar shu yerda ko'rinadi</div>
          </div>
        ) : notifs.map((n, i) => (
          <NotifRow
            key={n.id}
            n={n}
            onMarkRead={(id) => markRead.mutate(id)}
            isLast={i === notifs.length - 1}
          />
        ))}
      </Card>
    </div>
  );
}
