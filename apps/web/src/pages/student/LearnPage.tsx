import { Link } from "react-router-dom";
import { Card, Icon, PageHead } from "@chess-school/ui";

const LINKS = [
  { to: "/student/lessons", label: "Darslarim", desc: "Jadval, davomat va uy vazifalari", icon: "calendarCheck" },
  { to: "/student/videos", label: "Video darslar", desc: "Debyut, taktika va strategiya darslari", icon: "video" },
  { to: "/student/puzzles", label: "Boshqotirmalar", desc: "Masala yeching, XP yig'ing", icon: "pieces" },
  { to: "/student/pvp", label: "Jonli o'yin", desc: "Boshqa o'quvchilar bilan o'ynang", icon: "zap" },
  { to: "/student/leaderboard", label: "Reyting", desc: "O'zingizning o'rningizni ko'ring", icon: "award" },
  { to: "/student/profile", label: "Profilim", desc: "Yutuqlar va shaxsiy ma'lumotlar", icon: "user" },
];

export default function LearnPage() {
  return (
    <div>
      <PageHead title="O'rganish" />
      <div className="cols-2" style={{ display: "grid", gap: "var(--gap)" }}>
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} style={{ textDecoration: "none", color: "inherit" }}>
            <Card className="card-pad fade-up" style={{ height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                  }}
                >
                  <Icon name={l.icon} size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{l.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>{l.desc}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
