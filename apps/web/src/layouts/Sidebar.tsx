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

export function Sidebar({ sections, brandSub }: { sections: NavSection[]; brandSub: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

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
          {user.role === "student" && (
            <div className="kid-mascot-row">
              <span className="kid-mascot-pill">🧑‍🦱😄</span>
              <span className="kid-mascot-pill">🐴🌟</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
