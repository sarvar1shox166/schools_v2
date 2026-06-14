import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Icon, PageHead, Segmented, StatusBadge } from "@chess-school/ui";
import { ChessBoard } from "../../components/ChessBoard.js";
import { useAttemptPuzzle, usePuzzleHint, usePuzzleStats, usePuzzles, type Puzzle } from "../../lib/queries.js";

const DIFF_LABELS: Record<string, string> = { oson: "Oson", orta: "O'rta", qiyin: "Qiyin" };

const DIFF_TABS = [
  { v: "hammasi", label: "Hammasi" },
  { v: "oson", label: "Oson" },
  { v: "orta", label: "O'rta" },
  { v: "qiyin", label: "Qiyin" },
];

function PuzzleSolver({ puzzle, highlight }: { puzzle: Puzzle; highlight?: boolean }) {
  const attempt = useAttemptPuzzle();
  const hint = usePuzzleHint();
  const [fen, setFen] = useState(puzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [hintSquare, setHintSquare] = useState<string | undefined>(undefined);

  async function handleMove(from: string, to: string) {
    if (solved) return;
    setHintSquare(undefined);
    const res = await attempt.mutateAsync({ puzzleId: puzzle.id, moveIndex, move: `${from}${to}` });

    if (!res.correct) {
      setFeedback("Noto'g'ri yurish. Yana urinib ko'ring.");
      return;
    }

    setFen(res.fenAfter);
    if (res.finished) {
      setSolved(true);
      const newAch = res.newAchievements?.length
        ? ` Yangi yutuq: ${res.newAchievements.map((a) => a.name).join(", ")}!`
        : "";
      setFeedback(`To'g'ri! +${res.xpAwarded} XP.${newAch}`);
    } else {
      setMoveIndex(moveIndex + 2);
      setFeedback("To'g'ri yurish! Davom eting.");
    }
  }

  async function handleHint() {
    const res = await hint.mutateAsync({ puzzleId: puzzle.id, moveIndex });
    setHintSquare(res.from);
  }

  return (
    <Card className="card-pad fade-up" style={highlight ? { boxShadow: "0 0 0 2px var(--accent)" } : undefined}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <ChessBoard fen={fen} onMove={handleMove} disabled={solved} hintSquare={hintSquare} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="cell-main" style={{ marginBottom: 6 }}>
            {puzzle.title && <div style={{ marginBottom: 4 }}>{puzzle.title}</div>}
            <StatusBadge status={puzzle.difficulty === "oson" ? "faol" : puzzle.difficulty === "orta" ? "yangi" : "qarzdor"} />
            <span className="badge warn" style={{ marginLeft: 6 }}>+{puzzle.xpReward} XP</span>
            {puzzle.createdByTeacher && <span className="badge" style={{ marginLeft: 6 }}>🏫 O'qituvchidan</span>}
          </div>
          {feedback && <div className="cell-sub">{feedback}</div>}
          {!solved && (
            <button className="btn sm" style={{ marginTop: 8 }} onClick={handleHint} disabled={hint.isPending}>
              <Icon name="lightbulb" size={14} /> Maslahat
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function PuzzlesPage() {
  const { data: puzzles, isLoading } = usePuzzles();
  const { data: stats } = usePuzzleStats();
  const [filter, setFilter] = useState("hammasi");
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("id");

  let rows = filter === "hammasi" ? puzzles ?? [] : (puzzles ?? []).filter((p) => p.difficulty === filter);
  if (highlightId) {
    const target = rows.find((p) => p.id === highlightId);
    if (target) rows = [target, ...rows.filter((p) => p.id !== highlightId)];
  }

  return (
    <div>
      <PageHead title="Boshqotirmalar">
        <Segmented value={filter} onChange={setFilter} options={DIFF_TABS} />
      </PageHead>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--gap)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {isLoading && <Card className="card-pad">Yuklanmoqda...</Card>}
          {!isLoading && rows.length === 0 && (
            <Card className="card-pad"><div className="empty"><Icon name="search" size={28} /><div>Boshqotirmalar yo'q</div></div></Card>
          )}

          <div style={{ display: "grid", gap: "var(--gap)" }}>
            {rows.map((p) => <PuzzleSolver key={p.id} puzzle={p} highlight={p.id === highlightId} />)}
          </div>
        </div>

        <Card className="card-pad fade-up">
          <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 14 }}>Mening statistikam</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 16 }}>
            <div style={{ background: "color-mix(in oklab, var(--success) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--success)" }}>{stats?.correct ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>To'g'ri</div>
            </div>
            <div style={{ background: "color-mix(in oklab, var(--danger) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--danger)" }}>{stats?.incorrect ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Noto'g'ri</div>
            </div>
            <div style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{stats?.accuracyPct ?? 0}%</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Aniqlik</div>
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text-faint)", marginBottom: 4 }}>Qiyinlik bo'yicha</div>
          {(stats?.byDifficulty ?? []).map((d) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return (
              <div className="sp-row" key={d.difficulty}>
                <div className="sp-name">
                  <div className="nm">{DIFF_LABELS[d.difficulty] ?? d.difficulty}</div>
                  <div className="sub">{d.correct}/{d.total} to'g'ri</div>
                </div>
                <div className="sp-bar pbar">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="sp-pct">{pct}%</div>
              </div>
            );
          })}
          {(stats?.byDifficulty ?? []).length === 0 && (
            <div className="empty"><Icon name="puzzle" size={28} /><div>Hali urinishlar yo'q</div></div>
          )}
        </Card>
      </div>
    </div>
  );
}
