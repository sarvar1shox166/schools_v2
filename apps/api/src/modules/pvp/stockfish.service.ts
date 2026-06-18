import { spawn } from "child_process";
import { createRequire } from "module";
import path from "path";

const _require = createRequire(import.meta.url);

// skill 0 = ~600 ELO, skill 20 = ~3500 ELO
// difficulty 1-10 maps to skill 0-18; unbeatable (11) = skill 20
export function difficultyToSkill(difficulty: number): number {
  if (difficulty >= 11) return 20;
  return Math.round((difficulty - 1) * 2); // 1→0, 5→8, 10→18
}

function getStockfishPath(): string {
  // Resolve the stockfish package dir, then point to the single-threaded JS engine
  const indexPath = _require.resolve("stockfish");
  const stockfishDir = path.dirname(indexPath);
  return path.join(stockfishDir, "bin", "stockfish-18-single.js");
}

export function getComputerMove(
  fen: string,
  skillLevel: number,
  movetime: number = 1000
): Promise<string | null> {
  return new Promise((resolve) => {
    const stockfishJs = getStockfishPath();
    // Spawn stockfish as a child Node process — it reads UCI from stdin, writes to stdout
    const proc = spawn(process.execPath, [stockfishJs], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buffer = "";
    let resolved = false;

    function finish(move: string | null) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { proc.kill(); } catch {}
      resolve(move);
    }

    proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("bestmove")) {
          const parts = t.split(/\s+/);
          finish(parts[1] === "(none)" ? null : (parts[1] ?? null));
          return;
        }
      }
    });

    proc.on("error", () => finish(null));
    proc.on("exit", () => { if (!resolved) finish(null); });

    // Safety timeout: movetime + 8 s
    const timer = setTimeout(() => finish(null), movetime + 8000);

    proc.stdin.write(`uci\n`);
    proc.stdin.write(`setoption name Skill Level value ${skillLevel}\n`);
    proc.stdin.write(`ucinewgame\n`);
    proc.stdin.write(`position fen ${fen}\n`);
    proc.stdin.write(`go movetime ${movetime}\n`);
  });
}
