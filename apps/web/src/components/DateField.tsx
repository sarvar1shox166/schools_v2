import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const UZ_MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const DAY_LETTERS = ["Du","Se","Cho","Pa","Ju","Sha","Ya"];

function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDisplay(s: string): string {
  const d = parseISO(s);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/**
 * Kun/oy/yil tartibi doim DD.MM.YYYY bo'ladigan sana tanlagich — brauzerning native
 * <input type="date"> ko'rinishi tizim tiliga qarab MM/DD/YYYY yoki boshqa tartibda
 * chiqishi mumkin, bu esa admin uchun chalkashlik keltirib chiqargan edi.
 */
export function DateField({ value, onChange, min, max, placeholder = "kk.oo.yyyy" }: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  }, [open]);

  const minD = min ? parseISO(min) : null;
  const maxD = max ? parseISO(max) : null;

  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstDow = (first.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  function isDisabled(d: Date) {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="inp"
        style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => { setViewMonth(selected ?? new Date()); setOpen((o) => !o); }}
      >
        <span style={{ color: value ? "inherit" : "var(--text-faint)" }}>{value ? fmtDisplay(value) : placeholder}</span>
        <span style={{ fontSize: 15, opacity: 0.6 }}>📅</span>
      </button>

      {open && createPortal(
        <div ref={popRef} style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 1000,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,.18)", padding: 12, width: 260,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" className="iconbtn" style={{ width: 26, height: 26 }}
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{UZ_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
            <button type="button" className="iconbtn" style={{ width: 26, height: 26 }}
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DAY_LETTERS.map((l) => (
              <div key={l} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", padding: "2px 0" }}>{l}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = toISO(d);
              const disabled = isDisabled(d);
              const isSelected = value === iso;
              const isToday = toISO(new Date()) === iso;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: isToday && !isSelected ? "1px solid var(--border-strong,var(--border))" : "none",
                    background: isSelected ? "var(--accent)" : "transparent",
                    color: isSelected ? "#fff" : disabled ? "var(--text-faint)" : "inherit",
                    fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
