import { createPortal } from "react-dom";

const PIECES: { v: "q" | "r" | "b" | "n"; label: string }[] = [
  { v: "q", label: "Farzin" },
  { v: "r", label: "Rux" },
  { v: "b", label: "Fil" },
  { v: "n", label: "Ot" },
];

const GLYPH: Record<string, { w: string; b: string }> = {
  q: { w: "♕", b: "♛" },
  r: { w: "♖", b: "♜" },
  b: { w: "♗", b: "♝" },
  n: { w: "♘", b: "♞" },
};

export function PromotionModal({
  color, onPick, onCancel,
}: {
  color: "w" | "b";
  onPick: (piece: "q" | "r" | "b" | "n") => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center", zIndex: 3000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 18, padding: 22, width: 300, maxWidth: "95vw" }}>
        <div style={{ color: "#f5f5f6", fontSize: 15, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Piyodani kimga aylantirasiz?</div>
        <div style={{ color: "#8b8d98", fontSize: 12, textAlign: "center", marginBottom: 16 }}>Bittasini tanlang</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {PIECES.map((p) => (
            <button
              key={p.v}
              onClick={() => onPick(p.v)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "12px 4px", borderRadius: 12, border: "1px solid #232328",
                background: "#18181c", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 32, lineHeight: 1, color: color === "w" ? "#f8f8f8" : "#e5e7eb" }}>{GLYPH[p.v][color]}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#c7d0e8" }}>{p.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
