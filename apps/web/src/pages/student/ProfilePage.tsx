import { useAuthStore } from "../../lib/auth-store.js";
import { useMyXp, useEloHistory, useGameStats, type EloPoint } from "../../lib/queries.js";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#06b6d4", "#f97316"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
const LEVEL_MEDALS = ["🥉", "🥈", "🥇", "🏆", "👑"];

/* ── ELO line chart ──────────────────────────────────────────────────────── */
function EloChart({ points, currentElo }: { points: EloPoint[]; currentElo: number }) {
  const W = 600, H = 180, PAD = { t: 14, r: 8, b: 26, l: 8 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const display = [...points.slice(-7), { elo: currentElo, recordedAt: new Date().toISOString() }];
  if (display.length < 2) display.unshift({ elo: currentElo, recordedAt: new Date(Date.now() - 7 * 86400_000).toISOString() });

  const elos = display.map((p) => p.elo);
  const minElo = Math.min(...elos) - 20;
  const maxElo = Math.max(...elos) + 20;
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
    <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59,130,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-5" /></svg>
          </div>
          <div>
            <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 }}>ELO o'sishi</div>
            <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 2 }}>So'nggi o'yinlar</div>
          </div>
        </div>
        {diff !== 0 && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
            background: diff >= 0 ? "rgba(74,222,128,.15)" : "rgba(239,68,68,.15)",
            color: diff >= 0 ? "#4ade80" : "#f87171",
            border: `1px solid ${diff >= 0 ? "rgba(74,222,128,.3)" : "rgba(239,68,68,.3)"}`,
          }}>
            {diffStr} XP
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ color: "#f5f5f6", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>{currentElo}</div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="eloFillP" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD.l} y1={PAD.t} x2={W - PAD.r} y2={PAD.t} stroke="#1e1e22" strokeWidth="1" strokeDasharray="3 4" />
        <line x1={PAD.l} y1={PAD.t + iH / 2} x2={W - PAD.r} y2={PAD.t + iH / 2} stroke="#1e1e22" strokeWidth="1" strokeDasharray="3 4" />
        <path d={areaPath} fill="url(#eloFillP)" />
        <path d={`M${pts.split(" ").join(" L")}`} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={px(display.length - 1)} cy={py(currentElo)} r="5" fill="#a78bfa" stroke="#141417" strokeWidth="2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: 4, color: "#54555e", fontSize: 10.5, fontWeight: 600 }}>
        <div>{display.length - 1} o'yin oldin</div><div>Bugun</div>
      </div>
    </div>
  );
}

/* ── Donut chart ─────────────────────────────────────────────────────────── */
function DonutChart({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses || 1;
  const winPct = Math.round((wins / total) * 100);
  const R = 42, stroke = 9;
  const C = 2 * Math.PI * R;
  function arc(value: number, offset: number, color: string) {
    const dash = (value / total) * C;
    return (
      <circle key={color} cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset * C / total} />
    );
  }
  return (
    <svg width={120} height={120} viewBox="0 0 100 100" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx="50" cy="50" r={R} fill="none" stroke="#1e1e22" strokeWidth={stroke} />
      {arc(wins, 0, "#22c55e")}
      {arc(draws, wins, "#eab308")}
      {arc(losses, wins + draws, "#ef4444")}
      <text x="50" y="47" textAnchor="middle" fontSize="17" fontWeight="800" fill="#f5f5f6" style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>{winPct}%</text>
      <text x="50" y="61" textAnchor="middle" fontSize="8" fill="#65666f" style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>G'ALABA</text>
    </svg>
  );
}

/* ── Small building blocks ───────────────────────────────────────────────── */
function KpiCard({ icon, tint, value, label, delta }: { icon: React.ReactNode; tint: string; value: React.ReactNode; label: string; delta?: string }) {
  return (
    <div style={{ position: "relative", background: `linear-gradient(135deg,${tint}24 0%,#141417 55%)`, border: "1px solid #232328", borderRadius: 14, padding: 18, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle,${tint}38,transparent 70%)` }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        {delta && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(74,222,128,.15)", border: "1px solid rgba(74,222,128,.3)", color: "#4ade80", fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
            ▲{delta}
          </div>
        )}
      </div>
      <div style={{ position: "relative", color: "#f5f5f6", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ position: "relative", color: "#8b8d98", fontSize: 12, marginTop: 6, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: xp } = useMyXp();
  const { data: eloHistory = [] } = useEloHistory();
  const { data: gameStats } = useGameStats();

  const level = xp?.level ?? 1;
  const currentXp = xp?.xp ?? 0;
  const myElo = xp?.elo ?? 1200;
  const achievements = xp?.achievements ?? [];
  const earnedCount = achievements.filter((a) => a.earned).length;
  const solvedPuzzles = achievements.find((a) => a.code === "first_solve")?.progress.current ?? 0;

  const levelXpNeeded = level * 200;
  const levelXpFloor = (level - 1) * 200;
  const pct = Math.min(100, Math.round(((currentXp - levelXpFloor) / 200) * 100));

  const wins = gameStats?.wins ?? 0;
  const draws = gameStats?.draws ?? 0;
  const losses = gameStats?.losses ?? 0;
  const totalGames = gameStats?.total ?? 0;
  const recent = gameStats?.recent ?? [];

  const name = user?.fullName ?? "—";
  const bg = avatarColor(name);
  const avatarUrl = user?.avatarUrl;

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Hero ── */}
      <div style={{
        position: "relative", background: "linear-gradient(120deg,#0f2418 0%,#164e2e 45%,#1a1530 100%)",
        border: "1px solid #1e4a30", borderRadius: 18, padding: "32px 30px 24px", marginBottom: 20, overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: "20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 20, right: 40, fontSize: 140, lineHeight: 1, opacity: 0.05, color: "#fff" }}>♞</div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: -4, borderRadius: 22, background: "linear-gradient(135deg,#22c55e,#a78bfa,#f97316)", opacity: 0.9, filter: "blur(8px)" }} />
            <div style={{
              position: "relative", width: 96, height: 96, borderRadius: 20, background: `linear-gradient(135deg,${bg},${bg}bb)`,
              color: "#fff", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 10px 30px ${bg}66, inset 0 1px 0 rgba(255,255,255,.25)`, overflow: "hidden",
            }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}
            </div>
            <div style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", border: "3.5px solid #0f2418", boxShadow: "0 0 12px rgba(34,197,94,.6)" }} />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: "#f5f5f6", fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, marginBottom: 10 }}>{name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(234,179,8,.15)", border: "1px solid rgba(234,179,8,.3)", color: "#facc15", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.05em" }}>
                {LEVEL_MEDALS[Math.min(level - 1, LEVEL_MEDALS.length - 1)]} {level}-DARAJA
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,.15)", border: "1px solid rgba(59,130,246,.3)", color: "#60a5fa", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20 }}>
                ⚡ {myElo} ELO
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", color: "#fb923c", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>
                🔥 {xp?.streak ?? 0} kun
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#4ade80", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} /> Onlayn
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="grid cols-4" style={{ gap: 14, marginBottom: 20 }}>
        <KpiCard tint="#3b82f6" value={myElo} label="ELO Reyting"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 2l2.5 6.5H21l-5 4 2 7-6-4-6 4 2-7-5-4h6.5z" /></svg>} />
        <KpiCard tint="#22c55e" value={wins} label="Yutuq" delta={totalGames > 0 ? `${wins}—${losses}` : undefined}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M4 12l5 5L20 6" /></svg>} />
        <KpiCard tint="#eab308" value={<>{currentXp} <span style={{ fontSize: 14, color: "#8b8d98", fontWeight: 700 }}>/ {levelXpNeeded}</span></>} label="XP tajriba"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>} />
        <KpiCard tint="#8b5cf6" value={solvedPuzzles} label="Yechilgan masala"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M9 10l3 3 6-6" /></svg>} />
      </div>

      {/* ── Row: ELO chart + Level/Achievements ── */}
      <div className="grid l-2-1" style={{ gap: 20, marginBottom: 20, alignItems: "start" }}>
        <EloChart points={eloHistory} currentElo={myElo} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Daraja */}
          <div style={{ background: "linear-gradient(135deg,rgba(234,179,8,.14) 0%,#141417 60%)", border: "1px solid #232328", borderRadius: 16, padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 6 }}>{LEVEL_MEDALS[Math.min(level - 1, LEVEL_MEDALS.length - 1)]}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f5f5f6" }}>{level}-daraja</div>
              <div style={{ fontSize: 11.5, color: "#65666f", marginTop: 3 }}>{currentXp} / {levelXpNeeded} XP</div>
            </div>
            <div style={{ height: 7, background: "#1e1e22", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)", width: `${pct}%`, transition: "width .6s" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginTop: 14, textAlign: "center" }}>
              {LEVEL_MEDALS.map((ic, i) => {
                const lv = i + 1;
                const reached = lv <= level;
                return (
                  <div key={lv} style={{ opacity: reached ? 1 : 0.25 }}>
                    <div style={{ fontSize: lv === level ? 22 : 17 }}>{ic}</div>
                    <div style={{ fontSize: 9, marginTop: 2, fontWeight: lv === level ? 700 : 500, color: lv === level ? "#facc15" : "#54555e" }}>{lv}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Yutuqlar */}
          <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(249,115,22,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 01-10 0z" /></svg>
              </div>
              <div>
                <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 }}>Yutuqlar</div>
                <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 2 }}>{earnedCount} / {achievements.length} ochilgan</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {achievements.map((a) => (
                <div key={a.code} title={a.description} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 6px", borderRadius: 10,
                  background: a.earned ? "linear-gradient(135deg,rgba(234,179,8,.14),rgba(234,179,8,.03))" : "#18181c",
                  border: `1px solid ${a.earned ? "rgba(234,179,8,.28)" : "#232328"}`, opacity: a.earned ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: 22, lineHeight: 1, filter: a.earned ? "none" : "grayscale(1)" }}>{a.icon}</div>
                  <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: a.earned ? "#facc15" : "#54555e", lineHeight: 1.2 }}>{a.name}</div>
                </div>
              ))}
              {achievements.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#54555e", fontSize: 12, padding: "12px 0" }}>Hali yutuq yo'q</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row: game stats + recent games ── */}
      <div className="grid l-1-2" style={{ gap: 20 }}>
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(34,197,94,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>
            </div>
            <div>
              <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 }}>O'yin statistikasi</div>
              <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 2 }}>Jami {totalGames} o'yin</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DonutChart wins={wins} draws={draws} losses={losses} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "G'alaba", value: wins, color: "#22c55e", bg: "rgba(34,197,94,.08)", bd: "rgba(34,197,94,.2)" },
                { label: "Durang", value: draws, color: "#eab308", bg: "rgba(234,179,8,.08)", bd: "rgba(234,179,8,.2)" },
                { label: "Mag'lub", value: losses, color: "#ef4444", bg: "rgba(239,68,68,.08)", bd: "rgba(239,68,68,.2)" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: row.bg, border: `1px solid ${row.bd}`, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: row.color }}>{row.label}</span>
                  </div>
                  <span style={{ color: "#f5f5f6", fontSize: 14, fontWeight: 800 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid #1e1e22" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59,130,246,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </div>
            <div>
              <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 }}>So'nggi o'yinlar</div>
              <div style={{ color: "#65666f", fontSize: 11.5, marginTop: 2 }}>PvP natijalari</div>
            </div>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: "36px 22px", textAlign: "center", color: "#65666f", fontSize: 13 }}>Hali o'yin yo'q</div>
          ) : recent.map((g, i) => {
            const ic = avatarColor(g.opponentName);
            const changeColor = g.eloChange > 0 ? "#4ade80" : g.eloChange < 0 ? "#f87171" : "#facc15";
            const changeStr = g.eloChange > 0 ? `+${g.eloChange}` : `${g.eloChange}`;
            const resultBg = g.result === "win" ? "linear-gradient(135deg,#22c55e,#16a34a)" : g.result === "loss" ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "linear-gradient(135deg,#eab308,#ca8a04)";
            const resultTxt = g.result === "win" ? "G" : g.result === "loss" ? "M" : "D";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < recent.length - 1 ? "1px solid #1a1a1e" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: resultBg, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 10px rgba(0,0,0,.25)" }}>{resultTxt}</div>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: ic, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff", flexShrink: 0 }}>
                  {g.opponentName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f5f5f6" }}>{g.opponentName}</div>
                  <div style={{ fontSize: 11, color: "#65666f", marginTop: 2 }}>{new Date(g.playedAt).toLocaleDateString("uz-UZ")}</div>
                </div>
                <div style={{ color: changeColor, fontSize: 14, fontWeight: 800 }}>{changeStr}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Boshqa panellar ── */}
      {(user?.role === "admin" || user?.role === "super_admin" || user?.role === "teacher") && (
        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, padding: "16px 20px", marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#8b8d98" }}>🔑 Boshqa panellar</div>
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <a href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#18181c", border: "1px solid #232328", color: "#c7c8d1", textDecoration: "none", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              🛡 Admin paneli
            </a>
          )}
          {user?.role === "teacher" && (
            <a href="/teacher" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#18181c", border: "1px solid #232328", color: "#c7c8d1", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
              👨‍🏫 O'qituvchi paneli
            </a>
          )}
        </div>
      )}
    </div>
  );
}
