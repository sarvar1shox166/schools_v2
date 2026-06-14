import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon.js";
import { avColor, initials } from "./utils.js";

export function Avatar({ name, size = "", round = false }: { name: string; size?: string; round?: boolean }) {
  return (
    <div className={"av " + size + (round ? " round" : "")} style={{ background: avColor(name) }}>
      {initials(name)}
    </div>
  );
}

export function Card({ className = "", children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={"card " + className} style={style}>{children}</div>;
}

export function CardHead({ icon, title, sub, right }: { icon?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
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

export const STATUS_MAP: Record<string, { cls: string; icon: string; label: string }> = {
  faol: { cls: "suc", icon: "check", label: "Faol" },
  yangi: { cls: "warn", icon: "star", label: "Yangi" },
  nofaol: { cls: "neut", icon: "x", label: "Nofaol" },
  qarzdor: { cls: "dang", icon: "alert", label: "Qarzdor" },
  "to'langan": { cls: "suc", icon: "check", label: "To'langan" },
  kutilmoqda: { cls: "warn", icon: "clock", label: "Kutilmoqda" },
  qongiroq: { cls: "info", icon: "phone", label: "Qo'ng'iroq" },
  Tayyor: { cls: "suc", icon: "check", label: "Tayyor" },
  Yangi: { cls: "warn", icon: "star", label: "Yangi" },
  Tayyorlanmoqda: { cls: "info", icon: "clock", label: "Tayyorlanmoqda" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { cls: "neut", icon: "dots", label: status };
  return <span className={"badge " + s.cls}><Icon name={s.icon} size={12} /> {s.label}</span>;
}

export function Delta({ dir = "up", children }: { dir?: "up" | "down" | "bad" | "flat"; children: ReactNode }) {
  const icon = dir === "up" ? "trendingUp" : dir === "bad" ? "alert" : "trendingDown";
  return (
    <span className={"stat-delta " + (dir === "bad" ? "bad" : dir === "flat" ? "flat" : "up")}>
      <Icon name={icon} size={14} /> {children}
    </span>
  );
}

export function StatCard({ icon, tone = "a", value, label, delta, ghost }: {
  icon: string;
  tone?: string;
  value: ReactNode;
  label: ReactNode;
  delta?: ReactNode;
  ghost?: string;
}) {
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

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
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

export function PageHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-tools">
      <div className="ttl">{title}</div>
      <div className="spacer" />
      {children}
    </div>
  );
}
