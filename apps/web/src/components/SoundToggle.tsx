import { useSoundToggle } from "../lib/sound.js";

/** Yurish tovushini yoqish/o'chirish tugmasi — o'yin va boshqotirma
 *  sahifalarida qayta ishlatiladi. Holat localStorage'da saqlanadi. */
export function SoundToggle({ style }: { style?: React.CSSProperties }) {
  const { enabled, toggle } = useSoundToggle();
  return (
    <button
      onClick={toggle}
      title={enabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 9, cursor: "pointer", flexShrink: 0,
        border: "1px solid #1e1e22", background: "#111114", color: enabled ? "#c7c8d0" : "#65666f",
        ...style,
      }}
    >
      {enabled ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a9 9 0 0 1 0 12" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M23 9l-6 6M17 9l6 6" />
        </svg>
      )}
    </button>
  );
}
