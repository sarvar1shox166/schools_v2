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
