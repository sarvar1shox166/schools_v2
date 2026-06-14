import { useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PALETTE: { piece: string | null; label: string }[] = [
  { piece: "K", label: "♔" },
  { piece: "Q", label: "♕" },
  { piece: "R", label: "♖" },
  { piece: "B", label: "♗" },
  { piece: "N", label: "♘" },
  { piece: "P", label: "♙" },
  { piece: "k", label: "♚" },
  { piece: "q", label: "♛" },
  { piece: "r", label: "♜" },
  { piece: "b", label: "♝" },
  { piece: "n", label: "♞" },
  { piece: "p", label: "♟" },
  { piece: null, label: "✕" },
];

function fenToBoard(fen: string): (string | null)[][] {
  const placement = fen.split(" ")[0];
  return placement.split("/").map((row) => {
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

function boardToFen(board: (string | null)[][], turn: string): string {
  const placement = board
    .map((row) => {
      let out = "";
      let empty = 0;
      for (const cell of row) {
        if (cell) {
          if (empty > 0) {
            out += empty;
            empty = 0;
          }
          out += cell;
        } else {
          empty++;
        }
      }
      if (empty > 0) out += empty;
      return out;
    })
    .join("/");
  return `${placement} ${turn} KQkq - 0 1`;
}

export function BoardEditor({
  fen,
  onFenChange,
  solution,
  onSolutionChange,
}: {
  fen: string;
  onFenChange: (fen: string) => void;
  solution: string[];
  onSolutionChange: (solution: string[]) => void;
}) {
  const [selectedPiece, setSelectedPiece] = useState<string | null>("K");
  const [mode, setMode] = useState<"place" | "solution">("place");
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const turn = fen.split(" ")[1] ?? "w";
  const board = fenToBoard(fen);

  function squareName(rowIdx: number, colIdx: number) {
    return `${FILES[colIdx]}${8 - rowIdx}`;
  }

  function handleSquareClick(rowIdx: number, colIdx: number) {
    const square = squareName(rowIdx, colIdx);
    if (mode === "place") {
      const next = board.map((row) => [...row]);
      next[rowIdx][colIdx] = selectedPiece;
      onFenChange(boardToFen(next, turn));
      return;
    }
    if (!pendingFrom) {
      setPendingFrom(square);
      return;
    }
    if (pendingFrom === square) {
      setPendingFrom(null);
      return;
    }
    onSolutionChange([...solution, `${pendingFrom}${square}`]);
    setPendingFrom(null);
  }

  function removeSolutionMove(idx: number) {
    onSolutionChange(solution.filter((_, i) => i !== idx));
  }

  function toggleTurn() {
    onFenChange(boardToFen(board, turn === "w" ? "b" : "w"));
  }

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            width: 320,
            maxWidth: "100%",
            aspectRatio: "1",
            borderRadius: 6,
            overflow: "hidden",
            border: "2.5px solid rgba(0,0,0,.4)",
          }}
        >
          {board.map((row, rowIdx) =>
            row.map((piece, colIdx) => {
              const square = squareName(rowIdx, colIdx);
              const isLight = (rowIdx + colIdx) % 2 === 0;
              const isPending = pendingFrom === square;
              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(rowIdx, colIdx)}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(16px, 4.5vw, 32px)",
                    background: isPending ? "#f6f669" : isLight ? "#f0d9b5" : "#b58863",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {piece ? PALETTE.find((p) => p.piece === piece)?.label : ""}
                </div>
              );
            })
          )}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={"btn sm" + (mode === "place" ? " primary" : "")} onClick={() => setMode("place")}>
            Joylashtirish
          </button>
          <button className={"btn sm" + (mode === "solution" ? " primary" : "")} onClick={() => { setMode("solution"); setPendingFrom(null); }}>
            Yechim belgilash
          </button>
          <button className="btn sm" onClick={toggleTurn}>
            Yurish: {turn === "w" ? "Oq" : "Qora"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 180 }}>
        {mode === "place" && (
          <div>
            <div className="cell-sub" style={{ marginBottom: 6 }}>Figura tanlang, keyin doskaga bosing</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {PALETTE.map((p) => (
                <button
                  key={p.label}
                  className={"btn sm" + (selectedPiece === p.piece ? " primary" : "")}
                  onClick={() => setSelectedPiece(p.piece)}
                  style={{ fontSize: 18, minWidth: 36 }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === "solution" && (
          <div>
            <div className="cell-sub" style={{ marginBottom: 6 }}>
              {pendingFrom ? `${pendingFrom} dan qayerga?` : "Yurish boshlanish kvadratini bosing"}
            </div>
            <div className="list">
              {solution.map((move, idx) => (
                <div className="li" key={idx}>
                  <div className="cell-main">{idx + 1}. {move}</div>
                  <button className="btn sm" onClick={() => removeSolutionMove(idx)}>O'chirish</button>
                </div>
              ))}
              {solution.length === 0 && <div className="empty">Yurishlar yo'q</div>}
            </div>
          </div>
        )}
        <div className="cell-sub" style={{ marginTop: 10, wordBreak: "break-all" }}>FEN: {fen}</div>
      </div>
    </div>
  );
}
