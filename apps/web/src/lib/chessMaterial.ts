const START_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const GLYPH: Record<string, { w: string; b: string }> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
};
const ORDER = ["q", "r", "b", "n", "p"];

export interface CapturedMaterial {
  byWhite: string[]; // black pieces white has captured
  byBlack: string[]; // white pieces black has captured
  diff: number; // material point advantage, positive = white ahead
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Returns the piece char at a square (e.g. "P", "q") from a FEN board, or null if empty. */
export function pieceAt(fen: string, square: string): string | null {
  const board = fen.split(" ")[0] ?? "";
  const rows = board.split("/");
  const file = FILES.indexOf(square[0]);
  const rank = parseInt(square[1], 10);
  if (file < 0 || !rank || rank < 1 || rank > 8) return null;
  const row = rows[8 - rank];
  if (!row) return null;
  let col = 0;
  for (const ch of row) {
    if (/\d/.test(ch)) { col += Number(ch); continue; }
    if (col === file) return ch;
    col++;
  }
  return null;
}

/** True when moving the piece at `from` to `to` is a pawn promotion. */
export function isPromotionMove(fen: string, from: string, to: string): boolean {
  const piece = pieceAt(fen, from);
  if (!piece || piece.toLowerCase() !== "p") return false;
  const targetRank = to[1];
  return targetRank === "8" || targetRank === "1";
}

export function getCaptured(fen: string): CapturedMaterial {
  const board = fen.split(" ")[0] ?? "";
  const onBoard: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const onBoardBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (!(lower in START_COUNTS)) continue;
    if (ch === lower) onBoardBlack[lower]++;
    else onBoard[lower]++;
  }

  const byWhite: string[] = []; // black pieces missing => captured by white
  const byBlack: string[] = []; // white pieces missing => captured by black
  let diff = 0;
  for (const p of ORDER) {
    const missingBlack = START_COUNTS[p] - onBoardBlack[p];
    const missingWhite = START_COUNTS[p] - onBoard[p];
    for (let i = 0; i < missingBlack; i++) byWhite.push(GLYPH[p].b);
    for (let i = 0; i < missingWhite; i++) byBlack.push(GLYPH[p].w);
    diff += missingBlack * VALUE[p] - missingWhite * VALUE[p];
  }
  return { byWhite, byBlack, diff };
}
