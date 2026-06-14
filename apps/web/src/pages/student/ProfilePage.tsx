import { Avatar, Card, PageHead } from "@chess-school/ui";
import { useAuthStore } from "../../lib/auth-store.js";
import { useMyXp } from "../../lib/queries.js";

const LEVEL_ICONS = ["🥉", "🥈", "🥇", "🏆", "👑"];

function xpForLevel(level: number) {
  return level * 200;
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { data: xp } = useMyXp();

  const level = xp?.level ?? 1;
  const currentXp = xp?.xp ?? 0;
  const levelFloor = (level - 1) * 200;
  const levelCeil = xpForLevel(level);
  const pct = Math.round(((currentXp - levelFloor) / (levelCeil - levelFloor)) * 100);
  const earnedCount = (xp?.achievements ?? []).filter((a) => a.earned).length;

  return (
    <div>
      <PageHead title="Mening profilim" />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--gap)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card>
            <div className="prof-bg" />
            <div style={{ padding: "0 20px 20px" }}>
              <div className="prof-av-wrap">
                <Avatar name={user?.fullName ?? "?"} size="lg" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 11 }}>{user?.fullName}</div>
              <div style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>{user?.phone}</div>
              <span className="badge warn" style={{ marginTop: 10, display: "inline-flex" }}>
                👑 {level}-daraja o'quvchi
              </span>
              <div style={{ display: "flex", gap: 18, marginTop: 18, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{xp?.elo ?? 1200}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>ELO</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--warn)" }}>{earnedCount}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Yutuq</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--success)" }}>{currentXp}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>XP</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{xp?.streak ?? 0}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Streak</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="card-pad">
            <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 13 }}>🏆 Barcha yutuqlar</div>
            {(xp?.achievements ?? []).map((a) => {
              const apct = Math.round((a.progress.current / a.progress.threshold) * 100);
              return (
                <div key={a.code} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: "var(--surface-2)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 20,
                      flex: "none",
                      filter: a.earned ? "none" : "grayscale(.7)",
                      opacity: a.earned ? 1 : 0.5,
                    }}
                  >
                    🏅
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                    {!a.earned && (
                      <>
                        <div className="pbar" style={{ marginTop: 5 }}>
                          <span style={{ width: `${apct}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>
                          {a.progress.current}/{a.progress.threshold}
                        </div>
                      </>
                    )}
                  </div>
                  {a.earned ? <span style={{ fontSize: 18 }}>✅</span> : <span className="badge">{apct}%</span>}
                </div>
              );
            })}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="card-pad">
            <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 13 }}>⚡ XP va daraja</div>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>{LEVEL_ICONS[Math.min(level - 1, LEVEL_ICONS.length - 1)]}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{level}-daraja</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>
                Keyingisi: {levelCeil - currentXp} XP kerak
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "var(--text-faint)" }}>{currentXp} / {levelCeil} XP</span>
              <span style={{ fontWeight: 700, color: "var(--accent)" }}>{pct}%</span>
            </div>
            <div className="pbar" style={{ height: 9 }}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginTop: 16, textAlign: "center" }}>
              {LEVEL_ICONS.map((ic, i) => {
                const lv = i + 1;
                const reached = lv <= level;
                return (
                  <div key={lv} style={{ opacity: reached ? 1 : 0.2 }}>
                    <div style={{ fontSize: reached && lv === level ? 26 : 20 }}>{ic}</div>
                    <div style={{ fontSize: 9, color: reached && lv === level ? "var(--warn)" : "var(--text-faint)", fontWeight: reached && lv === level ? 700 : 400 }}>
                      {lv}{reached && lv === level ? " ✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
