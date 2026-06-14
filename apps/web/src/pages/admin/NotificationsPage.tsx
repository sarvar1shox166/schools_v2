import { useState } from "react";
import { Card, Icon, PageHead } from "@chess-school/ui";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationStats, useNotifications } from "../../lib/queries.js";

const SETTINGS_KEY = "admin_notification_settings";

const DEFAULT_SETTINGS: { key: string; label: string; on: boolean }[] = [
  { key: "newApplication", label: "Yangi ariza", on: true },
  { key: "paymentReceived", label: "To'lov qabul", on: true },
  { key: "debtReminder", label: "Qarzdorlik eslatma", on: true },
  { key: "attendanceAlert", label: "Davomat xabari", on: false },
  { key: "systemUpdates", label: "Tizim yangiliklari", on: true },
];

function loadSettings(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return Object.fromEntries(DEFAULT_SETTINGS.map((s) => [s.key, s.on]));
    return { ...Object.fromEntries(DEFAULT_SETTINGS.map((s) => [s.key, s.on])), ...JSON.parse(raw) };
  } catch {
    return Object.fromEntries(DEFAULT_SETTINGS.map((s) => [s.key, s.on]));
  }
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { data: stats } = useNotificationStats();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [settings, setSettings] = useState<Record<string, boolean>>(() => loadSettings());

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  function toggleSetting(key: string) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div>
      <PageHead title="Bildirishnomalar">
        {unreadCount > 0 && (
          <button className="btn sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Icon name="check" size={15} /> Barchasini o'qilgan deb belgilash
          </button>
        )}
      </PageHead>

      <div className="cols-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--gap)" }}>
        <Card className="fade-up">
          <div className="list">
            {isLoading && <div className="li">Yuklanmoqda...</div>}
            {notifications?.map((n) => (
              <div className="li" key={n.id} style={{ opacity: n.readAt ? 0.6 : 1 }}>
                <div className="head-ic"><Icon name={n.icon} size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div className="cell-main">{n.title}</div>
                  {n.body && <div className="cell-sub">{n.body}</div>}
                  <div className="cell-sub">{new Date(n.createdAt).toLocaleString("uz-UZ")}</div>
                </div>
                {!n.readAt && (
                  <button className="btn sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>
                    <Icon name="check" size={14} /> O'qildi
                  </button>
                )}
              </div>
            ))}
            {!isLoading && (notifications?.length ?? 0) === 0 && (
              <div className="empty"><Icon name="bell" size={28} /><div>Bildirishnomalar yo'q</div></div>
            )}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="fade-up">
            <div className="card-head"><div className="ttl">Statistika</div></div>
            <div style={{ padding: "0 16px 20px" }}>
              <div className="kpi-grid">
                <div className="kpi"><div className="v">{stats?.thisWeek ?? 0}</div><div className="l">Bu hafta</div></div>
                <div className="kpi"><div className="v">{stats?.unread ?? 0}</div><div className="l">O'qilmagan</div></div>
                <div className="kpi"><div className="v">{stats?.applications ?? 0}</div><div className="l">Arizalar</div></div>
                <div className="kpi"><div className="v">{stats?.paymentWarnings ?? 0}</div><div className="l">To'lov ogoh.</div></div>
              </div>
            </div>
          </Card>

          <Card className="fade-up">
            <div className="card-head"><div className="ttl">Sozlamalar</div></div>
            <div style={{ padding: "0 16px 16px" }}>
              {DEFAULT_SETTINGS.map((s) => (
                <div className="ktog" key={s.key} onClick={() => toggleSetting(s.key)}>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <span className={"ktog-sw " + (settings[s.key] ? "on" : "off")}>
                    <span className="kknob" />
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
