import { createPortal } from "react-dom";
import { showXp } from "@chess-school/ui";
import { useClaimStreak, useMyStreak } from "../lib/queries.js";

function xpForCycleDay(day: number) {
  return day === 12 ? 60 : day * 5;
}

export function StreakModal({ onClose }: { onClose: () => void }) {
  const { data } = useMyStreak();
  const claim = useClaimStreak();

  async function handleClaim() {
    try {
      const res = await claim.mutateAsync();
      showXp(res.xpAwarded, `Kun ${res.cycleDay} mukofoti!`);
    } catch {
      // 409 (allaqachon olingan) — useMyStreak qayta so'ralganda holat o'zi yangilanadi, alohida xabar shart emas.
    }
  }

  const currentDay = data?.currentDay ?? 1;
  const claimedDays = data?.claimedDays ?? [];
  const streak = data?.streak ?? 0;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,6,10,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "linear-gradient(180deg,#17171b 0%,#101013 100%)", border: "1px solid #2a2a30", borderRadius: 20,
        width: 520, maxWidth: "100%", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.6)",
      }}>
        <div style={{ position: "relative", padding: "24px 26px 20px", background: "linear-gradient(135deg,rgba(249,115,22,.2) 0%,rgba(234,179,8,.08) 60%,transparent 100%)", borderBottom: "1px solid #232328", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,.28) 0%, transparent 70%)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(249,115,22,.4)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2c1 4-3 5-3 9a3 3 0 006 0c0-1.5-1-2.5-1-2.5 1.5 1 3 3 3 5.5a5 5 0 01-10 0c0-5 5-6 5-12z" /></svg>
              </div>
              <div>
                <div style={{ color: "#f5f5f6", fontSize: 17, fontWeight: 800 }}>Kunlik streak bonusi</div>
                <div style={{ color: "#a3a4ad", fontSize: 12.5, marginTop: 2 }}>Har kuni kirib mukofotni oling — 12 kun ketma-ket</div>
              </div>
            </div>
            <div onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.06)", color: "#8b8d98", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>×</div>
          </div>
          <div style={{ position: "relative", marginTop: 14, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.04)", border: "1px solid #232328", borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ color: "#a3a4ad", fontSize: 12 }}>Joriy streak:</div>
            <div style={{ color: "#fb923c", fontSize: 14, fontWeight: 800 }}>{Math.min(currentDay, 12)} / 12 kun</div>
            <div style={{ flex: 1, height: 6, background: "#232328", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${(Math.min(currentDay, 12) / 12) * 100}%`, height: "100%", background: "linear-gradient(90deg,#f97316,#eab308)" }} />
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 26px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((day) => {
              const xp = xpForCycleDay(day);
              const claimed = claimedDays.includes(day);
              const isCurrent = day === currentDay;
              const canClaim = isCurrent && !claimed && !data?.claimedToday;
              return (
                <div key={day}
                  onClick={canClaim ? handleClaim : undefined}
                  style={{
                    borderRadius: 12, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    cursor: canClaim ? "pointer" : "default",
                    opacity: claimed ? 1 : canClaim ? 1 : 0.55,
                    background: claimed
                      ? "rgba(34,197,94,.1)"
                      : canClaim
                        ? "linear-gradient(135deg,rgba(249,115,22,.15),rgba(234,179,8,.1))"
                        : "#18181c",
                    border: claimed
                      ? "1px solid rgba(34,197,94,.3)"
                      : canClaim
                        ? "1.5px solid #f97316"
                        : "1px solid #232328",
                    boxShadow: canClaim ? "0 0 20px rgba(249,115,22,.25)" : "none",
                  }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".03em", color: claimed ? "#4ade80" : canClaim ? "#fb923c" : "#65666f" }}>
                    Kun {day}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: claimed ? "#4ade80" : canClaim ? "#fb923c" : "#65666f" }}>
                    +{xp} XP
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: claimed ? "#4ade80" : canClaim ? "#fb923c" : "#54555e" }}>
                    {claim.isPending && isCurrent ? "..." : claimed ? "✓ Olindi" : canClaim ? "Olish" : "Yopiq"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
