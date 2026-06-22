import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Icon, XpToastHost } from "@chess-school/ui";
import { useAuthStore } from "../lib/auth-store.js";
import { useMyXp, useUnreadNotifications } from "../lib/queries.js";
import { Sidebar, type NavSection } from "./Sidebar.js";

const STUDENT_PAGE_META: Record<string, { title: string; sub: string }> = {
  "/student": { title: "Bosh sahifa", sub: "Xush kelibsiz!" },
  "/student/lessons": { title: "Darslarim", sub: "Haftalik jadval" },
  "/student/videos": { title: "Video darslar", sub: "O'rganish va rivojlanish" },
  "/student/learn": { title: "O'rganish", sub: "Darslar va topshiriqlar" },
  "/student/puzzles": { title: "Boshqotirmalar", sub: "Masala yeching, XP yig'ing" },
  "/student/pvp": { title: "O'ynash", sub: "Kompyuter bilan o'ynash" },
  "/student/leaderboard": { title: "Reyting", sub: "Guruh jadvali" },
  "/student/profile": { title: "Mening profilim", sub: "Shaxsiy ma'lumotlar" },
};

const ADMIN_PAGE_META: Record<string, { title: string; sub: string }> = {
  "/admin":               { title: "Dashboard",        sub: "Umumiy ko'rinish" },
  "/admin/schedule":      { title: "Dars vaqtlari",    sub: "Haftalik jadval" },
  "/admin/teachers":      { title: "O'qituvchilar",    sub: "Barcha o'qituvchilar" },
  "/admin/students":      { title: "O'quvchilar",      sub: "Barcha o'quvchilar" },
  "/admin/groups":        { title: "Guruhlar",          sub: "Guruhlar ro'yxati" },
  "/admin/attendance":    { title: "Davomat jurnali",    sub: "Dars davomati" },
  "/admin/payments":       { title: "To'lovlar",          sub: "To'lov tarixi" },
  "/admin/income":         { title: "Daromadlar tahlili", sub: "Moliyaviy hisobot" },
  "/admin/notifications":  { title: "Bildirishnomalar",  sub: "Xabarlar va ogohlantirishlar" },
  "/admin/video-courses":  { title: "Video darsliklar",   sub: "Kurslar va darslar boshqaruvi" },
  "/admin/broadcast":      { title: "Ommaviy xabar",     sub: "Auditoriya va kanal tanlash" },
  "/admin/applications":   { title: "Arizalar",           sub: "CRM va ariza boshqaruvi" },
  "/admin/teacher-rating": { title: "Ustoz reytingi",     sub: "Baholar va izohlar" },
  "/admin/reports":        { title: "Hisobotlar",         sub: "Statistika va tahlil" },
};

const TEACHER_PAGE_META: Record<string, { title: string; sub: string }> = {
  "/teacher":               { title: "Dashboard",         sub: "Umumiy ko'rinish" },
  "/teacher/schedule":      { title: "Darslarim",         sub: "Haftalik jadval" },
  "/teacher/students":      { title: "O'quvchilarim",     sub: "Guruhlar ro'yxati" },
  "/teacher/attendance":    { title: "Davomat",            sub: "Yo'qlamalar" },
  "/teacher/progress":      { title: "O'quvchi natijasi", sub: "Progress va baholar" },
  "/teacher/materials":     { title: "Uy vazifalari",     sub: "Topshiriqlar" },
  "/teacher/puzzles":       { title: "Boshqotirmalar",    sub: "Masalalar to'plami" },
  "/teacher/messages":      { title: "Xabarlar",          sub: "Muloqot" },
  "/teacher/notifications": { title: "Bildirishnomalar", sub: "Xabarlar" },
  "/teacher/profile":       { title: "Mening profilim",  sub: "Shaxsiy ma'lumotlar" },
  "/teacher/income":        { title: "Daromad",           sub: "Oylik hisob-kitob" },
  "/teacher/puzzles/new":  { title: "Yangi boshqotirma", sub: "Pozitsiya va yechim kiriting" },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Bosh admin",
  admin: "Administrator",
  teacher: "O'qituvchi",
  student: "O'quvchi",
};

const NOTIFICATIONS_ROUTE: Record<string, string> = {
  admin: "/admin/notifications",
  teacher: "/teacher/notifications",
};

export function AppShell({ title, nav }: { title: string; nav?: NavSection[] }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: unread } = useUnreadNotifications();
  const isStudent = user?.role === "student";
  const { data: xpData } = useMyXp();

  const studentMeta = isStudent ? (STUDENT_PAGE_META[location.pathname] ?? { title, sub: "" }) : null;

  const pageMeta = isStudent
    ? studentMeta
    : user?.role === "teacher"
    ? (TEACHER_PAGE_META[location.pathname] ?? { title, sub: "" })
    : (ADMIN_PAGE_META[location.pathname] ?? { title, sub: "" });

  const [theme, setTheme] = useState<"light" | "dark">(
    () => isStudent ? "dark" : ((localStorage.getItem("chess_theme") as "light" | "dark") || "dark")
  );
  const [gender, setGender] = useState<"boy" | "girl">(
    () => (localStorage.getItem("chess_gender") as "boy" | "girl") || "boy"
  );
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("chess_sb_collapsed") === "1"
  );

  useEffect(() => {
    const t = isStudent ? "dark" : theme;
    document.body.setAttribute("data-theme", t);
    if (!isStudent) localStorage.setItem("chess_theme", t);
  }, [theme, isStudent]);

  useEffect(() => {
    document.body.setAttribute("data-gender", gender);
    localStorage.setItem("chess_gender", gender);
  }, [gender]);

  const notifRoute = user ? NOTIFICATIONS_ROUTE[user.role] : undefined;

  const xpLevel = xpData?.level ?? 1;
  const xpVal = xpData?.xp ?? 0;
  const xpFloor = (xpLevel - 1) * 200;
  const xpCeil = xpLevel * 200;
  const xpPct = Math.max(0, Math.min(100, Math.round(((xpVal - xpFloor) / (xpCeil - xpFloor)) * 100)));

  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem("chess_sb_collapsed", c ? "0" : "1");
      return !c;
    });
  };

  return (
    <div className={"app" + (isStudent ? " kid-theme" : "") + (!isStudent && collapsed ? " collapsed" : "")}>
      <XpToastHost />
      {nav && (
        <Sidebar
          sections={nav}
          brandSub={title}
          gender={gender}
          onGenderChange={setGender}
        />
      )}
      <div className="main">
        <header className="topbar">
          {isStudent ? (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kid-tb-title">{studentMeta?.title ?? title}</div>
                {studentMeta?.sub && <div className="kid-tb-sub">{studentMeta.sub}</div>}
              </div>
              <div className="kid-topbar-pills">
                <span className="pill pill-level">⭐ Daraja {xpLevel}</span>
                <span className="lv kid-xp-bar" title={`${xpVal} / ${xpCeil} XP`}>
                  <span className="lv-bar"><span style={{ width: `${xpPct}%` }} /></span>
                </span>
                <span className="kid-tb-xp-txt">{xpVal} XP</span>
                <span className="pill pill-streak">
                  <span className="kid-fire">🔥</span>{xpData?.streak ?? 0} kun
                </span>
                <Link to="/student/pvp" className="tb-btn" title="Jonli o'yin">
                  <Icon name="swords" size={17} />
                </Link>
              </div>
              <button
                className="tb-btn"
                onClick={() => notifRoute && navigate(notifRoute)}
                title="Bildirishnomalar"
                style={{ position: "relative" }}
              >
                <Icon name="bell" size={17} />
                {!!unread?.count && <span className="dot" />}
              </button>
            </>
          ) : (
            <>
              {/* Sidebar collapse toggle */}
              <button
                className="iconbtn"
                onClick={toggleCollapse}
                title={collapsed ? "Kengaytirish" : "Yig'ish"}
                style={{ flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {collapsed ? (
                    <><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></>
                  ) : (
                    <><line x1="2" y1="4" x2="10" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="10" y2="12"/></>
                  )}
                </svg>
              </button>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{pageMeta?.title ?? title}</h1>
                {pageMeta?.sub && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{pageMeta.sub}</div>
                )}
              </div>
              <div className="spacer" />
              {user?.role !== "teacher" && (
                <label className="search">
                  <Icon name="search" size={17} />
                  <input placeholder="Qidirish..." />
                  <kbd>⌘K</kbd>
                </label>
              )}
              <button className="iconbtn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="Mavzu">
                <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
              </button>
              <button
                className="iconbtn"
                onClick={() => notifRoute && navigate(notifRoute)}
                title="Bildirishnomalar"
                style={{ position: "relative" }}
              >
                <Icon name="bell" size={18} />
                {!!unread?.count && <span className="dot" />}
              </button>
              {user?.role === "teacher" ? (
                <button className="btn primary" style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px" }}>
                  <Icon name="plus" size={14}/> Dars yaratish
                </button>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface-2)",
                  fontSize: 13, fontWeight: 600, color: "var(--text-dim)",
                  whiteSpace: "nowrap",
                }}>
                  <Icon name="user" size={14} />
                  {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
                </div>
              )}
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "var(--accent)", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff",
                cursor: "default",
              }}>
                {(user?.fullName ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            </>
          )}
        </header>
        <main className="content">
          <div className="content-inner page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
