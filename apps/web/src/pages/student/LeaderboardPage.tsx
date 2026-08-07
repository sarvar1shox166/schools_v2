import { useState } from "react";
import { useAuthStore } from "../../lib/auth-store.js";
import { usePvpSocket } from "../../lib/pvpSocket.js";
import { useLeaderboard, useMyXp, useEloHistory, useGameStats } from "../../lib/queries.js";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const COLORS = [
  "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#ef4444", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_SIZES = [58, 48, 42];
const AVATAR_SIZES = [86, 72, 62];
const AVATAR_FONTS = [26, 22, 19];
const NAME_SIZES = [23, 21, 19];
const ELO_SIZES = [52, 40, 34];
const ELO_COLORS = ["#facc15", "#e5e7eb", "#fdba74"];
const RANK_COLORS = ["#facc15", "#e5e7eb", "#fdba74"];

const TABS: { id: "elo" | "xp"; label: string }[] = [
  { id: "elo", label: "Reyting (ELO)" },
  { id: "xp", label: "XP bo'yicha" },
];

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<"elo" | "xp">("elo");
  const { data = [], isLoading } = useLeaderboard(sortBy);
  const { data: xp } = useMyXp();
  const { data: eloHistory = [] } = useEloHistory();
  const { data: gameStats } = useGameStats();
  const user = useAuthStore((s) => s.user);
  const { onlinePlayers } = usePvpSocket();
  const onlineIds = new Set(onlinePlayers.map((p) => p.studentId));

  const myIdx = data.findIndex((s) => s.userId === user?.id);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;
  const myEntry = myIdx >= 0 ? data[myIdx] : null;
  const myElo = xp?.elo ?? myEntry?.elo ?? 1200;
  const myXp = xp?.xp ?? myEntry?.xp ?? 0;
  // Faol tabga qarab asosiy ko'rsatkich (katta raqam) almashadi — ELO tabida
  // ELO, XP tabida XP birinchi o'ringa chiqadi.
  const myValue = sortBy === "elo" ? myElo : myXp;
  const valueLabel = sortBy === "elo" ? "ELO" : "XP";

  const weekElo = eloHistory.length > 0 ? eloHistory[Math.max(0, eloHistory.length - 7)]?.elo ?? myElo : myElo;
  const weekDiff = myElo - weekElo;
  const weekDiffStr = weekDiff >= 0 ? `+${weekDiff}` : `${weekDiff}`;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  const gapToNext = myRank && myRank > 1 ? Math.max(0, (data[myRank - 2]?.[sortBy] ?? myValue) - myValue) : 0;

  return (
    <div style={{ paddingBottom: 40 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#f5f5f6" }}>Reyting jadvali 🏆</div>
        <div style={{ display: "flex", gap: 6, background: "#141417", border: "1px solid #232328", borderRadius: 12, padding: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSortBy(t.id)}
              style={{
                padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, transition: "all .15s",
                background: sortBy === t.id ? "#22c55e" : "transparent",
                color: sortBy === t.id ? "#052e16" : "#8b8d98",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top-3 + siz paneli ── */}
      <div className="grid l-2-1" style={{ gap: 20, marginBottom: 20, alignItems: "start" }}>

        <div style={{ background: "linear-gradient(135deg,#141417 0%,#161620 100%)", border: "1px solid #232328", borderRadius: 22, padding: "34px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(234,179,8,0.14),transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -30, right: -20, fontSize: 200, lineHeight: 1, color: "#fff", opacity: 0.03 }}>♛</div>

          {isLoading ? (
            <div style={{ color: "#65666f", textAlign: "center", padding: "40px 0" }}>Yuklanmoqda...</div>
          ) : top3.length === 0 ? (
            <div style={{ color: "#65666f", textAlign: "center", padding: "40px 0" }}>Hali ma'lumot yo'q</div>
          ) : top3.map((e, i) => {
            const isMe = e.userId === user?.id;
            const online = onlineIds.has(e.userId);
            return (
              <div key={e.userId} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", borderBottom: i < top3.length - 1 ? "1px solid #232328" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
                  <div style={{ fontSize: MEDAL_SIZES[i], lineHeight: 1 }}>{MEDALS[i]}</div>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: AVATAR_SIZES[i], height: AVATAR_SIZES[i], borderRadius: 16, background: avatarColor(e.fullName),
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a0c", fontSize: AVATAR_FONTS[i], fontWeight: 800,
                      boxShadow: "0 6px 18px rgba(0,0,0,.3)", overflow: "hidden",
                    }}>
                      {e.avatarUrl ? <img src={e.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(e.fullName)}
                    </div>
                    {online && <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2.5px solid #141417", boxShadow: "0 0 8px rgba(34,197,94,.6)" }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: NAME_SIZES[i], fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1, color: "#f5f5f6", whiteSpace: "nowrap" }}>
                      {isMe ? "Siz" : e.fullName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#fb923c", fontSize: 12, fontWeight: 700 }}>🔥 {e.streak}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#4ade80", fontSize: 12, fontWeight: 700 }}>✓ {e.wins} g'alaba</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: ELO_SIZES[i], fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: ELO_COLORS[i] }}>{e[sortBy]}</div>
                  <div style={{ fontSize: 11, color: "#65666f", marginTop: 6, fontWeight: 600 }}>
                    {sortBy === "elo" ? `${e.xp} XP` : `${e.elo} ELO`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.18) 0%,#141417 65%)", border: "1px solid rgba(34,197,94,0.28)", borderRadius: 20, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.22),transparent 70%)" }} />
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: "0.2em", color: "#4ade80" }}>/SIZNING O'RNINGIZ</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "#f5f5f6", lineHeight: 1, letterSpacing: "-0.03em" }}>{myRank ? `${myRank}-o'rin` : "—"}</div>
                  <div style={{ color: "#86efac", fontSize: 13, fontWeight: 700 }}>{myValue} {valueLabel}</div>
                </div>
                {myRank && myRank > 1 && (
                  <div style={{ fontSize: 12, color: "#86efac", fontWeight: 600, marginTop: 8 }}>▲ {gapToNext} {valueLabel} — {myRank - 1}-o'ringacha</div>
                )}
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(34,197,94,.4)", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.4"><path d="M12 15a5 5 0 100-10 5 5 0 000 10z" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></svg>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.12) 0%,#141417 60%)", border: "1px solid #232328", borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#60a5fa" }}>HAFTA</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em", color: "#f5f5f6" }}>{weekDiffStr}</div>
              <div style={{ fontSize: 11, color: "#8b8d98" }}>ELO farqi</div>
            </div>
            <div style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.14) 0%,#141417 60%)", border: "1px solid #232328", borderRadius: 14, padding: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.15em", color: "#a78bfa" }}>O'YIN</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em", color: "#f5f5f6" }}>{gameStats?.wins ?? 0}—{gameStats?.losses ?? 0}</div>
              <div style={{ fontSize: 11, color: "#8b8d98" }}>G'alaba / Mag'lub</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full table ── */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#f5f5f6" }}>Barcha o'quvchilar</div>
        </div>

        <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 16, overflow: "hidden" }}>
         <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1.7fr 0.9fr 1fr 0.7fr", minWidth: 480, padding: "14px 22px", background: "#18181c", color: "#8b8d98", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: "0.15em", borderBottom: "1px solid #232328" }}>
            <div>#</div><div>O'QUVCHI</div><div>ELO</div><div>XP</div><div>STREAK</div>
          </div>

          {isLoading && <div style={{ padding: 32, textAlign: "center", color: "#65666f", fontSize: 14 }}>Yuklanmoqda...</div>}

          {rest.map((e, i) => {
            const rank = i + 4;
            const isMe = e.userId === user?.id;
            const online = onlineIds.has(e.userId);
            return (
              <div key={e.userId} style={{
                display: "grid", gridTemplateColumns: "56px 1.7fr 0.9fr 1fr 0.7fr", minWidth: 480, padding: "14px 22px", alignItems: "center",
                borderBottom: i < rest.length - 1 ? "1px solid #1a1a1e" : "none",
                background: isMe ? "linear-gradient(90deg,rgba(34,197,94,0.08),transparent)" : "transparent",
                borderLeft: isMe ? "3px solid #22c55e" : "3px solid transparent",
              }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: "#65666f" }}>{String(rank).padStart(2, "0")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarColor(e.fullName), color: "#0a0a0c", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {e.avatarUrl ? <img src={e.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(e.fullName)}
                    </div>
                    {online && <div style={{ position: "absolute", bottom: -2, right: -2, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid #141417" }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2, color: "#f5f5f6" }}>{e.fullName}</div>
                      {isMe && <div style={{ background: "rgba(34,197,94,.2)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 99, letterSpacing: "0.05em" }}>SIZ</div>}
                    </div>
                    <div style={{ color: "#4ade80", fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>{e.wins} g'alaba</div>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.02em", color: sortBy === "elo" ? "#4ade80" : "#f5f5f6" }}>{e.elo}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: sortBy === "xp" ? "#4ade80" : "#c7d0e8" }}>{e.xp}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#fb923c" }}>🔥 {e.streak}</div>
              </div>
            );
          })}

          {!isLoading && data.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#54555e", fontSize: 14 }}>Hali ma'lumot yo'q</div>
          )}
         </div>
        </div>

        <div style={{ color: "#65666f", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.05em", marginTop: 14 }}>
          Jami {data.length} o'quvchi
        </div>
      </div>
    </div>
  );
}
