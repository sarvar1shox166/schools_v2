import { useState } from "react";
import { useAuthStore } from "../../lib/auth-store.js";
import { useLeaderboard, useMyXp } from "../../lib/queries.js";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const COLORS = [
  "#f59e0b","#3b82f6","#8b5cf6","#ec4899","#10b981",
  "#ef4444","#06b6d4","#f97316","#84cc16","#6366f1",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function Av({ name, size = 40 }: { name: string; size?: number }) {
  const bg = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.24,
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: size * 0.36, color: "#fff", flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data = [], isLoading } = useLeaderboard();
  const { data: xp } = useMyXp();
  const user = useAuthStore((s) => s.user);

  const myIdx = data.findIndex((s) => s.fullName === user?.fullName);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;
  const myEntry = myIdx >= 0 ? data[myIdx] : null;
  const myElo = xp?.elo ?? myEntry?.elo ?? 1200;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  // ELO gap to next rank
  const gapToNext = myRank && myRank > 1
    ? Math.max(0, (data[myRank - 2]?.elo ?? 1200) - myElo)
    : 0;

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [1, 0, 2];
  // index 0 = 1st place, 1 = 2nd, 2 = 3rd
  const podiumHeights = [200, 160, 130];
  const podiumColors = [
    "linear-gradient(180deg,#fbbf24 0%,#d97706 100%)",
    "linear-gradient(180deg,#94a3b8 0%,#64748b 100%)",
    "linear-gradient(180deg,#b45309 0%,#92400e 100%)",
  ];
  const badgeColors = ["#fbbf24", "#94a3b8", "#b45309"];
  const rankMedal = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 40 }}>

      {/* ── Header row ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
            🏆 Reyting jadvali
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,.35)" }}>
            XP bo'yicha umumiy reyting
          </p>
        </div>
      </div>

      {/* ── Podium ─────────────────────────────────────────────────── */}
      {!isLoading && top3.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 0 }}>
          {podiumOrder.map((rank0) => {
            const e = top3[rank0];
            if (!e) return <div key={rank0} style={{ flex: 1 }} />;
            const isMe = e.fullName === user?.fullName;
            const avSz = rank0 === 0 ? 68 : 54;
            return (
              <div key={rank0} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Info above block */}
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <Av name={e.fullName} size={avSz} />
                    <div style={{
                      position: "absolute", bottom: -6, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: badgeColors[rank0],
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 900, color: "#fff",
                      border: "2px solid #131929",
                    }}>{rank0 + 1}</div>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 800, fontSize: 14 }}>
                    {isMe ? "Siz" : e.fullName.split(" ")[0]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6", marginTop: 1 }}>
                    {e.elo ?? 1200}
                  </div>
                  <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 1 }}>
                    ⚡ {e.xp} XP
                  </div>
                </div>
                {/* Block */}
                <div style={{
                  width: "100%", height: podiumHeights[rank0],
                  background: podiumColors[rank0],
                  borderRadius: "10px 10px 0 0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 52, fontWeight: 900, color: "rgba(255,255,255,.18)",
                }}>
                  {rank0 + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom row: list + right panel ────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

        {/* To'liq jadval */}
        <div style={{
          background: "rgba(255,255,255,.04)",
          border: "1.5px solid rgba(255,255,255,.08)",
          borderRadius: top3.length > 0 ? "0 0 14px 14px" : 14,
          overflow: "hidden",
        }}>
          {/* List header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(99,102,241,.2)", display: "grid", placeItems: "center", fontSize: 14,
            }}>📊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>To'liq jadval</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Barcha o'quvchilar</div>
            </div>
          </div>

          {isLoading && (
            <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>
              Yuklanmoqda...
            </div>
          )}

          {rest.map((e, i) => {
            const rank = i + 4;
            const isMe = e.fullName === user?.fullName;
            return (
              <div key={e.fullName + i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 20px",
                background: isMe ? "rgba(59,130,246,.08)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                borderLeft: isMe ? "3px solid #3b82f6" : "3px solid transparent",
              }}>
                <div style={{ width: 24, textAlign: "center", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                  {rank}
                </div>
                <Av name={e.fullName} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {e.fullName}{isMe ? " (Siz)" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 1 }}>⚡ {e.xp} XP</div>
                </div>
                {/* Rank change */}
                <div style={{ width: 36, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.3)" }}>
                  —
                </div>
                {/* ELO */}
                <div style={{ width: 50, textAlign: "right", fontWeight: 800, fontSize: 14, color: "#e2e8f0" }}>
                  {e.elo ?? 1200}
                </div>
                {/* ELO change */}
                <div style={{ width: 36, textAlign: "right", fontSize: 12, color: "rgba(255,255,255,.3)" }}>
                  0
                </div>
              </div>
            );
          })}

          {!isLoading && data.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 14 }}>
              Hali ma'lumot yo'q
            </div>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div style={{
          background: "rgba(255,255,255,.04)",
          border: "1.5px solid rgba(255,255,255,.08)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {/* Medal + rank */}
          <div style={{ padding: "28px 20px 20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>
              {myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
              {myRank ? `${myRank}-o'rin` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>
              Sizning o'rningiz
            </div>
          </div>

          {/* ELO ball */}
          <div style={{
            margin: "16px 16px 0",
            background: "rgba(37,99,235,.25)",
            border: "1px solid rgba(59,130,246,.3)",
            borderRadius: 12, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#60a5fa" }}>{myElo}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>ELO ball</div>
          </div>

          {/* Progress to next rank */}
          {myRank && myRank > 1 && (
            <div style={{ margin: "14px 16px 0", padding: "12px 14px", background: "rgba(255,255,255,.03)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,.45)" }}>
                  {myRank - 1}-o'ringacha
                </span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>{gapToNext} ELO</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
                  width: `${Math.max(4, Math.min(96, 100 - (gapToNext / 600) * 100))}%`,
                }} />
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "14px 16px 18px" }}>
            {[
              { label: "Bu hafta", value: `+${xp?.xp ?? 0}`, color: "#3b82f6" },
              { label: "G'alaba",  value: "—",               color: "#10b981" },
              { label: "Mag'lub",  value: "—",               color: "#ef4444" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "rgba(255,255,255,.04)", borderRadius: 10,
                padding: "10px 6px", textAlign: "center",
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
