import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useNotificationStats, type AppNotification,
} from "../../lib/queries.js";

const SETTINGS_KEY = "admin_notif_settings_v2";
const DEFAULT_SETTINGS = [
  { key: "newApp",     label: "Yangi ariza",       on: true  },
  { key: "payment",   label: "To'lov qabul",       on: true  },
  { key: "debt",      label: "Qarzdorlik eslatma", on: true  },
  { key: "attendance",label: "Davomat xabari",     on: false },
];

function loadSettings(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const base = Object.fromEntries(DEFAULT_SETTINGS.map((s) => [s.key, s.on]));
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch { return Object.fromEntries(DEFAULT_SETTINGS.map((s) => [s.key, s.on])); }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

function NotifItem({ n, onMarkRead }: { n: AppNotification; onMarkRead: (id: string) => void }) {
  const unread = !n.readAt;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "16px 22px",
      borderBottom: "1px solid var(--border)",
      background: unread ? "var(--surface-2)" : "transparent",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: "#dbeafe", color: "#2563eb",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={n.icon as any} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontWeight: unread ? 700 : 500, fontSize: 14, color: "var(--text)" }}>
            {n.title}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>
            {timeAgo(n.createdAt)}
          </span>
        </div>
        {n.body && (
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>{n.body}</div>
        )}
      </div>
      {unread && (
        <button
          title="O'qildi deb belgilash"
          onClick={() => onMarkRead(n.id)}
          style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="check" size={12} style={{ color: "var(--text-faint)" }} />
        </button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifs = [], isLoading } = useNotifications();
  const { data: stats } = useNotificationStats();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [settings, setSettings] = useState<Record<string, boolean>>(loadSettings);

  const unreadCnt = notifs.filter((n) => !n.readAt).length;

  function toggleSetting(key: string) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Bildirishnomalar</h2>
        {unreadCnt > 0 && (
          <button className="btn" onClick={() => markAllRead.mutate()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="check" size={14} /> Barchasini o'qish
          </button>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid cols-4">
          {[
            { label: "Bu hafta",  value: stats.thisWeek,         icon: "bell",    bg: "#dbeafe", color: "#2563eb" },
            { label: "O'qilmagan",value: stats.unread,           icon: "alert",   bg: "#fee2e2", color: "#ef4444" },
            { label: "Arizalar",  value: stats.applications,     icon: "user",    bg: "#d1fae5", color: "#059669" },
            { label: "To'lov ogoh",value: stats.paymentWarnings, icon: "wallet",  bg: "#fef3c7", color: "#d97706" },
          ].map((c) => (
            <Card key={c.label}>
              <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={c.icon as any} size={17} style={{ color: c.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{c.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--gap)" }}>

        {/* Notifications list */}
        <Card style={{ padding: 0 }}>
          <div style={{
            padding: "18px 22px 14px",
            display: "flex", alignItems: "center", gap: 12,
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={17} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>So'nggi bildirishnomalar</div>
            </div>
            {unreadCnt > 0 && (
              <span style={{ padding: "3px 11px", borderRadius: 99, background: "#fee2e2", color: "#ef4444", fontSize: 12, fontWeight: 800 }}>
                {unreadCnt} yangi
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
            ) : notifs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
                Bildirishnomalar yo'q
              </div>
            ) : notifs.map((n) => (
              <NotifItem key={n.id} n={n} onMarkRead={(id) => markRead.mutate(id)} />
            ))}
          </div>
        </Card>

        {/* Settings */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="settings" size={17} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Sozlamalar</div>
          </div>

          <div style={{ padding: "12px 22px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {DEFAULT_SETTINGS.map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
                <button onClick={() => toggleSetting(s.key)} style={{
                  width: 44, height: 24, borderRadius: 99,
                  border: "none", cursor: "pointer",
                  background: settings[s.key] ? "#3b82f6" : "var(--surface-3)",
                  position: "relative", transition: "background 0.2s",
                }}>
                  <span style={{
                    position: "absolute", top: 3,
                    left: settings[s.key] ? 22 : 3,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#fff", transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
