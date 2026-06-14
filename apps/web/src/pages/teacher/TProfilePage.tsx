import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useMyProfile } from "../../lib/queries.js";

const RATINGS = [
  { l: "Dars sifati", v: 4.9 },
  { l: "O'quvchilar natijasi", v: 4.7 },
  { l: "Vaqtga rioya", v: 5.0 },
  { l: "Muloqot madaniyati", v: 4.8 },
];

const ACHIEVEMENTS = [
  { icon: "crown", t: "Yil eng yaxshi o'qituvchisi", d: "2025" },
  { icon: "target", t: "100 ta o'quvchi tayyorladi", d: "2024" },
  { icon: "flag", t: "Mintaqa turnir g'olibi", d: "2023" },
];

export default function TProfilePage() {
  const { data: profile } = useMyProfile();

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
            {RATINGS.map((r) => (
              <div key={r.l} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>{r.l}</span>
                  <span style={{ fontWeight: 750 }}>{r.v} / 5.0</span>
                </div>
                <div className="pbar"><span style={{ width: `${(r.v / 5) * 100}%` }} /></div>
              </div>
            ))}
          </Card>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="award" size={17} style={{ color: "var(--accent-text)" }} /> Yutuqlar
            </div>
            {ACHIEVEMENTS.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 13, padding: "10px 0",
                  borderBottom: i < ACHIEVEMENTS.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--accent-text)" }}>
                  <Icon name={a.icon} size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 14 }}>{a.t}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{a.d}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
