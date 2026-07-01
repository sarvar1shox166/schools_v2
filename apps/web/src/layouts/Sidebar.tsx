import { useState } from "react";
import { createPortal } from "react-dom";
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
  locked?: boolean;
}

function ComingSoonModal({ label, onClose }: { label: string; onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
        display: "grid", placeItems: "center", zIndex: 9999,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1a1f35", border: "1.5px solid rgba(255,255,255,.12)",
          borderRadius: 22, padding: "36px 40px", textAlign: "center",
          minWidth: 320, maxWidth: "90vw",
          boxShadow: "0 24px 64px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 14 }}>🚀</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
          Tez orada!
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)", marginBottom: 6 }}>
          <strong style={{ color: "rgba(255,255,255,.85)" }}>{label}</strong> bo'limi
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>
          Ushbu bo'lim hozirda tayyorlanmoqda.<br />
          Tez orada ishga tushadi!
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "11px 32px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Tushunarli
        </button>
      </div>
    </div>,
    document.body
  );
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
  const { data: xpData } = useMyXp(isStudent);
  const [lockedLabel, setLockedLabel] = useState<string | null>(null);

  const xpLevel = xpData?.level ?? 1;
  const levelName = LEVEL_NAMES[Math.min(xpLevel - 1, LEVEL_NAMES.length - 1)] ?? LEVEL_NAMES[0];

  return (
    <>
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
            {sec.items.map((item) => {
              const icon = (
                <span className="nav-ico-badge">
                  {isStudent && item.navId === "learn"
                    ? LEARN_SVG
                    : isStudent && item.emoji
                    ? <span style={{ fontSize: 20, lineHeight: 1 }}>{item.emoji}</span>
                    : <Icon name={item.icon} size={19} />
                  }
                </span>
              );

              if (item.locked) {
                return (
                  <button
                    key={item.to}
                    className="nav-item"
                    title={item.label}
                    onClick={() => { haptic("light"); setLockedLabel(item.label); }}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", opacity: 0.55, position: "relative" }}
                  >
                    {icon}
                    <span className="nav-label">{item.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12 }}>🔒</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/student"}
                  className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                  title={item.label}
                  onClick={() => haptic("light")}
                  {...(item.navId ? { "data-navid": item.navId } : {})}
                >
                  {icon}
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
              );
            })}
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

    {lockedLabel && (
      <ComingSoonModal label={lockedLabel} onClose={() => setLockedLabel(null)} />
    )}
    </>
  );
}
