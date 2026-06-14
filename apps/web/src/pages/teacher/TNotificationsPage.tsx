import { Card, Icon, PageHead } from "@chess-school/ui";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../../lib/queries.js";

export default function TNotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div>
      <PageHead title="Bildirishnomalar">
        {unreadCount > 0 && (
          <button className="btn sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <Icon name="check" size={15} /> Barchasini o'qilgan deb belgilash
          </button>
        )}
      </PageHead>

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
    </div>
  );
}
