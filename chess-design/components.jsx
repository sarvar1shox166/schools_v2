// components.jsx — shell + shared primitives
const { useState } = React;

function Avatar({ name, size = "", round = false }) {
  return (
    <div className={"av " + size + (round ? " round" : "")} style={{ background: avColor(name) }}>
      {initials(name)}
    </div>
  );
}

const NAV = [
  { group: "Asosiy", items: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "schedule", label: "Dars vaqtlari", icon: "clock" },
  ]},
  { group: "Boshqaruv", items: [
    { id: "teachers", label: "O'qituvchilar", icon: "teacher" },
    { id: "students", label: "O'quvchilar", icon: "students", badge: 12 },
    { id: "groups", label: "Guruhlar", icon: "groups" },
    { id: "attendance", label: "Davomat", icon: "attendance" },
  ]},
  { group: "Moliya", items: [
    { id: "payments", label: "To'lovlar", icon: "payments", badge: 3, badgeTone: "danger" },
    { id: "income", label: "Daromadlar", icon: "income" },
  ]},
  { group: "Tizim", items: [
    { id: "notifications", label: "Bildirishnomalar", icon: "bell", badge: 3 },
    { id: "reports", label: "Hisobotlar", icon: "reports" },
  ]},
];

function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">♞</div>
        <div className="brand-text">
          <div className="brand-name">Shaxmat Online</div>
          <div className="brand-sub"><Icon name="crown" size={12} /> Admin paneli</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((sec) => (
          <div key={sec.group}>
            <div className="nav-group-label">{sec.group}</div>
            {sec.items.map((it) => (
              <button key={it.id}
                className={"nav-item" + (page === it.id ? " active" : "")}
                onClick={() => setPage(it.id)} title={it.label}>
                <Icon name={it.icon} size={19} sw={page === it.id ? 2 : 1.75} />
                <span className="nav-label">{it.label}</span>
                {it.badge && (
                  <span className={"nav-badge" + (it.badgeTone === "danger" ? "" : (page === it.id ? "" : " muted"))}
                    style={it.badgeTone === "danger" ? { background: "var(--danger)" } : null}>
                    {it.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="userbox">
          <Avatar name="Admin Aliyev" />
          <div className="userbox-text">
            <div className="userbox-name">Admin Aliyev</div>
            <div className="userbox-role">Bosh administrator</div>
          </div>
          <Icon name="logout" size={17} style={{ color: "var(--text-faint)" }} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, theme, setTheme, collapsed, setCollapsed }) {
  return (
    <header className="topbar">
      <button className="iconbtn" onClick={() => setCollapsed(!collapsed)} title="Menyu">
        <Icon name="chevronsLeft" size={18} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
      </button>
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="spacer" />
      <label className="search">
        <Icon name="search" size={17} />
        <input placeholder="Qidirish — o'quvchi, guruh, to'lov…" />
        <kbd>⌘K</kbd>
      </label>
      <button className="iconbtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Yorug' rejim" : "Qorong'i rejim"}>
        <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      </button>
      <button className="iconbtn" title="Bildirishnomalar">
        <Icon name="bell" size={18} /><span className="dot" />
      </button>
      <Avatar name="Admin Aliyev" />
    </header>
  );
}

// ---- generic bits ----
function Card({ className = "", children, style }) {
  return <div className={"card " + className} style={style}>{children}</div>;
}

function CardHead({ icon, title, sub, right }) {
  return (
    <div className="card-head">
      {icon && <div className="head-ic"><Icon name={icon} size={18} /></div>}
      <div style={{ flex: 1 }}>
        <div className="ttl">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const STATUS_MAP = {
  faol: { cls: "suc", icon: "check", label: "Faol" },
  yangi: { cls: "warn", icon: "star", label: "Yangi" },
  nofaol: { cls: "neut", icon: "x", label: "Nofaol" },
  qarzdor: { cls: "dang", icon: "alert", label: "Qarzdor" },
  "to'langan": { cls: "suc", icon: "check", label: "To'langan" },
  kutilmoqda: { cls: "warn", icon: "clock", label: "Kutilmoqda" },
  qongiroq: { cls: "info", icon: "phone", label: "Qo'ng'iroq" },
};
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { cls: "neut", icon: "dots", label: status };
  return <span className={"badge " + s.cls}><Icon name={s.icon} size={12} /> {s.label}</span>;
}

function Delta({ dir = "up", children }) {
  const icon = dir === "up" ? "trendingUp" : dir === "bad" ? "alert" : "trendingDown";
  return <span className={"stat-delta " + (dir === "bad" ? "bad" : dir === "flat" ? "flat" : "up")}>
    <Icon name={icon} size={14} /> {children}
  </span>;
}

function StatCard({ icon, tone = "a", value, label, delta, ghost }) {
  return (
    <Card className="stat fade-up">
      <div className={"stat-ic " + tone}><Icon name={icon} size={23} /></div>
      <div>
        <div className="stat-val tnum">{value}</div>
        <div className="stat-lbl">{label}</div>
        {delta}
      </div>
      {ghost && <Icon name={ghost} size={96} className="ghost" />}
    </Card>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PageHead({ title, children }) {
  return <div className="page-tools"><div className="ttl">{title}</div><div className="spacer" />{children}</div>;
}

Object.assign(window, {
  Avatar, Sidebar, Topbar, Card, CardHead, StatusBadge, Delta, StatCard,
  Segmented, PageHead, STATUS_MAP, NAV,
});
