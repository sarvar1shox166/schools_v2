import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useMyProfile, useMyRatingBreakdown, useTelegramLinkUrl, useTelegramStatus } from "../../lib/queries.js";

function TelegramLinkCard() {
  const { data: status } = useTelegramStatus();
  const linkUrl = useTelegramLinkUrl();

  if (!status?.botConfigured) return null;

  const handleLink = () => {
    linkUrl.mutate(undefined, {
      onSuccess: (data) => window.open(data.url, "_blank"),
    });
  };

  return (
    <Card className="card-pad fade-up">
      <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
        <Icon name="message2" size={17} style={{ color: "var(--accent-text)" }} /> Telegram bot
      </div>
      {status.linked ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
          <Icon name="check" size={16} style={{ color: "#22c55e" }} /> Hisobingiz ulangan — dars eslatmalari Telegramga yuboriladi.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 12 }}>
            Dars boshlanishi va bugungi darslar haqidagi eslatmalarni Telegram orqali olish uchun hisobingizni ulang.
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

export default function TProfilePage() {
  const { data: profile } = useMyProfile();
  const { data: ratingBreakdown } = useMyRatingBreakdown();

  const RATINGS = ratingBreakdown ? [
    { l: "Dars sifati", v: ratingBreakdown.lessonQuality },
    { l: "O'quvchilar natijasi", v: ratingBreakdown.studentResults },
    { l: "Vaqtga rioya", v: ratingBreakdown.punctuality },
    { l: "Muloqot madaniyati", v: ratingBreakdown.communication },
  ].filter((r) => r.v != null) as { l: string; v: number }[] : [];

  return (
    <div>
      <PageHead title="Mening profilim" />
      <div className="grid l-1-2">
        <div>
          <Card className="fade-up" style={{ marginBottom: "var(--gap)" }}>
            <div className="prof-bg" />
            <div className="prof-av-wrap">
              <Avatar name={profile?.fullName ?? ""} size="lg" />
            </div>
            <div className="card-pad" style={{ paddingTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{profile?.fullName}</div>
              <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 4 }}>{profile?.spec ?? "—"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {profile?.title && <span className="badge acc"><Icon name="award" size={12} /> {profile.title}</span>}
                {profile?.expYears != null && <span className="badge neut"><Icon name="clock" size={12} /> {profile.expYears} yil tajriba</span>}
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-dim)" }}>
                  <Icon name="phone" size={16} style={{ color: "var(--accent-text)" }} /> {profile?.phone}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-dim)" }}>
                  <Icon name="calendar" size={16} style={{ color: "var(--accent-text)" }} /> Qo'shilgan: {profile?.joinedAt}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} disabled title="Tez kunda">
                  <Icon name="download" size={15} /> CV yuklash
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="trendingUp" size={17} style={{ color: "var(--accent-text)" }} /> Ish statistikasi
            </div>
            <div className="kpi-grid">
              <div className="kpi"><div className="v">{profile?.studentsCount ?? 0}</div><div className="l">O'quvchilar</div></div>
              <div className="kpi"><div className="v">{profile?.groupsCount ?? 0}</div><div className="l">Guruhlar</div></div>
              <div className="kpi"><div className="v">{profile?.attendanceRate ?? 0}%</div><div className="l">Davomat</div></div>
            </div>
          </Card>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="star" size={17} style={{ color: "var(--warn)" }} /> Baholar
            </div>
            {RATINGS.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Hali baho berilmagan</div>
            ) : RATINGS.map((r) => (
              <div key={r.l} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>{r.l}</span>
                  <span style={{ fontWeight: 750 }}>{r.v} / 5.0</span>
                </div>
                <div className="pbar"><span style={{ width: `${(r.v / 5) * 100}%` }} /></div>
              </div>
            ))}
          </Card>

          <TelegramLinkCard />
        </div>
      </div>
    </div>
  );
}
