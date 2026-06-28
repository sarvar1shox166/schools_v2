import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Chess } from "@chess-school/chess-engine";

const PIECE_FILE: Record<string, string> = {
  K: "oq-shox.svg",   Q: "oq-farzin.svg", R: "oq-rux.svg",
  N: "oq-ot.svg",     B: "oq-fil.svg",    P: "oq-piyoda.svg",
  k: "shoh.svg",      q: "farzin.svg",    r: "rux.svg",
  n: "ot.svg",        b: "fil.svg",       p: "pechka.svg",
};

// Standard pieces: region (585, 270, 269, 269) in 1440×810 SVG
const IMG_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "535.3%",
  left: "-217.5%",
  top: "-100.4%",
  pointerEvents: "none",
  userSelect: "none",
};

// shoh.svg (black king): region (657, 341.5, 125.5, 125.5) in 1440×810 SVG
const SHOH_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "1147.4%",
  left: "-523.5%",
  top: "-272.1%",
  pointerEvents: "none",
  userSelect: "none",
};

function PieceImg({ piece, dimmed }: { piece: string; dimmed?: boolean }) {
  const file = PIECE_FILE[piece];
  if (!file) return null;
  return (
    <div style={{
      position: "absolute", inset: "5%", overflow: "hidden",
      opacity: dimmed ? 0.25 : 1,
      transition: "opacity 0.08s",
    }}>
      <img
        src={`/pieces/${file}`}
        alt=""
        style={piece === "k" ? SHOH_STYLE : IMG_STYLE}
        draggable={false}
      />
    </div>
  );
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function fenToBoard(fen: string): (string | null)[][] {
  const placement = fen.split(" ")[0];
  return placement.split("/").map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
}

// Find king square + attacker squares when in check
function findCheckInfo(fen: string): { king: string; attackers: Set<string> } | null {
  try {
    const g = new Chess(fen);
    if (!g.isCheck()) return null;
    const board = g.board();
    const turn = g.turn();
    const opp = turn === "w" ? "b" : "w";

    let kr = -1, kc = -1;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.type === "k" && board[r][c]?.color === turn) { kr = r; kc = c; }
    if (kr < 0) return null;

    const toSq = (r: number, c: number) => `${FILES[c]}${8 - r}`;
    const king = toSq(kr, kc);
    const attackers = new Set<string>();

    // Knights
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = kr + dr, c = kc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c]?.type === "n" && board[r][c]?.color === opp)
        attackers.add(toSq(r, c));
    }

    // Pawns
    const pdr = turn === "w" ? -1 : 1;
    for (const dc of [-1, 1]) {
      const r = kr + pdr, c = kc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c]?.type === "p" && board[r][c]?.color === opp)
        attackers.add(toSq(r, c));
    }

    // Sliding pieces
    const rays: [number, number][][] = [
      [[0,1],[0,-1],[1,0],[-1,0]],   // rook / queen
      [[1,1],[1,-1],[-1,1],[-1,-1]], // bishop / queen
    ];
    const sliderTypes = [["r","q"], ["b","q"]];
    for (let i = 0; i < 2; i++) {
      for (const [dr, dc] of rays[i]) {
        let r = kr + dr, c = kc + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const p = board[r][c];
          if (p) {
            if (p.color === opp && sliderTypes[i].includes(p.type)) attackers.add(toSq(r, c));
            break;
          }
          r += dr; c += dc;
        }
      }
    }

    return { king, attackers };
  } catch { return null; }
}

export function ChessBoard({
  fen, onMove, disabled, flipped, hintSquare, getMoves,
}: {
  fen: string;
  onMove: (from: string, to: string) => void;
  disabled?: boolean;
  flipped?: boolean;
  hintSquare?: string;
  getMoves?: (square: string) => string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{
    piece: string; from: string; x: number; y: number;
    over: string | null; cellSize: number;
  } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const board = fenToBoard(fen);
  const rows = flipped ? [...board].reverse() : board;
  const checkInfo = useMemo(() => findCheckInfo(fen), [fen]);

  // Inject CSS animation keyframe once
  useEffect(() => {
    const id = "cb-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes cb-arrive {
        0%   { transform: scale(1.18); }
        60%  { transform: scale(0.97); }
        100% { transform: scale(1); }
      }
      .cb-arrive { animation: cb-arrive 0.18s ease-out; }
    `;
    document.head.appendChild(el);
  }, []);

  function squareName(rowIdx: number, colIdx: number) {
    const r = flipped ? 7 - rowIdx : rowIdx;
    const c = flipped ? 7 - colIdx : colIdx;
    return `${FILES[c]}${8 - r}`;
  }

  function getSquareAt(clientX: number, clientY: number): string | null {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor((clientX - rect.left) / (rect.width / 8));
    const row = Math.floor((clientY - rect.top) / (rect.height / 8));
    if (col < 0 || col >= 8 || row < 0 || row >= 8) return null;
    return squareName(row, col);
  }

  function openLegal(square: string) {
    setSelected(square);
    setLegalSquares(getMoves ? new Set(getMoves(square)) : new Set());
  }

  function commit(from: string, to: string) {
    onMove(from, to);
    setLastMove({ from, to });
    setSelected(null);
    setLegalSquares(new Set());
  }

  function clearSel() {
    setSelected(null);
    setLegalSquares(new Set());
  }

  // Drag: start
  function handleMouseDown(e: React.MouseEvent, piece: string, square: string) {
    if (disabled) return;
    e.preventDefault();
    const cellSize = boardRef.current
      ? boardRef.current.getBoundingClientRect().width / 8 : 64;
    openLegal(square);
    setDrag({ piece, from: square, x: e.clientX, y: e.clientY, over: null, cellSize });
  }

  // Drag: move & drop listeners
  useEffect(() => {
    if (!drag) return;
    const onMouseMove = (e: MouseEvent) => {
      const over = getSquareAt(e.clientX, e.clientY);
      setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY, over } : null);
    };
    const onMouseUp = (e: MouseEvent) => {
      const target = getSquareAt(e.clientX, e.clientY);
      if (target && legalSquares.has(target)) {
        commit(drag.from, target);
      } else if (target !== drag.from) {
        clearSel();
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [drag, legalSquares]);

  // Click-to-move fallback
  function handleClick(square: string, piece: string | null) {
    if (disabled || drag) return;
    if (selected) {
      if (selected === square) { clearSel(); return; }
      if (legalSquares.has(square)) { commit(selected, square); return; }
      if (piece) { openLegal(square); return; }
      clearSel(); return;
    }
    if (piece) openLegal(square);
  }

  return (
    <>
      <div ref={boardRef} style={{ containerType: "inline-size", width: "100%", aspectRatio: "1" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            width: "100%",
            height: "100%",
            borderRadius: 6,
            overflow: "hidden",
            border: "2.5px solid rgba(0,0,0,.4)",
            boxShadow: "0 8px 36px rgba(0,0,0,.25)",
            cursor: drag ? "grabbing" : "default",
          }}
        >
          {rows.map((row, rowIdx) =>
            (flipped ? [...row].reverse() : row).map((piece, colIdx) => {
              const square = squareName(rowIdx, colIdx);
              const isLight  = (rowIdx + colIdx) % 2 === 0;
              const isLegal  = legalSquares.has(square);
              const isCapture = isLegal && piece !== null;
              const isDragSrc  = drag?.from === square;
              const isDragOver = drag?.over === square;
              const isLastFrom = lastMove?.from === square;
              const isLastTo   = lastMove?.to === square;
              const isKingCheck = checkInfo?.king === square;
              const isAttacker  = checkInfo?.attackers.has(square) ?? false;

              let bg = isLight ? "#edeed1" : "#779952";
              if      (isKingCheck || isAttacker)       bg = isLight ? "#ff9a9a" : "#e05555";
              else if (selected === square)              bg = isLight ? "#f6f669" : "#d4d422";
              else if (isLastFrom || isLastTo)           bg = isLight ? "#cdd26f" : "#a9b44a";
              else if (isDragOver && isLegal)            bg = isLight ? "#bfd26a" : "#9bb83a";
              else if (hintSquare === square)            bg = "#9ae29a";

              return (
                <div
                  key={square}
                  onClick={() => handleClick(square, piece)}
                  style={{
                    aspectRatio: "1",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    transition: "background 0.1s ease",
                    cursor: disabled ? "default"
                      : drag ? (isDragOver && isLegal ? "copy" : "grabbing")
                      : piece ? "grab"
                      : (selected || isLegal) ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {piece && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, piece, square)}
                      className={isLastTo && !drag ? "cb-arrive" : undefined}
                      style={{ position: "absolute", inset: 0 }}
                    >
                      <PieceImg piece={piece} dimmed={isDragSrc} />
                    </div>
                  )}

                  {/* Legal move dot */}
                  {isLegal && !isCapture && (
                    <div style={{
                      position: "absolute",
                      width: "32%", height: "32%",
                      borderRadius: "50%",
                      background: "rgba(0,0,0,.18)",
                      pointerEvents: "none",
                      zIndex: 2,
                    }} />
                  )}
                  {/* Capture ring */}
                  {isCapture && (
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: "50%",
                      border: "8% solid rgba(0,0,0,.22)",
                      pointerEvents: "none",
                      zIndex: 3,
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating drag piece — rendered into document.body to avoid parent transform/contain offsets */}
      {drag && createPortal(
        <div style={{
          position: "fixed",
          left: drag.x - drag.cellSize / 2,
          top:  drag.y - drag.cellSize / 2,
          width: drag.cellSize,
          height: drag.cellSize,
          pointerEvents: "none",
          zIndex: 9999,
          transform: "scale(1.18)",
          filter: "drop-shadow(0 8px 20px rgba(0,0,0,.45))",
        }}>
          <PieceImg piece={drag.piece} />
        </div>,
        document.body
      )}
    </>
  );
}
