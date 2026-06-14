import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useAuthStore } from "../../lib/auth-store.js";
import { useLeaderboard, useMyXp } from "../../lib/queries.js";

export default function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const { data: xp } = useMyXp();
  const user = useAuthStore((s) => s.user);

  const myIndex = (data ?? []).findIndex((s) => s.fullName === user?.fullName);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  return (
    <div>
      <PageHead title="Reyting" />
      <div className="l-2-1">
        <Card className="fade-up">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>O'quvchi</th><th>Daraja</th><th>XP</th><th>Streak</th></tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={5}>Yuklanmoqda...</td></tr>}
                {data?.map((s, i) => {
                  const isMe = s.fullName === user?.fullName;
                  return (
                    <tr key={s.fullName + i} className={isMe ? "lbr me" : "lbr"}>
                      <td className="cell-sub">{i + 1}</td>
                      <td>
                        <div className="with-av">
                          <Avatar name={s.fullName} size="sm" />
                          <div className="cell-main">{s.fullName}{isMe ? " (Siz)" : ""}</div>
                        </div>
                      </td>
                      <td>{s.level}</td>
                      <td className="tnum">{s.xp}</td>
                      <td>🔥 {s.streak}</td>
                    </tr>
                  );
                })}
                {!isLoading && (data?.length ?? 0) === 0 && (
                  <tr><td colSpan={5}><div className="empty"><Icon name="search" size={28} /><div>Hali ma'lumot yo'q</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="card-pad fade-up">
          <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 14 }}>Mening o'rnim</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Avatar name={user?.fullName ?? "?"} size="lg" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{user?.fullName ?? "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                {myRank ? `#${myRank} o'rin` : "Reytingda yo'q"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
            <div style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{xp?.elo ?? 1200}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>ELO</div>
            </div>
            <div style={{ background: "color-mix(in oklab, var(--success) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--success)" }}>{xp?.xp ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>XP</div>
            </div>
            <div style={{ background: "color-mix(in oklab, var(--warn) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--warn)" }}>{xp?.streak ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Streak</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
