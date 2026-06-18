import { NavLink } from "react-router-dom";
import { Avatar, Icon } from "@chess-school/ui";
import { haptic } from "../lib/telegram.js";
import { useAuthStore } from "../lib/auth-store.js";
import { useMyXp } from "../lib/queries.js";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: number | "danger";
  emoji?: string;
  navId?: string;
}

export interface NavSection {
  group: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  brandSub: string;
  gender?: "boy" | "girl";
  onGenderChange?: (gender: "boy" | "girl") => void;
}

const LEVEL_NAMES = ["Yangi boshlovchi", "Boshlang'ich", "O'rta", "Ilg'or", "Usta"];

const LEARN_SVG = (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <rect x="2" y="2" width="9" height="9" rx="2" fill="#a78bfa"/>
    <rect x="13" y="2" width="9" height="9" rx="2" fill="#34d399"/>
    <rect x="2" y="13" width="9" height="9" rx="2" fill="#f59e0b"/>
    <rect x="13" y="13" width="9" height="9" rx="2" fill="#f87171"/>
  </svg>
);

export function Sidebar({ sections, brandSub, gender, onGenderChange }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isStudent = user?.role === "student";
  const { data: xpData } = useMyXp();

  const xpLevel = xpData?.level ?? 1;
  const levelName = LEVEL_NAMES[Math.min(xpLevel - 1, LEVEL_NAMES.length - 1)] ?? LEVEL_NAMES[0];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">♞</div>
        <div className="brand-text">
          <div className="brand-name">Shaxmat Online</div>
          {isStudent
            ? <div className="brand-sub">● {brandSub}</div>
            : <div className="brand-sub"><Icon name="crown" size={12} /> {brandSub}</div>
          }
        </div>
      </div>

      <nav className="nav">
        {sections.map((sec) => (
          <div key={sec.group}>
            {!isStudent && <div className="nav-group-label">{sec.group}</div>}
            {sec.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/student"}
                className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                title={item.label}
                onClick={() => haptic("light")}
                {...(item.navId ? { "data-navid": item.navId } : {})}
              >
                <span className="nav-ico-badge">
                  {isStudent && item.navId === "learn"
                    ? LEARN_SVG
                    : isStudent && item.emoji
                    ? <span style={{ fontSize: 20, lineHeight: 1 }}>{item.emoji}</span>
                    : <Icon name={item.icon} size={19} />
                  }
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge != null && (
                  <span
                    className={"nav-badge" + (item.badge === "danger" ? "" : " muted")}
                    style={item.badge === "danger" ? { background: "var(--danger)" } : {}}
                  >
                    {item.badge === "danger" ? "!" : item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar-foot">
          <div className="userbox">
            <Avatar name={user.fullName} />
            <div className="userbox-text">
              <div className="userbox-name">{user.fullName}</div>
              <div className="userbox-role">
                {isStudent ? levelName : user.role}
              </div>
            </div>
            <button className="iconbtn" onClick={logout} title="Chiqish" style={{ width: 32, height: 32, ...(isStudent ? { background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.4)" } : {}) }}>
              <Icon name="logout" size={16} />
            </button>
          </div>

          {isStudent && onGenderChange && (
            <div className="kid-tgl-row">
              <div className="kid-tgl" style={{ flex: "none", padding: "3px 8px" }}>
                <button className={"kid-tgb" + (gender === "boy" ? " on" : "")} onClick={() => onGenderChange("boy")} title="O'g'il bola">👦</button>
                <button className={"kid-tgb" + (gender === "girl" ? " on" : "")} onClick={() => onGenderChange("girl")} title="Qiz bola">👧</button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
