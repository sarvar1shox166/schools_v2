import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { showXp } from "@chess-school/ui";
import { pieceDestinations, buildFenPlacement, squaresFromFen, type SimplePiece } from "@chess-school/chess-engine";
import { ChessBoard } from "../../components/ChessBoard.js";
import { usePlayLearnLevel, useCompleteLearnLevel, useLearnTopic, type LearnCompleteResult, type LearnCategory } from "../../lib/queries.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

const CATEGORY_COLOR: Record<LearnCategory, string> = {
  piece: "#8b5cf6",
  principle: "#f59e0b",
  intermediate: "#3b82f6",
  advanced: "#ec4899",
};

export default function LearnLevelPage() {
  const navigate = useNavigate();
  const { topicId, levelNumber: levelNumberParam } = useParams<{ topicId: string; levelNumber: string }>();
  const levelNumber = Number(levelNumberParam);

  const { data: topic } = useLearnTopic(topicId);
  const { data: play, isLoading, refetch } = usePlayLearnLevel(topicId, levelNumber);
  const completeLevel = useCompleteLearnLevel();

  const [pieces, setPieces] = useState<Map<string, string> | null>(null);
  const [current, setCurrent] = useState<string>("");
  const [remainingTargets, setRemainingTargets] = useState<string[]>([]);
  const [totalTargets, setTotalTargets] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<LearnCompleteResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!play) return;
    setPieces(squaresFromFen(play.fen));
    setCurrent(play.from);
    setRemainingTargets(play.targets);
    setTotalTargets(play.targets.length);
    setMistakes(0);
    setInteracted(false);
    setFinished(false);
    setResult(null);
    setFeedback(null);
  }, [play]);

  const fen = useMemo(() => {
    if (!pieces) return "";
    return buildFenPlacement(Array.from(pieces, ([square, piece]) => ({ square, piece })));
  }, [pieces]);

  function getMoves(square: string): string[] {
    if (!play || !pieces || square !== current) return [];
    const occupied = new Set(pieces.keys());
    occupied.delete(current);
    const dests = pieceDestinations(play.pieceType as SimplePiece, current, occupied, "w");
    // Ba'zi qo'lda tayyorlangan (fixed) pozitsiyalar eski (bloklovchi donalarni
    // hisobga olmaydigan) generatordan meros qolgan — to'g'ri yechim doim
    // bosilishi mumkin bo'lishini kafolatlaymiz, hatto yo'l boshqa dona
    // orqali "bloklangan" ko'rinsa ham.
    if (play.mode === "fixed" && play.to && !dests.includes(play.to)) dests.push(play.to);
    return dests;
  }

  function handleMove(from: string, to: string) {
    if (!play || !pieces || finished) return;
    setInteracted(true);

    // Erkinlik: "generated" (dona-yurish) bosqichlarida nishonlarni QAYSI
    // tartibda urishi muhim emas — muhimi hammasini urib bo'lishi. Kamroq
    // xato (yurish) ko'proq yulduz beradi (server tomonidagi starsForMistakes).
    const isCorrect = play.mode === "generated" ? remainingTargets.includes(to) : to === play.to;
    if (!isCorrect) {
      setMistakes((m) => m + 1);
      setFeedback("❌ Noto'g'ri! Yana urinib ko'ring.");
      setTimeout(() => setFeedback(null), 1500);
      return;
    }

    const nextPieces = new Map(pieces);
    const movingPiece = nextPieces.get(from)!;
    nextPieces.delete(from);
    nextPieces.set(to, movingPiece);
    setPieces(nextPieces);
    setCurrent(to);
    setFeedback(null);

    if (play.mode === "generated") {
      const nextRemaining = remainingTargets.filter((sq) => sq !== to);
      setRemainingTargets(nextRemaining);
      if (nextRemaining.length === 0) finish();
      else setFeedback("✅ To'g'ri!");
    } else {
      finish();
    }
  }

  function finish() {
    if (!topicId) return;
    setFinished(true);
    completeLevel.mutate({ topicId, levelNumber, mistakes }, {
      onSuccess: (res) => {
        setResult(res);
        if (res.xpAwarded) showXp(res.xpAwarded, "Bosqich tugallandi!");
      },
    });
  }

  function retry() {
    refetch();
  }

  if (isLoading || !play || !pieces || !topic) {
    return <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)" }}>Yuklanmoqda...</div>;
  }

  const color = CATEGORY_COLOR[topic.category];
  const capturedCount = totalTargets - remainingTargets.length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div onClick={() => navigate("/student/learn")}
          style={{ display: "flex", alignItems: "center", gap: 7, background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            color: "#c7c8d0", fontSize: 13, fontWeight: 700, padding: "9px 14px", borderRadius: 11, cursor: "pointer" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Ortga
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#65666f" }}>
          {topic.title} · <span style={{ color: "#f5f5f6", fontWeight: 800 }}>{levelNumber}-bosqich</span>
        </div>
      </div>

      <div className="learn-level-grid" style={{ gap: 20, alignItems: "start" }}>
        {/* Board column */}
        <div>
          {totalTargets > 1 && (
            <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
              {Array.from({ length: totalTargets }, (_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 99,
                  background: i < capturedCount ? "linear-gradient(90deg,#22c55e,#4ade80)" : "#232328",
                  transition: "background .2s",
                }} />
              ))}
            </div>
          )}

          <div style={{
            display: "flex", justifyContent: "center", padding: 14, background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`, borderRadius: 18, boxShadow: "0 16px 46px rgba(0,0,0,.5)",
          }}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              <ChessBoard
                fen={fen}
                onMove={handleMove}
                getMoves={getMoves}
                disabled={finished}
                hintSquare={!interacted ? (play.hintSquare ?? undefined) : undefined}
              />
              {feedback && (
                <div style={{
                  marginTop: 12, fontSize: 13, fontWeight: 700, textAlign: "center",
                  color: feedback.startsWith("❌") ? "#f87171" : "#4ade80",
                }}>
                  {feedback}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", background: color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 32, lineHeight: 1, color: "#fff", flexShrink: 0 }}>{topic.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", color: "#fff", lineHeight: 1.2, flex: 1 }}>
                  {topic.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 11, padding: "6px 11px", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#fde047"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" /></svg>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1 }}>+{topic.xpReward}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>XP</span>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.92)", marginTop: 10, lineHeight: 1.4 }}>
                {play.instruction}
              </div>
            </div>
            <div style={{ padding: "18px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#8b8d98", fontWeight: 500 }}>
                Xato: <span style={{ color: "#f5f5f6", fontWeight: 800 }}>{mistakes}</span>
              </div>
            </div>
          </div>

          <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8b8d98", letterSpacing: "0.04em" }}>BOSQICHLAR</div>
              <div style={{ fontSize: 12, fontWeight: 800, color }}>{levelNumber} / {topic.levels.length}</div>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              {topic.levels.map((l) => {
                const isCur = l.levelNumber === levelNumber;
                const isDone = l.stars !== null;
                return (
                  <div key={l.levelNumber}
                    onClick={() => { if (!l.locked) navigate(`/student/learn/${topicId}/${l.levelNumber}`); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: "50%", fontSize: 12, fontWeight: 800,
                      cursor: l.locked ? "default" : "pointer", transition: "all .15s",
                      background: isCur ? color : isDone ? "rgba(74,222,128,.15)" : l.locked ? "#141417" : "#18181c",
                      color: isCur ? "#fff" : isDone ? "#4ade80" : l.locked ? "#65666f" : "#c7c8d0",
                      border: isCur ? "none" : isDone ? "1px solid rgba(74,222,128,.3)" : `1px solid ${l.locked ? "#2a2a30" : CARD_BORDER}`,
                      boxShadow: isCur ? `0 3px 10px ${color}66` : undefined,
                    }}>
                    {l.locked ? "🔒" : l.levelNumber}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div onClick={retry}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "#18181c", border: `1px solid ${CARD_BORDER}`, color: "#a3a4ad",
                fontSize: 13.5, fontWeight: 700, padding: 12, borderRadius: 11, cursor: "pointer" }}>
              ↻ Qaytadan
            </div>
            <div onClick={finished ? () => navigate(`/student/learn/${topicId}/${levelNumber + 1}`) : undefined}
              style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: finished ? `linear-gradient(135deg,${color},${color}cc)` : "#18181c",
                color: finished ? "#fff" : "#65666f",
                fontSize: 13.5, fontWeight: 800, padding: 12, borderRadius: 11,
                cursor: finished ? "pointer" : "default",
                boxShadow: finished ? `0 6px 18px ${color}44` : undefined }}>
              Keyingisi →
            </div>
          </div>
        </div>
      </div>

      {finished && result && (
        <div style={{
          marginTop: 20, textAlign: "center", padding: 20, borderRadius: 16,
          background: "linear-gradient(135deg,rgba(245,158,11,.18),rgba(251,191,36,.08))",
          border: "1.5px solid rgba(245,158,11,.35)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>
            {"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
          </div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 4 }}>Bosqich tugallandi!</div>
          {result.xpAwarded ? (
            <div style={{ color: "#facc15", fontWeight: 700 }}>+{result.xpAwarded} XP</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
