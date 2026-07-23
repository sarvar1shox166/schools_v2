import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Chess } from "@chess-school/chess-engine";
import { ChessBoard } from "../../components/ChessBoard.js";
import { PromotionModal } from "../../components/PromotionModal.js";
import { MaterialColumn } from "../../components/MaterialColumn.js";
import { api } from "../../lib/api.js";
import { useRecordGameResult } from "../../lib/queries.js";
import { getCaptured, isPromotionMove } from "../../lib/chessMaterial.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface PvpGameState {
  tc: string;
  tcType: string;
  tcColor: string;
  difficulty: number;
  playerColor: "white" | "random" | "black";
  computerElo: number;
  playerName?: string;
  playerElo?: number;
  unbeatable?: boolean;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function tcToSeconds(tc: string): number {
  const [min, inc = "0"] = tc.split("+");
  return parseInt(min) * 60 + parseInt(inc);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Player card ──────────────────────────────────────────────────────────── */
function PlayerCard({
  name, elo, seconds, avatar, isComputer, isActive, isLow,
}: {
  name: string; elo: number; seconds: number;
  avatar: string; isComputer?: boolean; isActive: boolean; isLow?: boolean;
}) {
  return (
    <div style={{
      background: isActive ? "linear-gradient(135deg,rgba(59,130,246,0.14) 0%,#141417 60%)" : "#141417",
      border: `1px solid ${isActive ? "rgba(59,130,246,0.35)" : "#232328"}`,
      borderRadius: 14, padding: 14, transition: "all .2s",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, overflow: "hidden",
        background: isComputer
          ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
          : "linear-gradient(135deg,#22c55e,#16a34a)",
        display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0,
      }}>
        {avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#f5f5f6" }}>{name}</div>
        <div style={{ fontSize: 12, color: "#8b8d98", marginTop: 1 }}>{elo} ELO</div>
      </div>
      <div style={{
        padding: "8px 14px", borderRadius: 10,
        background: isLow ? "#ef4444" : isActive ? "#3b82f6" : "#18181c",
        border: isLow || isActive ? "none" : "1px solid #232328",
        fontWeight: 800, fontSize: 20, letterSpacing: 1,
        color: "#fff", fontVariantNumeric: "tabular-nums",
        transition: "background .3s",
      }}>
        {formatTime(seconds)}
      </div>
    </div>
  );
}

/* ── Board with coordinate labels ─────────────────────────────────────────── */
function BoardWithCoords({
  fen, onMove, flipped, disabled, getMoves,
}: {
  fen: string; onMove: (f: string, t: string) => void;
  flipped: boolean; disabled: boolean;
  getMoves?: (square: string) => string[];
}) {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const displayFiles = flipped ? [...FILES].reverse() : FILES;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <ChessBoard fen={fen} onMove={onMove} flipped={flipped} disabled={disabled} getMoves={getMoves} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 22, paddingBottom: 28 }}>
          {displayRanks.map(r => (
            <div key={r} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)",
            }}>{r}</div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", paddingRight: 22, marginTop: 5 }}>
        {displayFiles.map(f => (
          <div key={f} style={{
            flex: 1, textAlign: "center",
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)",
          }}>{f}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Game Over Modal ─────────────────────────────────────────────────────── */
function GameOverModal({
  result, playerColor, onRematch, onExit,
}: {
  result: string; playerColor: "white" | "black";
  onRematch: () => void; onExit: () => void;
}) {
  const isWin =
    (result === "white_wins" && playerColor === "white") ||
    (result === "black_wins" && playerColor === "black") ||
    (result === "white_wins_resign" && playerColor === "white") ||
    (result === "black_wins_resign" && playerColor === "black");
  const isDraw = result.startsWith("draw") || result === "stalemate";

  const title = isWin ? "🎉 Siz yutdingiz!" : isDraw ? "🤝 Durang!" : "😔 Yutqazdingiz";
  const LABELS: Record<string, string> = {
    white_wins: "Mat! Oq yutdi",
    black_wins: "Mat! Qora yutdi",
    stalemate: "Pat — durang",
    draw_repetition: "Uch marta takrorlanish — durang",
    draw_material: "Yetarli material yo'q — durang",
    draw: "Durang",
    white_wins_resign: "Qora taslim bo'ldi",
    black_wins_resign: "Oq taslim bo'ldi",
    time_white: "Oq vaqti tugadi — Qora yutdi",
    time_black: "Qora vaqti tugadi — Oq yutdi",
  };
  const sub = LABELS[result] ?? result;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
      display: "grid", placeItems: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#141417", border: "1px solid #232328",
        borderRadius: 20, padding: "32px 40px", textAlign: "center", minWidth: 320,
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{isWin ? "🏆" : isDraw ? "🤝" : "💔"}</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: "#f5f5f6" }}>{title}</div>
        <div style={{ fontSize: 14, color: "#8b8d98", marginBottom: 28 }}>{sub}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onRematch} style={{
            padding: "12px 28px", borderRadius: 12, border: "none",
            background: "#3b82f6", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            🔄 Qayta o'ynash
          </button>
          <button onClick={onExit} style={{
            padding: "12px 28px", borderRadius: 12,
            border: "1px solid #232328",
            background: "#18181c", color: "#c7d0e8",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            ← Chiqish
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Board size from container ────────────────────────────────────────────── */
function useBoardSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState(500);
  useEffect(() => {
    function calc() {
      const el = ref.current;
      const availH = window.innerHeight - 220; // topbar + padding + game topbar
      const availW = el ? el.getBoundingClientRect().width : window.innerWidth - 600;
      setSize(Math.floor(Math.min(availW, availH, 680)));
    }
    calc();
    const obs = ref.current ? new ResizeObserver(calc) : null;
    if (obs && ref.current) obs.observe(ref.current);
    window.addEventListener("resize", calc);
    return () => { obs?.disconnect(); window.removeEventListener("resize", calc); };
  }, [ref]);
  return size;
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PvpGamePage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: PvpGameState | null };

  const tc          = state?.tc          ?? "5+0";
  const tcType      = state?.tcType      ?? "BLITS";
  const tcColor     = state?.tcColor     ?? "#f59e0b";
  const difficulty  = state?.difficulty  ?? 3;
  const unbeatable  = state?.unbeatable  ?? false;
  const computerElo = state?.computerElo ?? 960;
  const playerName  = state?.playerName  ?? "Siz";
  const playerElo   = state?.playerElo   ?? 1285;

  // Resolve random color once on mount
  const resolvedColorRef = useRef<"white" | "black">(
    state?.playerColor === "random"
      ? (Math.random() < 0.5 ? "white" : "black")
      : (state?.playerColor === "black" ? "black" : "white")
  );
  const resolvedColor = resolvedColorRef.current;
  const isFlipped = resolvedColor === "black";

  const recordResult = useRecordGameResult();

  const boardColRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardSize(boardColRef);

  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(START_FEN);
  const [turn, setTurn] = useState<"white" | "black">("white");
  const [moves, setMoves] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const resultRecordedRef = useRef(false);

  const totalSeconds = tcToSeconds(tc);
  const [playerSeconds, setPlayerSeconds] = useState(totalSeconds);
  const [computerSeconds, setComputerSeconds] = useState(totalSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPlayerTurn = turn === resolvedColor;

  /* ── Timer ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (isPlayerTurn) {
        setPlayerSeconds(s => {
          if (s <= 1) {
            setGameOver(resolvedColor === "white" ? "time_white" : "time_black");
            return 0;
          }
          return s - 1;
        });
      } else {
        setComputerSeconds(s => Math.max(0, s - 1));
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlayerTurn, gameOver, resolvedColor]);

  /* ── Check game status ───────────────────────────────────────────────── */
  function checkStatus(chess: Chess): string | null {
    if (!chess.isGameOver()) return null;
    if (chess.isCheckmate()) return chess.turn() === "w" ? "black_wins" : "white_wins";
    if (chess.isStalemate()) return "stalemate";
    if (chess.isThreefoldRepetition()) return "draw_repetition";
    if (chess.isInsufficientMaterial()) return "draw_material";
    return "draw";
  }

  /* ── Computer move ───────────────────────────────────────────────────── */
  const requestComputerMove = useCallback(async (currentFen: string) => {
    setThinking(true);
    try {
      const res = await api.post<{ move: string | null }>("/pvp/computer-move", {
        fen: currentFen,
        difficulty,
        unbeatable,
      });
      const uciMove = res.data.move;
      if (!uciMove) return;

      const chess = chessRef.current;
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      try {
        chess.move({ from, to, promotion });
      } catch {
        return;
      }

      const newFen = chess.fen();
      const newTurn = chess.turn() === "w" ? "white" : "black";
      setFen(newFen);
      setTurn(newTurn);
      setMoves(m => [...m, uciMove]);

      const status = checkStatus(chess);
      if (status) setGameOver(status);
    } catch {
      setGameOver(resolvedColor === "white" ? "black_wins_resign" : "white_wins_resign");
    } finally {
      setThinking(false);
    }
  }, [difficulty, unbeatable]);

  /* ── Trigger computer move when it's their turn ──────────────────────── */
  useEffect(() => {
    if (!isPlayerTurn && !gameOver && !thinking) {
      requestComputerMove(fen);
    }
  }, [isPlayerTurn, gameOver, thinking, fen, requestComputerMove]);

  /* ── Player move ─────────────────────────────────────────────────────── */
  function commitMove(from: string, to: string, promotion: "q" | "r" | "b" | "n" = "q") {
    const chess = chessRef.current;
    let result;
    try {
      result = chess.move({ from, to, promotion });
    } catch {
      result = null;
    }
    if (!result) return;

    const newFen = chess.fen();
    const newTurn = chess.turn() === "w" ? "white" : "black";
    setFen(newFen);
    setTurn(newTurn);
    setMoves(m => [...m, `${from}${to}${result.promotion ? result.promotion : ""}`]);

    const status = checkStatus(chess);
    if (status) setGameOver(status);
  }

  function handleMove(from: string, to: string) {
    if (!isPlayerTurn || gameOver || thinking) return;
    if (isPromotionMove(fen, from, to)) {
      setPendingPromotion({ from, to });
      return;
    }
    commitMove(from, to);
  }

  /* ── Record result when game ends ───────────────────────────────────── */
  useEffect(() => {
    if (!gameOver || resultRecordedRef.current) return;
    resultRecordedRef.current = true;

    const compName = unbeatable
      ? "Yengilmas kompyuter"
      : `Kompyuter · ${difficulty}-daraja`;

    let result: "win" | "draw" | "loss";
    if (gameOver.startsWith("draw") || gameOver === "stalemate") {
      result = "draw";
    } else if (
      (gameOver === "white_wins" && resolvedColor === "white") ||
      (gameOver === "black_wins" && resolvedColor === "black") ||
      (gameOver === "white_wins_resign" && resolvedColor === "white") ||
      (gameOver === "black_wins_resign" && resolvedColor === "black") ||
      (gameOver === "time_black" && resolvedColor === "white") ||
      (gameOver === "time_white" && resolvedColor === "black")
    ) {
      result = "win";
    } else {
      result = "loss";
    }

    recordResult.mutate({ opponentName: compName, result, opponentElo: computerElo });
  }, [gameOver]);

  /* ── Rematch ─────────────────────────────────────────────────────────── */
  function handleRematch() {
    chessRef.current = new Chess();
    setFen(START_FEN);
    setTurn("white");
    setMoves([]);
    setGameOver(null);
    setThinking(false);
    setPlayerSeconds(totalSeconds);
    setComputerSeconds(totalSeconds);
    resultRecordedRef.current = false;
  }

  const compName = unbeatable ? "👑 Yengilmas" : `Kompyuter (${difficulty}-daraja)`;
  const captured = getCaptured(fen);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#111114", border: "1px solid #1e1e22", borderRadius: 14, padding: "10px 14px" }}>
        <button onClick={() => navigate("/student/pvp")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px 8px 10px",
            borderRadius: 10, border: "1px solid #232328",
            background: "#18181c", color: "#c7d0e8",
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          Orqaga
        </button>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
          borderRadius: 10, border: `1px solid ${tcColor}44`, background: `${tcColor}18`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tcColor, display: "inline-block" }} />
          <span style={{ fontWeight: 800, fontSize: 12, color: tcColor, letterSpacing: "0.02em" }}>{tc} {tcType}</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 11px",
          borderRadius: 10, border: "1px solid rgba(139,92,246,0.28)", background: "rgba(139,92,246,0.12)",
          color: "#c4b5fd", fontSize: 11.5, fontWeight: 700,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><path d="M8 15c1.5 1 3 1.5 4 1.5s2.5-.5 4-1.5"/></svg>
          Bot bilan
        </div>
        {unbeatable && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            borderRadius: 10, border: "1px solid #fbbf2444", background: "#fbbf2418",
          }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#fbbf24" }}>👑 YENGILMAS REJIM</span>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, color: "#8b8d98", fontSize: 12, fontWeight: 600, padding: "8px 12px", background: "#18181c", border: "1px solid #232328", borderRadius: 10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          Yurish: <span style={{ color: "#f5f5f6", fontWeight: 800 }}>{moves.length}</span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        display: "grid", gridTemplateColumns: "70px 1fr 340px", gap: 16,
        height: "calc(100vh - 220px)",
        overflow: "hidden",
      }}>
        {/* Left column — material advantage + captured pieces */}
        <MaterialColumn diff={captured.diff} byWhite={captured.byWhite} byBlack={captured.byBlack} />

        {/* Board column — fills remaining space */}
        <div ref={boardColRef} style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: boardSize, height: boardSize, flexShrink: 0 }}>
            <BoardWithCoords
              fen={fen}
              onMove={handleMove}
              flipped={isFlipped}
              disabled={!isPlayerTurn || !!gameOver || thinking || !!pendingPromotion}
              getMoves={(square) =>
                chessRef.current
                  .moves({ square: square as import("chess.js").Square, verbose: true })
                  .map((m: { to: string }) => m.to)
              }
            />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {/* Computer card */}
          <PlayerCard
            name={compName}
            elo={unbeatable ? 3500 : computerElo}
            seconds={computerSeconds}
            avatar={unbeatable ? "👑" : "🤖"}
            isComputer
            isActive={!isPlayerTurn}
            isLow={computerSeconds <= 30}
          />

          {/* Turn / thinking indicator */}
          <div style={{
            padding: "12px 16px", background: "#141417",
            border: "1px solid #232328", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 14,
          }}>
            {thinking ? (
              <>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                  border: "2px solid #3b82f6", borderTopColor: "transparent",
                  animation: "spin 0.7s linear infinite",
                }} />
                <span style={{ color: "#60a5fa" }}>Kompyuter o'ylayapti...</span>
              </>
            ) : (
              <>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  background: turn === "white" ? "#fff" : "#1a1a2e",
                  border: turn === "black" ? "2px solid rgba(255,255,255,.4)" : "none",
                }} />
                <span style={{ color: "#f5f5f6" }}>{turn === "white" ? "Oq o'ynaydi" : "Qora o'ynaydi"}</span>
              </>
            )}
          </div>

          {/* Move history */}
          <div style={{
            padding: "12px 16px", background: "#141417",
            border: "1px solid #232328", borderRadius: 12,
            minHeight: 90, maxHeight: 160, overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ color: "#f5f5f6", fontSize: 12.5, fontWeight: 800 }}>Yurishlar</div>
              <div style={{ color: "#65666f", fontSize: 11, fontWeight: 700 }}>{moves.length} yurish</div>
            </div>
            {moves.length === 0 ? (
              <div style={{ color: "#54555e", fontSize: 12.5, textAlign: "center", paddingTop: 8 }}>
                Hali yurish yo'q
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {moves.map((m, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 7px",
                    borderRadius: 6, background: "#18181c", color: "#c7d0e8",
                  }}>
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""}{m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              { icon: "🏳", label: "Taslim", color: "#f87171", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", action: () => setGameOver(resolvedColor === "white" ? "black_wins_resign" : "white_wins_resign") },
              { icon: "½", label: "Durang", color: "#facc15", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.25)", action: () => setGameOver("draw") },
              { icon: "🔄", label: "Yangi", color: "#60a5fa", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)", action: handleRematch },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "12px 6px", borderRadius: 12,
                  border: "1px solid #232328",
                  background: "#141417",
                  cursor: "pointer", textAlign: "center",
                }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: btn.bg, border: `1px solid ${btn.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{btn.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: btn.color }}>{btn.label}</div>
              </button>
            ))}
          </div>

          {/* Player card */}
          <PlayerCard
            name={playerName}
            elo={playerElo}
            seconds={playerSeconds}
            avatar="🤓"
            isActive={isPlayerTurn}
            isLow={playerSeconds <= 30}
          />
        </div>
      </div>

      {/* Promotion choice */}
      {pendingPromotion && (
        <PromotionModal
          color={resolvedColor === "white" ? "w" : "b"}
          onPick={(piece) => {
            commitMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
          }}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      {/* Game over modal */}
      {gameOver && (
        <GameOverModal
          result={gameOver}
          playerColor={resolvedColor}
          onRematch={handleRematch}
          onExit={() => navigate("/student/pvp")}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
