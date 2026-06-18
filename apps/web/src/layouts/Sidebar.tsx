import { NavLink } from "react-router-dom";
import { Avatar, Icon } from "@chess-school/ui";
import { haptic } from "../lib/telegram.js";
import { useAuthStore } from "../lib/auth-store.js";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: number | "danger";
}

export interface NavSection {
  group: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  brandSub: string;
  theme?: "light" | "dark";
  onThemeToggle?: (theme: "light" | "dark") => void;
  gender?: "boy" | "girl";
  onGenderChange?: (gender: "boy" | "girl") => void;
}

export function Sidebar({ sections, brandSub, theme, onThemeToggle, gender, onGenderChange }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isStudent = user?.role === "student";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">♞</div>
        <div className="brand-text">
          <div className="brand-name">Shaxmat Online</div>
          <div className="brand-sub"><Icon name="crown" size={12} /> {brandSub}</div>
        </div>
      </div>

      <nav className="nav">
        {sections.map((sec) => (
          <div key={sec.group}>
            <div className="nav-group-label">{sec.group}</div>
            {sec.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                title={item.label}
                onClick={() => haptic("light")}
              >
                <span className="nav-ico-badge">
                  <Icon name={item.icon} size={19} />
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
              <div className="userbox-role">{user.role}</div>
            </div>
            <button className="iconbtn" onClick={logout} title="Chiqish" style={{ width: 32, height: 32 }}>
              <Icon name="logout" size={16} />
            </button>
          </div>

          {isStudent && onThemeToggle && onGenderChange && (
            <div className="kid-controls">
              <div className="kid-controls-label">Rejim</div>
              <div className="kid-controls-row">
                <button
                  className={"kid-ctrl-btn" + (theme === "light" ? " on" : "")}
                  onClick={() => onThemeToggle("light")}
                  title="Yorug' rejim"
                >☀️</button>
                <button
                  className={"kid-ctrl-btn" + (theme === "dark" ? " on" : "")}
                  onClick={() => onThemeToggle("dark")}
                  title="Qorong'i rejim"
                >🌙</button>
              </div>
              <div className="kid-controls-label">Platforma</div>
              <div className="kid-controls-row">
                <button
                  className={"kid-ctrl-btn" + (gender === "boy" ? " on" : "")}
                  onClick={() => onGenderChange("boy")}
                  title="O'g'il bola"
                >👦</button>
                <button
                  className={"kid-ctrl-btn" + (gender === "girl" ? " on" : "")}
                  onClick={() => onGenderChange("girl")}
                  title="Qiz bola"
                >👧</button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
