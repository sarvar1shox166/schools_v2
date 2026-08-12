/* Umumiy o'yin sahifasi komponentlari — PvpPage (jonli raqib) va PvpGamePage
 * (kompyuter) o'rtasida bir xil "RAQIBLAR" dizaynini almashish uchun. */

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e"];

export function initialsOf(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function avatarColorFor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Avatar — rasm bo'lsa uni, bo'lmasa bosh harflar/emoji ko'rsatadi ────── */
function Avatar({ name, avatarUrl, icon, size = 46 }: {
  name: string; avatarUrl?: string | null; icon?: string; size?: number;
}) {
  const color = avatarColorFor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.26, overflow: "hidden", flexShrink: 0,
      background: avatarUrl ? "#0d0d10" : (icon ? "linear-gradient(135deg,#a78bfa,#7c3aed)" : color),
      display: "grid", placeItems: "center",
      fontSize: icon ? size * 0.48 : size * 0.32, fontWeight: 800, color: "#fff",
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (icon ?? initialsOf(name))}
    </div>
  );
}

/* ── RAQIBLAR panelidagi o'yinchi ma'lumot kartasi ───────────────────────── */
export function PlayerIdentityCard({
  name, elo, xp, avatarUrl, icon, isMe, online, sublabel,
}: {
  name: string; elo: number; xp?: number; avatarUrl?: string | null; icon?: string;
  isMe?: boolean; online?: boolean; sublabel?: string;
}) {
  return (
    <div style={{
      background: isMe ? "linear-gradient(135deg,rgba(34,197,94,0.10) 0%,#141417 65%)" : "#141417",
      border: `1px solid ${isMe ? "rgba(34,197,94,0.3)" : "#232328"}`,
      borderRadius: 14, padding: 12, display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ position: "relative" }}>
        <Avatar name={name} avatarUrl={avatarUrl} icon={icon} />
        {online && (
          <span style={{
            position: "absolute", bottom: -1, right: -1, width: 12, height: 12,
            borderRadius: "50%", background: "#4ade80", border: "2px solid #141417",
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#f5f5f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          {isMe && (
            <span style={{
              fontSize: 9.5, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,.15)",
              border: "1px solid rgba(74,222,128,.3)", borderRadius: 5, padding: "1px 5px", letterSpacing: ".03em", flexShrink: 0,
            }}>SIZ</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 11.5, color: "#8b8d98", fontWeight: 600 }}>
          <span>🏆 {elo} ELO</span>
          {typeof xp === "number" && <span>⚡ {xp.toLocaleString("ru-RU")} XP</span>}
        </div>
        {sublabel && <div style={{ fontSize: 11, color: "#65666f", marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

/* ── "VS" ajratkichi ──────────────────────────────────────────────────────── */
export function VsDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
      <div style={{ flex: 1, height: 1, background: "#232328" }} />
      <div style={{ fontSize: 11, fontWeight: 800, color: "#54555e", letterSpacing: 2 }}>VS</div>
      <div style={{ flex: 1, height: 1, background: "#232328" }} />
    </div>
  );
}

/* ── Vaqt nazorati belgisi ────────────────────────────────────────────────── */
export function TcBadge({ tc, tcType, color }: { tc: string; tcType: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 14px",
      borderRadius: 10, border: `1px solid ${color}44`, background: `${color}18`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontWeight: 800, fontSize: 12, color, letterSpacing: "0.02em" }}>{tc} {tcType}</span>
    </div>
  );
}

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Ixcham soat — nofaol/raqib uchun ─────────────────────────────────────── */
export function ClockPill({ name, seconds, isActive, isLow }: {
  name: string; seconds: number; isActive?: boolean; isLow?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
      background: "#141417", border: "1px solid #232328", borderRadius: 10,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: isActive ? "#4ade80" : "#3f3f46",
      }} />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "#c7d0e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <span style={{
        fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums",
        color: isLow ? "#f87171" : "#f5f5f6",
      }}>{fmtClock(seconds)}</span>
    </div>
  );
}

/* ── Katta soat kartasi — faol tomon uchun ta'kidlangan ───────────────────── */
export function ClockCard({
  name, seconds, avatarUrl, icon, isMe, isActive, isLow,
}: {
  name: string; seconds: number; avatarUrl?: string | null; icon?: string;
  isMe?: boolean; isActive: boolean; isLow?: boolean;
}) {
  return (
    <div style={{
      background: isActive ? "linear-gradient(135deg,rgba(59,130,246,0.14) 0%,#141417 60%)" : "#141417",
      border: `1px solid ${isActive ? "rgba(59,130,246,0.35)" : "#232328"}`,
      borderRadius: 14, padding: 14, transition: "all .2s",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <Avatar name={name} avatarUrl={avatarUrl} icon={icon} size={40} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#f5f5f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {isMe && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,.15)",
            border: "1px solid rgba(74,222,128,.3)", borderRadius: 5, padding: "1px 5px", flexShrink: 0,
          }}>SIZ</span>
        )}
      </div>
      <div style={{
        padding: "8px 14px", borderRadius: 10,
        background: isLow ? "#ef4444" : isActive ? "#3b82f6" : "#18181c",
        border: isLow || isActive ? "none" : "1px solid #232328",
        fontWeight: 800, fontSize: 20, letterSpacing: 1,
        color: "#fff", fontVariantNumeric: "tabular-nums",
        transition: "background .3s",
      }}>
        {fmtClock(seconds)}
      </div>
    </div>
  );
}

/* ── Yurishlar tarixi — orqaga/oldinga ko'rib chiqish bilan ──────────────── */
export function MovesPanel({ moves, viewIndex, onViewIndex }: {
  moves: string[]; viewIndex: number | null; onViewIndex: (i: number | null) => void;
}) {
  const lastIndex = moves.length - 1;
  const current = viewIndex ?? lastIndex;
  const atStart = current <= -1;
  const atLive = viewIndex === null;

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid #232328",
    background: "#18181c", color: disabled ? "#3f3f46" : "#c7d0e8",
    cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: 700,
  });

  return (
    <div style={{
      padding: "12px 16px", background: "#141417",
      border: "1px solid #232328", borderRadius: 12,
      minHeight: 90, maxHeight: 200, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "#f5f5f6", fontSize: 12.5, fontWeight: 800 }}>Yurishlar</div>
        <div style={{ color: "#65666f", fontSize: 11, fontWeight: 700 }}>{moves.length} yurish</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {moves.length === 0 ? (
          <div style={{ color: "#54555e", fontSize: 12.5, textAlign: "center", paddingTop: 8 }}>
            Hali yurish yo'q
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {moves.map((m, i) => (
              <span
                key={i}
                onClick={() => onViewIndex(i === lastIndex ? null : i)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", cursor: "pointer",
                  borderRadius: 6,
                  background: i === current ? "#3b82f6" : "#18181c",
                  color: i === current ? "#fff" : "#c7d0e8",
                }}>
                {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""}{m}
              </span>
            ))}
          </div>
        )}
      </div>

      {moves.length > 0 && (
        <div style={{ display: "flex", gap: 6 }}>
          <button disabled={atStart} onClick={() => onViewIndex(-1)} style={navBtnStyle(atStart)}>⏮</button>
          <button disabled={atStart} onClick={() => onViewIndex(current - 1)} style={navBtnStyle(atStart)}>◀</button>
          <button disabled={atLive} onClick={() => onViewIndex(current + 1 >= lastIndex ? null : current + 1)} style={navBtnStyle(atLive)}>▶</button>
          <button disabled={atLive} onClick={() => onViewIndex(null)} style={navBtnStyle(atLive)}>⏭</button>
        </div>
      )}
    </div>
  );
}
