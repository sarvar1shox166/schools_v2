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

export function ChessBoard({ fen, onMove, disabled, flipped, hintSquare }: { fen: string; onMove: (from: string, to: string) => void; disabled?: boolean; flipped?: boolean; hintSquare?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const board = fenToBoard(fen);
  const rows = flipped ? [...board].reverse() : board;

  function squareName(rowIdx: number, colIdx: number) {
    const r = flipped ? 7 - rowIdx : rowIdx;
    const c = flipped ? 7 - colIdx : colIdx;
    return `${FILES[c]}${8 - r}`;
  }

  function handleClick(square: string, piece: string | null) {
    if (disabled) return;
    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      onMove(selected, square);
      setSelected(null);
      return;
    }
    if (piece) setSelected(square);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        width: "100%",
        maxWidth: 380,
        aspectRatio: "1",
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
          return (
            <div
              key={square}
              onClick={() => handleClick(square, piece)}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(18px, 5.5vw, 38px)",
                background: isSelected ? "#f6f669" : isHint ? "#9ae29a" : isLight ? "#f0d9b5" : "#b58863",
                cursor: disabled ? "default" : piece || selected ? "pointer" : "default",
                userSelect: "none",
              }}
            >
              {piece ? PIECE_GLYPHS[piece] : ""}
            </div>
          );
        })
      )}
    </div>
  );
}
