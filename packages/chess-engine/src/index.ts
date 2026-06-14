import { Chess } from "chess.js";

export { Chess };

export interface PuzzleCheckResult {
  correct: boolean;
  finished: boolean;
  fenAfter: string;
}

/**
 * Validates the next move of a puzzle attempt against the expected solution line.
 * `solution` is a sequence of moves in UCI format (e.g. "e2e4", "e7e8q"),
 * alternating between the opponent's setup moves and the player's moves.
 */
export function checkPuzzleMove(fen: string, solution: string[], moveIndex: number, move: string): PuzzleCheckResult {
  const expected = solution[moveIndex];

  const chess = new Chess(fen);
  for (let i = 0; i < moveIndex; i++) {
    applyUciMove(chess, solution[i]);
  }

  if (!expected || expected.toLowerCase() !== move.toLowerCase()) {
    return { correct: false, finished: false, fenAfter: chess.fen() };
  }

  applyUciMove(chess, move);

  const finished = moveIndex + 1 >= solution.length;
  if (!finished) {
    applyUciMove(chess, solution[moveIndex + 1]);
  }

  return { correct: true, finished, fenAfter: chess.fen() };
}

function applyUciMove(chess: Chess, uci: string) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4) : undefined;
  chess.move({ from, to, promotion });
}

export function isLegalMove(fen: string, from: string, to: string, promotion?: string): boolean {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from, to, promotion });
    return move !== null;
  } catch {
    return false;
  }
}
