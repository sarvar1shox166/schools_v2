import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Icon } from "@chess-school/ui";
import type { IncomingChallenge } from "../lib/pvpSocket.js";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function PvpChallengeModal({ challenge, onAccept, onDecline, onClose }: {
  challenge: IncomingChallenge;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const color = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e"][challenge.fromName.charCodeAt(0) % 5];

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, width: 380, maxWidth: "calc(100vw - 32px)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(135deg,${color},${color}cc)`, padding: "22px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,.22)", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 }}>
            {initials(challenge.fromName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{challenge.fromName}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.8)", marginTop: 3 }}>
              {challenge.tc} {challenge.tcType} · {challenge.fromElo} ELO
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "none", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 18 }}>
            ✈ Sizni shaxmat o'yiniga chaqirmoqda!
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1, background: "rgba(239,68,68,.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,.3)" }}
              onClick={onDecline}>
              ✕ Rad etish
            </button>
            <button className="btn primary" style={{ flex: 1, background: "#22c55e", border: "none" }}
              onClick={() => { onAccept(); navigate("/student/pvp"); }}>
              ✓ Qabul qilish
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
