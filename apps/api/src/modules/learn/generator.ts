import { pieceDestinations, fileOf, rankOf, toSquare, type SimplePiece } from "@chess-school/chess-engine";

/** Har bir "Shaxmat donalari" bosqichi server tomonda shu yerda generatsiya
 *  qilinadi — joriy holatdan haqiqatan yetib boriladigan (kafolatlangan
 *  yechiladigan) nishonlar ketma-ketligi tuziladi, so'ng qiyinlik darajasiga
 *  qarab to'siq donalar qo'shiladi. Past bosqichlarda to'siqlar butunlay
 *  yo'ldan tashqarida (dekorativ), yuqori bosqichlarda esa joriy dona
 *  ko'ra oladigan, lekin yechimga aloqasi yo'q ("near-miss") kataklarga
 *  qo'yiladi — shu bilan o'quvchi haqiqatan qaysi yo'nalish ochiqligini
 *  payqashi kerak bo'ladi. */

export interface GeneratedLevel {
  pieceType: SimplePiece;
  from: string;
  path: string[];
  obstacles: string[];
  hintSquare: string | null;
}

function randomSquare(avoidLastTwoRanks: boolean): string {
  const file = Math.floor(Math.random() * 8);
  const rank = avoidLastTwoRanks ? 1 + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 8);
  return toSquare(file, rank)!;
}

function isAligned(a: string, b: string): boolean {
  const fa = fileOf(a), ra = rankOf(a);
  const fb = fileOf(b), rb = rankOf(b);
  return fa === fb || ra === rb || Math.abs(fa - fb) === Math.abs(ra - rb);
}

function chebyshev(a: string, b: string): number {
  return Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));
}

const ALL_SQUARES: string[] = [];
for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) ALL_SQUARES.push(toSquare(f, r)!);

function tryGenerate(
  pieceType: SimplePiece, targetCount: number, obstacleCount: number, showHint: boolean,
  minSpread: number, cluttered: boolean
): GeneratedLevel | null {
  const isPawn = pieceType === "p";
  const from = randomSquare(isPawn);
  const occupied = new Set<string>([from]);
  const path: string[] = [];
  const nearMisses: string[] = [];
  let current = from;

  for (let i = 0; i < targetCount; i++) {
    const dests = pieceDestinations(pieceType, current, occupied, "w").filter((sq) => !occupied.has(sq));
    if (dests.length === 0) break;
    // Uzoqroq (haqiqiy qiyinlik) sakrashlarga ustunlik beramiz, lekin imkon
    // bo'lmasa (masalan shoh uchun) cheklovsiz to'plamga qaytamiz.
    const farEnough = dests.filter((sq) => chebyshev(current, sq) >= minSpread);
    const pool = farEnough.length > 0 ? farEnough : dests;
    const next = pool[Math.floor(Math.random() * pool.length)];
    // Tanlanmagan variantlar — geometrik ko'rinadigan, lekin yechimga
    // aloqasi yo'q kataklar; keyinroq "near-miss" to'siq sifatida ishlatiladi.
    for (const sq of dests) if (sq !== next) nearMisses.push(sq);
    path.push(next);
    occupied.add(next);
    current = next;
  }
  if (path.length !== targetCount) return null;

  const pathSquares = [from, ...path];
  const obstacles: string[] = [];

  if (cluttered && nearMisses.length > 0) {
    const shuffled = [...new Set(nearMisses)].sort(() => Math.random() - 0.5);
    for (const sq of shuffled) {
      if (obstacles.length >= obstacleCount) break;
      if (occupied.has(sq)) continue;
      obstacles.push(sq);
      occupied.add(sq);
    }
  }

  if (obstacles.length < obstacleCount) {
    const candidates = ALL_SQUARES.filter(
      (sq) => !occupied.has(sq) && !pathSquares.some((p) => isAligned(sq, p))
    );
    for (let i = obstacles.length; i < obstacleCount && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      obstacles.push(candidates[idx]);
      occupied.add(candidates[idx]);
      candidates.splice(idx, 1);
    }
  }

  // Yakuniy tekshiruv: to'siqlar qo'shilgandan keyin ham yo'lning har bir
  // bosqichi (legi) hali haqiqatan yetib boriladiganligini tasdiqlaymiz —
  // "near-miss" to'siq tasodifan keyingi bir legni ham bloklab qo'yishi
  // mumkin (kichik ehtimol, lekin nazorat qilinishi kerak).
  const finalOccupied = new Set([from, ...path, ...obstacles]);
  let cursor = from;
  for (const target of path) {
    const legOccupied = new Set(finalOccupied);
    legOccupied.delete(cursor);
    const reachable = pieceDestinations(pieceType, cursor, legOccupied, "w");
    if (!reachable.includes(target)) return null;
    cursor = target;
  }

  return { pieceType, from, path, obstacles, hintSquare: showHint ? path[0] ?? null : null };
}

export function generateLevel(
  pieceType: SimplePiece, targetCount: number, obstacleCount: number, showHint: boolean,
  minSpread = 1, cluttered = false
): GeneratedLevel {
  let best: GeneratedLevel | null = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = tryGenerate(pieceType, targetCount, obstacleCount, showHint, minSpread, cluttered);
    if (result) return result;
    if (!best) {
      const fallback = tryGenerate(pieceType, targetCount, obstacleCount, showHint, 1, false);
      if (fallback) best = fallback;
    }
  }
  return best ?? tryGenerate(pieceType, targetCount, 0, showHint, 1, false)!;
}
