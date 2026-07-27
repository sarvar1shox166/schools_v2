import { fileOf, rankOf } from "./pieceMoves.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** FEN'ning joylashuv qismini 8x8 katakka ajratadi (rows[0] = 8-qator). */
export function parseFenPlacement(fen: string): (string | null)[][] {
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

/** Har bir band katakni (masalan "e4") FEN belgisiga ("P") xaritalaydi. */
export function squaresFromFen(fen: string): Map<string, string> {
  const grid = parseFenPlacement(fen);
  const map = new Map<string, string>();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = grid[r][c];
      if (piece) map.set(`${FILES[c]}${8 - r}`, piece);
    }
  }
  return map;
}

/** FEN'ning faqat joylashuv (piece-placement) qismini quradi — to'liq FEN talab
 *  qiladigan shoh yoki boshqa maydonlar shart emas, <ChessBoard> faqat shu
 *  qismini o'qiydi. Backend (o'yin holatini generatsiya qilishda) va frontend
 *  (har bir to'g'ri yurishdan keyin taxtani qayta chizishda) bitta manbadan
 *  foydalanadi. */
export function buildFenPlacement(pieces: { square: string; piece: string }[]): string {
  const grid: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const { square, piece } of pieces) {
    const file = fileOf(square);
    const rank = rankOf(square);
    grid[7 - rank][file] = piece;
  }
  return grid
    .map((row) => {
      let out = "";
      let empty = 0;
      for (const cell of row) {
        if (cell) {
          if (empty > 0) { out += empty; empty = 0; }
          out += cell;
        } else {
          empty++;
        }
      }
      if (empty > 0) out += empty;
      return out;
    })
    .join("/");
}
