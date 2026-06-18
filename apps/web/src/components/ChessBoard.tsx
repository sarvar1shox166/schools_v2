import { useState } from "react";

const PIECE_GLYPHS: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function fenToBoard(fen: string): (string | null)[][] {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
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
  const board = fenToBoard(fen);
  const rows = flipped ? [...board].reverse() : board;

  function squareName(rowIdx: number, colIdx: number) {
    const r = flipped ? 7 - rowIdx : rowIdx;
    const c = flipped ? 7 - colIdx : colIdx;
    return `${FILES[c]}${8 - r}`;
  }

  function selectSquare(square: string) {
    setSelected(square);
    if (getMoves) {
      setLegalSquares(new Set(getMoves(square)));
    }
  }

  function clearSelection() {
    setSelected(null);
    setLegalSquares(new Set());
  }

  function handleClick(square: string, piece: string | null) {
    if (disabled) return;
    if (selected) {
      if (selected === square) {
        clearSelection();
        return;
      }
      if (legalSquares.has(square)) {
        onMove(selected, square);
        clearSelection();
        return;
      }
      // Clicked own piece — re-select it
      if (piece) {
        selectSquare(square);
        return;
      }
      clearSelection();
      return;
    }
    if (piece) selectSquare(square);
  }

  return (
    <div style={{ containerType: "inline-size", width: "100%", aspectRatio: "1" }}>
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
      }}
    >
      {rows.map((row, rowIdx) =>
        (flipped ? [...row].reverse() : row).map((piece, colIdx) => {
          const square = squareName(rowIdx, colIdx);
          const isLight = (rowIdx + colIdx) % 2 === 0;
          const isSelected = selected === square;
          const isHint = hintSquare === square;
          const isLegal = legalSquares.has(square);
          const isCapture = isLegal && piece !== null;
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
                fontSize: "9cqw",
                background: isSelected
                  ? "#f6f669"
                  : isHint
                  ? "#9ae29a"
                  : isLight
                  ? "#f0d9b5"
                  : "#b58863",
                cursor: disabled ? "default" : (piece || selected || isLegal) ? "pointer" : "default",
                userSelect: "none",
              }}
            >
              {piece && (
                <span style={{
                  color: piece === piece.toUpperCase() ? "#fff" : "#1a1a1a",
                  textShadow: piece === piece.toUpperCase()
                    ? "0 0 3px #000, 0 0 6px rgba(0,0,0,.8), 1px 1px 0 #000"
                    : "0 0 3px rgba(255,255,255,.6), 0 0 6px rgba(255,255,255,.4), 1px 1px 0 rgba(255,255,255,.5)",
                  lineHeight: 1,
                  position: "relative",
                  zIndex: 1,
                }}>
                  {PIECE_GLYPHS[piece]}
                </span>
              )}
              {/* Legal move dot (empty square) */}
              {isLegal && !isCapture && (
                <div style={{
                  position: "absolute",
                  width: "32%",
                  height: "32%",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,.18)",
                  pointerEvents: "none",
                }} />
              )}
              {/* Capture ring */}
              {isCapture && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "8% solid rgba(0,0,0,.18)",
                  pointerEvents: "none",
                  zIndex: 2,
                }} />
              )}
            </div>
          );
        })
      )}
    </div>
    </div>
  );
}
