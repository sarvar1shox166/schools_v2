/** Sof geometrik dona-yurish qoidalari — chess.js'dan mustaqil (chess.js FEN'da
 *  ikkala shohni talab qiladi, "O'rganish" mashqlarida esa taxtada faqat bitta
 *  dona + bir nechta nishon/to'siq bo'lishi mumkin, shoh umuman bo'lmasligi mumkin).
 *
 *  Bu funksiya ham backend'da mashq generatsiyasi uchun (generator.ts), ham
 *  frontendda <ChessBoard getMoves=.../> uchun ishlatiladi — bitta manba. */

export type SimplePiece = "p" | "n" | "b" | "r" | "q" | "k";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function fileOf(square: string): number {
  return FILES.indexOf(square[0]);
}

export function rankOf(square: string): number {
  return Number(square[1]) - 1;
}

export function toSquare(file: number, rank: number): string | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}`;
}

function rayDestinations(file: number, rank: number, directions: [number, number][], occupied: Set<string>): string[] {
  const out: string[] = [];
  for (const [df, dr] of directions) {
    let f = file + df, r = rank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const sq = toSquare(f, r)!;
      out.push(sq);
      if (occupied.has(sq)) break; // band donagacha yetadi (uni "yeb" to'xtaydi), undan naryog'iga o'tmaydi
      f += df; r += dr;
    }
  }
  return out;
}

/**
 * Berilgan dona turi uchun `square`dan yeta oladigan barcha kataklarni qaytaradi.
 * `occupied` — taxtadagi BOSHQA barcha donalar joylashgan kataklar to'plami
 * (nishonlar ham, to'siqlar ham) — sirpanuvchi donalar shu kataklarda to'xtaydi.
 */
export function pieceDestinations(
  piece: SimplePiece, square: string, occupied: Set<string>, color: "w" | "b" = "w"
): string[] {
  const file = fileOf(square);
  const rank = rankOf(square);
  if (file < 0 || rank < 0 || rank > 7) return [];

  switch (piece) {
    case "r":
      return rayDestinations(file, rank, [[1, 0], [-1, 0], [0, 1], [0, -1]], occupied);
    case "b":
      return rayDestinations(file, rank, [[1, 1], [1, -1], [-1, 1], [-1, -1]], occupied);
    case "q":
      return rayDestinations(file, rank, [
        [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
      ], occupied);
    case "n": {
      const offsets: [number, number][] = [
        [1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1],
      ];
      return offsets
        .map(([df, dr]) => toSquare(file + df, rank + dr))
        .filter((sq): sq is string => sq !== null);
    }
    case "k": {
      const out: string[] = [];
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const sq = toSquare(file + df, rank + dr);
          if (sq) out.push(sq);
        }
      }
      return out;
    }
    case "p": {
      const dir = color === "w" ? 1 : -1;
      const startRank = color === "w" ? 1 : 6;
      const out: string[] = [];
      const oneStep = toSquare(file, rank + dir);
      if (oneStep && !occupied.has(oneStep)) {
        out.push(oneStep);
        const twoStep = toSquare(file, rank + dir * 2);
        if (rank === startRank && twoStep && !occupied.has(twoStep)) out.push(twoStep);
      }
      for (const df of [-1, 1]) {
        const capSq = toSquare(file + df, rank + dir);
        if (capSq && occupied.has(capSq)) out.push(capSq);
      }
      return out;
    }
    default:
      return [];
  }
}
