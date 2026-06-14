import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Icon, XpToastHost } from "@chess-school/ui";
import { useAuthStore } from "../lib/auth-store.js";
import { useMyXp, useUnreadNotifications } from "../lib/queries.js";
import { Sidebar, type NavSection } from "./Sidebar.js";

const NOTIFICATIONS_ROUTE: Record<string, string> = {
  admin: "/admin/notifications",
  teacher: "/teacher/notifications",
};

export function AppShell({ title, nav }: { title: string; nav?: NavSection[] }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: unread } = useUnreadNotifications();
  const isStudent = user?.role === "student";
  const { data: xpData } = useMyXp();
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (document.body.getAttribute("data-theme") as "light" | "dark") || "light"
  );

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const notifRoute = user ? NOTIFICATIONS_ROUTE[user.role] : undefined;

  const xpLevel = xpData?.level ?? 1;
  const xpVal = xpData?.xp ?? 0;
  const xpFloor = (xpLevel - 1) * 200;
  const xpCeil = xpLevel * 200;
  const xpPct = Math.max(0, Math.min(100, Math.round(((xpVal - xpFloor) / (xpCeil - xpFloor)) * 100)));

  return (
    <div className={"app" + (isStudent ? " kid-theme" : "")}>
      <XpToastHost />
      {nav && <Sidebar sections={nav} brandSub={title} />}
      <div className="main">
        <header className="topbar">
          <div className="brand-mark">♞</div>
          <h1>{title}</h1>
          <div className="spacer" />
          {isStudent && (
            <div className="kid-topbar-pills">
              <span className="pill pill-level">
                <Icon name="award" size={14} /> Daraja {xpLevel}
              </span>
              <span className="lv kid-xp-bar" title={`${xpVal} / ${xpCeil} XP`}>
                <span className="lv-bar"><span style={{ width: `${xpPct}%` }} /></span>
              </span>
              <span className="pill pill-streak">
                <Icon name="flame" size={14} /> {xpData?.streak ?? 0} kun
              </span>
              <Link to="/student/pvp" className="iconbtn" title="Jonli o'yin">
                <Icon name="swords" size={18} />
              </Link>
            </div>
          )}
          <label className="search">
            <Icon name="search" size={17} />
            <input placeholder="Qidirish…" />
          </label>
          <button className="iconbtn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} title="Mavzu">
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button
            className="iconbtn"
            onClick={() => notifRoute && navigate(notifRoute)}
            title="Bildirishnomalar"
          >
            <Icon name="bell" size={18} />
            {!!unread?.count && <span className="dot" />}
          </button>
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
