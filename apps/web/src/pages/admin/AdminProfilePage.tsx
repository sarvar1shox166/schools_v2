import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useAuthStore } from "../../lib/auth-store.js";
import { useTelegramLinkUrl, useTelegramStatus, useTelegramUnlink } from "../../lib/queries.js";

const ROLE_LABELS: Record<string, string> = {
  super_admin:      "Super admin",
  admin:            "Administrator",
  assistant_admin:  "Yordamchi admin",
  moderator:        "Moderator",
  operator:         "Operator",
};

function TelegramLinkCard() {
  const { data: status } = useTelegramStatus();
  const linkUrl = useTelegramLinkUrl();
  const unlink = useTelegramUnlink();

  if (!status?.botConfigured) return null;

  const handleLink = () => {
    linkUrl.mutate(undefined, {
      onSuccess: (data) => window.open(data.url, "_blank"),
    });
  };

  const handleUnlink = () => {
    if (!window.confirm("Telegram hisobini uzasizmi?")) return;
    unlink.mutate();
  };

  return (
    <Card className="card-pad fade-up">
      <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
        <Icon name="message2" size={17} style={{ color: "var(--accent-text)" }} /> Telegram bot
      </div>
      {status.linked ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)", marginBottom: 12 }}>
            <Icon name="check" size={16} style={{ color: "#22c55e" }} /> Hisobingiz ulangan — yangi lidlar va bildirishnomalar Telegramga yuboriladi.
          </div>
          <button className="btn" disabled={unlink.isPending} onClick={handleUnlink} style={{ color: "#ef4444" }}>
            {unlink.isPending ? "Uzilmoqda..." : "Ulanishni uzish"}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 12 }}>
            Yangi lidlar va muhim bildirishnomalarni Telegram orqali olish uchun hisobingizni ulang.
          </div>
          <button className="btn primary" disabled={linkUrl.isPending} onClick={handleLink}>
            {linkUrl.isPending ? "Havola tayyorlanmoqda..." : "Telegram bilan bog'lash"}
          </button>
          {linkUrl.isError && (
            <div style={{ color: "var(--danger, #ef4444)", fontSize: 12, marginTop: 8 }}>Xatolik yuz berdi, qayta urinib ko'ring.</div>
          )}
        </>
      )}
    </Card>
  );
}

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHead title="Mening profilim" />
      <div className="grid l-1-2">
        <div>
          <Card className="fade-up">
            <div className="prof-bg" />
            <div className="prof-av-wrap">
              <Avatar name={user?.fullName ?? ""} src={user?.avatarUrl} size="lg" />
            </div>
            <div className="card-pad" style={{ paddingTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{user?.fullName}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 4 }}>
                {user ? (ROLE_LABELS[user.role] ?? user.role) : "—"}
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-dim)" }}>
                  <Icon name="phone" size={16} style={{ color: "var(--accent-text)" }} /> {user?.phone}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <TelegramLinkCard />
        </div>
      </div>
    </div>
  );
}
