import { useMemo, useState } from "react";
import { Card, Icon, PageHead, Segmented, StatCard, StatusBadge } from "@chess-school/ui";
import { BoardEditor } from "../../components/BoardEditor.js";
import { useCreatePuzzle, useDeletePuzzle, useMyPuzzles, usePuzzleAnalytics, type MyPuzzle } from "../../lib/queries.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const TABS = [
  { v: "list", label: "Mening masalalarim" },
  { v: "create", label: "Yangi masala" },
  { v: "analysis", label: "Tahlil" },
];

const DIFFICULTY_FILTERS = [
  { v: "all", label: "Barchasi" },
  { v: "oson", label: "Oson" },
  { v: "orta", label: "O'rta" },
  { v: "qiyin", label: "Qiyin" },
];

function AnalyticsPanel({ puzzleId }: { puzzleId: string }) {
  const { data, isLoading } = usePuzzleAnalytics(puzzleId);
  if (isLoading) return <div className="li">Yuklanmoqda...</div>;
  if (!data) return null;
  return (
    <div className="li" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="cell-main">Jami urinishlar: {data.total}, to'g'ri: {data.correct}</div>
      <div className="list" style={{ marginTop: 6 }}>
        {data.attempts.map((a, idx) => (
          <div className="li" key={idx}>
            <div className="cell-main">{a.fullName}</div>
            <StatusBadge status={a.correct ? "faol" : "qarzdor"} />
            <div className="cell-sub">{new Date(a.attemptedAt).toLocaleString("uz-UZ")}</div>
          </div>
        ))}
        {data.attempts.length === 0 && <div className="empty">Urinishlar yo'q</div>}
      </div>
    </div>
  );
}

function AnalyticsRow({ puzzle }: { puzzle: MyPuzzle }) {
  const [expanded, setExpanded] = useState(false);
  const { data } = usePuzzleAnalytics(expanded ? puzzle.id : null);
  const accuracy = data && data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;

  return (
    <>
      <tr>
        <td>
          <div className="cell-main">{puzzle.title ?? "Nomsiz masala"}</div>
          <div className="cell-sub">{puzzle.description}</div>
        </td>
        <td><StatusBadge status={puzzle.difficulty === "oson" ? "faol" : puzzle.difficulty === "orta" ? "yangi" : "qarzdor"} /></td>
        <td className="tnum">{data ? data.total : "—"}</td>
        <td className="tnum">{data ? data.correct : "—"}</td>
        <td className="tnum">{accuracy != null ? `${accuracy}%` : "—"}</td>
        <td>
          <button className="btn sm" onClick={() => setExpanded((v) => !v)}>
            <Icon name="chevronDown" size={14} style={{ transform: expanded ? "rotate(180deg)" : undefined }} /> {expanded ? "Yopish" : "Batafsil"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6}>
            <AnalyticsPanel puzzleId={puzzle.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function TPuzzlesPage() {
  const [tab, setTab] = useState("list");
  const { data: puzzles, isLoading } = useMyPuzzles();
  const createPuzzle = useCreatePuzzle();
  const deletePuzzle = useDeletePuzzle();
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const [fen, setFen] = useState(START_FEN);
  const [solution, setSolution] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"oson" | "orta" | "qiyin">("oson");
  const [xpReward, setXpReward] = useState(50);

  const stats = useMemo(() => {
    const total = puzzles?.length ?? 0;
    const easyMedium = puzzles?.filter((p) => p.difficulty === "oson" || p.difficulty === "orta").length ?? 0;
    const hard = puzzles?.filter((p) => p.difficulty === "qiyin").length ?? 0;
    return { total, easyMedium, hard };
  }, [puzzles]);

  const filteredPuzzles = useMemo(() => {
    if (difficultyFilter === "all") return puzzles;
    return puzzles?.filter((p) => p.difficulty === difficultyFilter);
  }, [puzzles, difficultyFilter]);

  async function handleCreate() {
    if (!title.trim() || solution.length === 0) return;
    await createPuzzle.mutateAsync({ fen, solution, difficulty, xpReward, title: title.trim(), description: description.trim() || undefined });
    setFen(START_FEN);
    setSolution([]);
    setTitle("");
    setDescription("");
    setDifficulty("oson");
    setXpReward(50);
    setTab("list");
  }

  return (
    <div>
      <PageHead title="Boshqotirmalar">
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </PageHead>

      {tab === "list" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: "var(--gap)" }}>
            <StatCard icon="puzzle" tone="a" value={String(stats.total)} label="Jami masalalar" />
            <StatCard icon="check" tone="s" value={String(stats.easyMedium)} label="Oson + o'rta" />
            <StatCard icon="alert" tone="d" value={String(stats.hard)} label="Qiyin" />
            <StatCard icon="award" tone="i" value="—" label="Jami yechimlar" />
          </div>

          <Card className="fade-up" style={{ marginBottom: "var(--gap)" }}>
            <div className="card-pad" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <Segmented value={difficultyFilter} onChange={setDifficultyFilter} options={DIFFICULTY_FILTERS} />
            </div>
          </Card>

          <Card className="fade-up">
            <div className="list">
              {isLoading && <div className="li">Yuklanmoqda...</div>}
              {filteredPuzzles?.map((p) => (
                <div key={p.id}>
                  <div className="li">
                    <div className="head-ic"><Icon name="puzzle" size={18} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="cell-main">{p.title ?? "Nomsiz masala"}</div>
                      <div className="cell-sub">{p.description}</div>
                    </div>
                    <StatusBadge status={p.difficulty === "oson" ? "faol" : p.difficulty === "orta" ? "yangi" : "qarzdor"} />
                    <span className="badge warn">+{p.xpReward} XP</span>
                    <button className="btn sm" onClick={() => setAnalyticsId(analyticsId === p.id ? null : p.id)}>
                      <Icon name="reports" size={14} /> Statistika
                    </button>
                    <button className="btn sm" onClick={() => deletePuzzle.mutate(p.id)} disabled={deletePuzzle.isPending}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                  {analyticsId === p.id && <AnalyticsPanel puzzleId={p.id} />}
                </div>
              ))}
              {!isLoading && (filteredPuzzles?.length ?? 0) === 0 && (
                <div className="empty"><Icon name="puzzle" size={28} /><div>Hali masala yaratilmagan</div></div>
              )}
            </div>
          </Card>
        </>
      )}

      {tab === "create" && (
        <Card className="card-pad fade-up">
          <BoardEditor fen={fen} onFenChange={setFen} solution={solution} onSolutionChange={setSolution} />

          <div style={{ display: "grid", gap: 10, marginTop: 16, maxWidth: 420 }}>
            <input className="inp" placeholder="Masala nomi" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="inp" placeholder="Tavsif (ixtiyoriy)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Segmented
                value={difficulty}
                onChange={(v) => setDifficulty(v as "oson" | "orta" | "qiyin")}
                options={[
                  { v: "oson", label: "Oson" },
                  { v: "orta", label: "O'rta" },
                  { v: "qiyin", label: "Qiyin" },
                ]}
              />
              <input
                className="inp"
                type="number"
                style={{ width: 100 }}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
              />
              <span className="cell-sub">XP</span>
            </div>
            <button className="btn primary" onClick={handleCreate} disabled={createPuzzle.isPending || !title.trim() || solution.length === 0}>
              <Icon name="plus" size={15} /> Saqlash
            </button>
          </div>
        </Card>
      )}

      {tab === "analysis" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: "var(--gap)" }}>
            <StatCard icon="puzzle" tone="a" value={String(stats.total)} label="Jami masalalar" />
            <StatCard icon="check" tone="s" value={String(stats.easyMedium)} label="Oson + o'rta" />
            <StatCard icon="alert" tone="d" value={String(stats.hard)} label="Qiyin" />
            <StatCard icon="reports" tone="i" value={String(puzzles?.length ?? 0)} label="Tahlil qilingan" />
          </div>

          <Card className="fade-up">
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Masala</th>
                    <th>Qiyinlik</th>
                    <th>Urinishlar</th>
                    <th>To'g'ri</th>
                    <th>Aniqlik</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {puzzles?.map((p) => <AnalyticsRow key={p.id} puzzle={p} />)}
                  {!isLoading && (puzzles?.length ?? 0) === 0 && (
                    <tr><td colSpan={6}><div className="empty"><Icon name="puzzle" size={28} /><div>Hali masala yaratilmagan</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
