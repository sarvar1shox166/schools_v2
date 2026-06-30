import { useAuthStore } from "../../lib/auth-store.js";
import { useMyXp, useEloHistory, useGameStats, type EloPoint } from "../../lib/queries.js";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
const COLORS = ["#f59e0b","#3b82f6","#8b5cf6","#ec4899","#10b981","#ef4444","#06b6d4","#f97316"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/* ── ELO line chart ──────────────────────────────────────────────────────── */
function EloChart({ points, currentElo }: { points: EloPoint[]; currentElo: number }) {
  const W = 660, H = 220, PAD = { t: 16, r: 16, b: 40, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  // Build display points: last 8 history + current
  const display = [...points.slice(-7), { elo: currentElo, recordedAt: new Date().toISOString() }];
  if (display.length < 2) {
    // Not enough data — show flat line at current ELO
    display.unshift({ elo: currentElo, recordedAt: new Date(Date.now() - 7 * 86400_000).toISOString() });
  }

  const elos = display.map((p) => p.elo);
  const minElo = Math.min(...elos) - 30;
  const maxElo = Math.max(...elos) + 30;
  const eloRange = maxElo - minElo || 1;

  const px = (i: number) => PAD.l + (i / (display.length - 1)) * iW;
  const py = (elo: number) => PAD.t + iH - ((elo - minElo) / eloRange) * iH;

  const pts = display.map((p, i) => `${px(i)},${py(p.elo)}`).join(" ");
  const areaPath = `M${px(0)},${py(display[0].elo)} ` +
    display.map((p, i) => `L${px(i)},${py(p.elo)}`).join(" ") +
    ` L${px(display.length - 1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;

  const firstElo = display[0].elo;
  const diff = currentElo - firstElo;
  const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

  return (
    <div style={{ position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
          📈 ELO o'sishi
        </div>
        {diff !== 0 && (
          <div style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
            background: diff >= 0 ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
            color: diff >= 0 ? "#10b981" : "#ef4444",
            border: `1px solid ${diff >= 0 ? "#10b98130" : "#ef444430"}`,
          }}>
            {diffStr} bu oy
          </div>
        )}
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => {
          const y = PAD.t + iH * (1 - t);
          const elo = Math.round(minElo + t * eloRange);
          return (
            <g key={t}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.3)">{elo}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#eloGrad)" />

        {/* Line */}
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {display.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p.elo)} r="4" fill="#3b82f6" stroke="#131929" strokeWidth="2" />
        ))}

        {/* Last dot highlight */}
        <circle cx={px(display.length - 1)} cy={py(currentElo)} r="6" fill="#3b82f6" stroke="#131929" strokeWidth="2.5" />

        {/* X axis labels */}
        <text x={PAD.l} y={H - 8} fontSize="11" fill="rgba(255,255,255,.3)">
          {display.length > 1 ? `${display.length - 1} o'yin oldin` : "8 hafta oldin"}
        </text>
        <text x={W - PAD.r} y={H - 8} fontSize="11" fill="rgba(255,255,255,.3)" textAnchor="end">Hozir</text>
      </svg>

      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{firstElo}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>→</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>{currentElo}</span>
        {diff !== 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: diff >= 0 ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
            color: diff >= 0 ? "#10b981" : "#ef4444",
          }}>{diffStr}</span>
        )}
      </div>
    </div>
  );
}

/* ── Donut chart ─────────────────────────────────────────────────────────── */
function DonutChart({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses || 1;
  const winPct = Math.round((wins / total) * 100);
  const R = 52, cx = 70, cy = 70, stroke = 14;
  const C = 2 * Math.PI * R;

  function arc(value: number, offset: number, color: string) {
    const dash = (value / total) * C;
    return (
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={-offset * C / total}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
      />
    );
  }

  return (
    <svg width={140} height={140} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
      {arc(wins, 0, "#10b981")}
      {arc(draws, wins, "#f59e0b")}
      {arc(losses, wins + draws, "#ef4444")}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">{winPct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.4)">G'alaba</text>
    </svg>
  );
}

/* ── Level medals ────────────────────────────────────────────────────────── */
const LEVEL_MEDALS = ["🥉","🥈","🥇","🏆","👑"];

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: xp } = useMyXp();
  const { data: eloHistory = [] } = useEloHistory();
  const { data: gameStats } = useGameStats();

  const level = xp?.level ?? 1;
  const currentXp = xp?.xp ?? 0;
  const myElo = xp?.elo ?? 1200;
  const earnedCount = (xp?.achievements ?? []).filter((a) => a.earned).length;

  const levelXpNeeded = level * 200;      // each level = 200 XP
  const levelXpFloor = (level - 1) * 200;
  const pct = Math.min(100, Math.round(((currentXp - levelXpFloor) / 200) * 100));
  const xpLeft = levelXpNeeded - currentXp;

  const wins = gameStats?.wins ?? 0;
  const draws = gameStats?.draws ?? 0;
  const losses = gameStats?.losses ?? 0;
  const totalGames = gameStats?.total ?? 0;
  const recent = gameStats?.recent ?? [];

  const name = user?.fullName ?? "—";
  const bg = avatarColor(name);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ── Left column ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Profile card */}
          <div style={{
            background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {/* Cover */}
            <div style={{
              height: 100,
              background: `linear-gradient(135deg, ${bg}cc, ${bg}44)`,
            }} />
            {/* Avatar + info */}
            <div style={{ padding: "0 24px 24px", marginTop: -32 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 26, color: "#fff",
                border: "3px solid #131929",
              }}>
                {initials(name)}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 10 }}>{name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                O'quvchi
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10,
                padding: "4px 12px", borderRadius: 99,
                background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)",
                fontSize: 12, fontWeight: 700, color: "#fbbf24",
              }}>
                👑 {level}-daraja o'quvchi
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 28, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                {[
                  { label: "ELO",    value: myElo,       color: "#3b82f6" },
                  { label: "Yutuq",  value: earnedCount, color: "#f59e0b" },
                  { label: "XP",     value: currentXp,   color: "#10b981" },
                  { label: "Masala", value: (xp?.achievements ?? []).find(a => a.code === "first_solve")?.progress.current ?? 0, color: "#e2e8f0" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ELO Chart */}
          <div style={{
            background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
            borderRadius: 16, padding: "20px 24px",
          }}>
            <EloChart points={eloHistory} currentElo={myElo} />
          </div>

          {/* Game stats */}
          <div style={{
            background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
            borderRadius: 16, padding: "20px 24px",
          }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              🎮 O'yin statistikasi
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <DonutChart wins={wins} draws={draws} losses={losses} />
              <div style={{ flex: 1 }}>
                {[
                  { label: "G'alaba", value: wins,  color: "#10b981" },
                  { label: "Durang",  value: draws, color: "#f59e0b" },
                  { label: "Mag'lub", value: losses, color: "#ef4444" },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.05)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.color }} />
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,.7)" }}>{row.label}</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 15 }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>Jami o'yin</span>
                  <span style={{ fontWeight: 900, fontSize: 15 }}>{totalGames}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent games */}
          {recent.length > 0 && (
            <div style={{
              background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
              borderRadius: 16, overflow: "hidden",
            }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: 800, fontSize: 14 }}>
                🕐 So'nggi o'yinlar
              </div>
              {recent.map((g, i) => {
                const initChar = g.opponentName.charAt(0).toUpperCase();
                const ic = avatarColor(g.opponentName);
                const changeColor = g.eloChange > 0 ? "#10b981" : g.eloChange < 0 ? "#ef4444" : "#f59e0b";
                const changeStr = g.eloChange > 0 ? `+${g.eloChange}` : `${g.eloChange}`;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 20px", borderBottom: "1px solid rgba(255,255,255,.04)",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: ic, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0,
                    }}>{initChar}</div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{g.opponentName}</div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: changeColor }}>{changeStr}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* XP va daraja */}
          <div style={{
            background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
            borderRadius: 16, padding: "20px",
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 16, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 5 }}>
              ⚡ XP va daraja
            </div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>
                {LEVEL_MEDALS[Math.min(level - 1, LEVEL_MEDALS.length - 1)]}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{level}-daraja</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>
                Keyingisi: {xpLeft} XP kerak
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "rgba(255,255,255,.4)" }}>{currentXp} / {levelXpNeeded} XP</span>
              <span style={{ fontWeight: 700, color: "#3b82f6" }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
                width: `${pct}%`, transition: "width .6s",
              }} />
            </div>

            {/* Level badges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginTop: 16, textAlign: "center" }}>
              {LEVEL_MEDALS.map((ic, i) => {
                const lv = i + 1;
                const reached = lv <= level;
                const isCurrent = lv === level;
                return (
                  <div key={lv} style={{ opacity: reached ? 1 : 0.2 }}>
                    <div style={{ fontSize: isCurrent ? 26 : 20 }}>{ic}</div>
                    <div style={{
                      fontSize: 9, marginTop: 2, fontWeight: isCurrent ? 700 : 400,
                      color: isCurrent ? "#fbbf24" : "rgba(255,255,255,.4)",
                    }}>{lv}{isCurrent ? " ✓" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boshqa panellar */}
          {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "teacher") && (
            <div style={{
              background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.08)",
              borderRadius: 16, padding: "16px 20px",
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 5 }}>
                🔑 Boshqa panellar
              </div>
              {(user?.role === "admin" || user?.role === "super_admin") && (
                <a href="/admin" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
                  color: "rgba(255,255,255,.8)", textDecoration: "none", fontWeight: 600, fontSize: 13,
                  marginBottom: 8,
                }}>
                  🛡 Admin paneli
                </a>
              )}
              {user?.role === "teacher" && (
                <a href="/teacher" style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
                  color: "rgba(255,255,255,.8)", textDecoration: "none", fontWeight: 600, fontSize: 13,
                }}>
                  👨‍🏫 O'qituvchi paneli
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
