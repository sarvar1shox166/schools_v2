import { Chess } from "chess.js";

/** Mot-in-N tekshiruvchisi — standart ikki-kvantorli qidiruv:
 *  "SHU tomon uchun shunday yurish bo'lishi kerakki, RAQIBNING BARCHA
 *  javoblaridan keyin ham (yoki raqibda yurish umuman bo'lmasa — faqat mot
 *  bo'lgandagina) qolgan holat 'mot-in-(n-1)' bo'lib qolaveradi."
 *
 *  Bu Lichess boshqotirmalarining bitta "kanonik" yechimidan tashqari,
 *  HAQIQATAN belgilangan yurish sonida mot beruvchi har qanday muqobil
 *  yo'lni ham qabul qilish uchun ishlatiladi (mot1/mot2/mot3 bo'limlari).
 *  Chuqurlik kichik bo'lgani (1-3) sababli amaliy jihatdan tez, lekin
 *  nazoratsiz "ochiq" pozitsiyalarda portlab ketmasligi uchun tugun-limiti
 *  bilan himoyalangan. */

type Move = NonNullable<ReturnType<Chess["move"]>>;

const MAX_NODES = 250_000;

class NodeBudgetExceeded extends Error {}

function countNode(counter: { n: number }) {
  counter.n++;
  if (counter.n > MAX_NODES) throw new NodeBudgetExceeded();
}

function allRepliesLeadToMate(chess: Chess, remaining: number, counter: { n: number }): boolean {
  countNode(counter);
  if (chess.isCheckmate()) return true;
  const oppMoves = chess.moves({ verbose: true }) as Move[];
  if (oppMoves.length === 0) return false; // pat yoki yurish yo'q, lekin mot emas — muvaffaqiyatsiz
  if (remaining <= 0) return false; // solverga yurish qolmadi, lekin hali mot emas
  for (const om of oppMoves) {
    chess.move(om);
    const ok = findForcedMateMove(chess, remaining, counter) !== null;
    chess.undo();
    if (!ok) return false;
  }
  return true;
}

function findForcedMateMove(chess: Chess, n: number, counter: { n: number }): Move | null {
  countNode(counter);
  const moves = chess.moves({ verbose: true }) as Move[];
  for (const m of moves) {
    chess.move(m);
    const ok = allRepliesLeadToMate(chess, n - 1, counter);
    chess.undo();
    if (ok) return m;
  }
  return null;
}

function uciOf(m: Move): string {
  return m.from + m.to + (m.promotion ?? "");
}

/** Berilgan holatdan solver `n` ta o'z yurishi ichida (raqibning eng yaxshi
 *  himoyasiga qaramay) majburiy mot qo'ya oladimi. */
export function isMateAchievableIn(fen: string, n: number): boolean {
  if (n <= 0) return new Chess(fen).isCheckmate();
  try {
    return findForcedMateMove(new Chess(fen), n, { n: 0 }) !== null;
  } catch (e) {
    if (e instanceof NodeBudgetExceeded) return false;
    throw e;
  }
}

/** Joriy holatdan "mot-in-n"ni davom ettiruvchi BIRON BIR to'g'ri yurishni
 *  topadi — maslahat uchun, kanonik Lichess yo'lidan chetlashilgan bo'lsa ham. */
export function findAnyMateMove(fen: string, n: number): string | null {
  if (n <= 0) return null;
  try {
    const m = findForcedMateMove(new Chess(fen), n, { n: 0 });
    return m ? uciOf(m) : null;
  } catch (e) {
    if (e instanceof NodeBudgetExceeded) return null;
    throw e;
  }
}

export interface MateStepResult {
  correct: boolean;
  finished: boolean;
  fenAfter: string;
}

/** O'quvchining `uci` yurishini "mot-in-n" ni davom ettiradigan to'g'ri
 *  yurishlardan biri sifatida tekshiradi (raqibning BARCHA javoblarini
 *  hisobga olib). To'g'ri bo'lsa — agar mot bo'lmasa, raqibning majburiy
 *  javobini avtomatik qo'yadi (isbot bo'yicha raqibning har qanday yurishi
 *  ham mos keladi, shuning uchun birinchi topilgan qonuniy yurish yetarli). */
export function validateAndApplyMateStep(fen: string, uci: string, movesRemaining: number): MateStepResult {
  const chess = new Chess(fen);
  let mv: Move | null = null;
  try {
    mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
  } catch {
    mv = null;
  }
  if (!mv) return { correct: false, finished: false, fenAfter: fen };

  if (chess.isCheckmate()) {
    return { correct: true, finished: true, fenAfter: chess.fen() };
  }

  const remaining = movesRemaining - 1;
  let ok: boolean;
  try {
    ok = allRepliesLeadToMate(chess, remaining, { n: 0 });
  } catch (e) {
    if (e instanceof NodeBudgetExceeded) ok = false;
    else throw e;
  }
  if (!ok) return { correct: false, finished: false, fenAfter: fen };

  const oppMoves = chess.moves({ verbose: true }) as Move[];
  chess.move(oppMoves[0]);
  return { correct: true, finished: false, fenAfter: chess.fen() };
}
