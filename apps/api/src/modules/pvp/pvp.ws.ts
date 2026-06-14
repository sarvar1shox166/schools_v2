import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { Chess } from "@chess-school/chess-engine";
import { pool } from "../../db/pool.js";
import type { JwtPayload } from "../../plugins/auth.js";

interface QueuedPlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
}

interface GamePlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
}

interface Game {
  id: string;
  chess: Chess;
  white: GamePlayer;
  black: GamePlayer;
}

interface OnlinePlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
}

interface Challenge {
  fromStudentId: string;
  fromSocket: WebSocket;
  fromName: string;
  toStudentId: string;
}

const queue: QueuedPlayer[] = [];
const games = new Map<string, Game>();
const socketGames = new Map<WebSocket, string>();
const onlinePlayers = new Map<WebSocket, OnlinePlayer>();
const challenges = new Map<string, Challenge>();

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastOnlineList() {
  const list = [...onlinePlayers.values()]
    .filter((p) => !socketGames.has(p.socket))
    .map((p) => ({ studentId: p.studentId, fullName: p.fullName }));
  for (const p of onlinePlayers.values()) {
    send(p.socket, { type: "online_list", players: list.filter((x) => x.studentId !== p.studentId) });
  }
}

function startGame(a: { socket: WebSocket; studentId: string; fullName: string }, b: { socket: WebSocket; studentId: string; fullName: string }) {
  const id = `${a.studentId}-${b.studentId}-${Date.now()}`;
  const chess = new Chess();
  const game: Game = { id, chess, white: a, black: b };
  games.set(id, game);
  socketGames.set(a.socket, id);
  socketGames.set(b.socket, id);

  send(a.socket, { type: "matched", color: "w", opponent: b.fullName, fen: chess.fen() });
  send(b.socket, { type: "matched", color: "b", opponent: a.fullName, fen: chess.fen() });
  broadcastOnlineList();
}

function gameStatus(chess: Chess): { gameOver: boolean; result?: string } {
  if (!chess.isGameOver()) return { gameOver: false };
  if (chess.isCheckmate()) return { gameOver: true, result: chess.turn() === "w" ? "black_wins" : "white_wins" };
  if (chess.isStalemate()) return { gameOver: true, result: "draw_stalemate" };
  if (chess.isThreefoldRepetition()) return { gameOver: true, result: "draw_repetition" };
  if (chess.isInsufficientMaterial()) return { gameOver: true, result: "draw_material" };
  return { gameOver: true, result: "draw" };
}

async function updateElo(game: Game, reason: string) {
  let scoreWhite: number;
  if (reason.startsWith("white_wins")) scoreWhite = 1;
  else if (reason.startsWith("black_wins")) scoreWhite = 0;
  else if (reason.startsWith("draw")) scoreWhite = 0.5;
  else return;

  const { rows } = await pool.query(
    `SELECT student_id AS "studentId", elo FROM student_xp WHERE student_id = ANY($1)`,
    [[game.white.studentId, game.black.studentId]]
  );
  const eloMap = new Map(rows.map((r) => [r.studentId, r.elo as number]));
  const eloWhite = eloMap.get(game.white.studentId) ?? 1200;
  const eloBlack = eloMap.get(game.black.studentId) ?? 1200;

  const expectedWhite = 1 / (1 + 10 ** ((eloBlack - eloWhite) / 400));
  const K = 16;
  const newEloWhite = Math.round(eloWhite + K * (scoreWhite - expectedWhite));
  const newEloBlack = Math.round(eloBlack + K * ((1 - scoreWhite) - (1 - expectedWhite)));

  for (const [studentId, elo] of [
    [game.white.studentId, newEloWhite],
    [game.black.studentId, newEloBlack],
  ] as const) {
    await pool.query(
      `INSERT INTO student_xp (student_id, elo) VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET elo = $2`,
      [studentId, elo]
    );
  }
}

function endGame(game: Game, reason: string) {
  games.delete(game.id);
  socketGames.delete(game.white.socket);
  socketGames.delete(game.black.socket);
  send(game.white.socket, { type: "ended", reason });
  send(game.black.socket, { type: "ended", reason });
  broadcastOnlineList();
  updateElo(game, reason).catch((err) => console.error("ELO update failed", err));
}

function tryMatch() {
  while (queue.length >= 2) {
    const a = queue.shift()!;
    const b = queue.shift()!;
    if (a.socket.readyState !== a.socket.OPEN) {
      queue.unshift(b);
      continue;
    }
    if (b.socket.readyState !== b.socket.OPEN) {
      queue.unshift(a);
      continue;
    }

    startGame(a, b);
  }
}

async function getStudent(userId: string): Promise<{ studentId: string; fullName: string } | null> {
  const { rows } = await pool.query(
    `SELECT s.id AS "studentId", u.full_name AS "fullName"
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function pvpRoutes(app: FastifyInstance) {
  app.get("/ws/pvp", { websocket: true }, async (socket, request) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      socket.close(4001, "Unauthorized");
      return;
    }

    let payload: JwtPayload;
    try {
      payload = app.jwt.verify<JwtPayload>(token);
    } catch {
      socket.close(4001, "Unauthorized");
      return;
    }

    if (payload.role !== "student") {
      socket.close(4003, "Forbidden");
      return;
    }

    const student = await getStudent(payload.sub);
    if (!student) {
      socket.close(4004, "Student not found");
      return;
    }

    queue.push({ socket, studentId: student.studentId, fullName: student.fullName });
    onlinePlayers.set(socket, { socket, studentId: student.studentId, fullName: student.fullName });
    send(socket, { type: "queued" });
    tryMatch();
    broadcastOnlineList();

    socket.on("message", (raw) => {
      let msg: { type: string; from?: string; to?: string; promotion?: string; targetStudentId?: string; fromStudentId?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "challenge" && msg.targetStudentId) {
        const target = [...onlinePlayers.values()].find((p) => p.studentId === msg.targetStudentId);
        const me = onlinePlayers.get(socket);
        if (!target || !me || socketGames.has(target.socket) || socketGames.has(socket)) return;

        const key = `${student.studentId}-${msg.targetStudentId}`;
        challenges.set(key, { fromStudentId: student.studentId, fromSocket: socket, fromName: student.fullName, toStudentId: msg.targetStudentId });
        send(target.socket, { type: "challenge_received", fromStudentId: student.studentId, fromName: student.fullName });
        return;
      }

      if (msg.type === "challenge_accept" && msg.fromStudentId) {
        const key = `${msg.fromStudentId}-${student.studentId}`;
        const challenge = challenges.get(key);
        if (!challenge) return;
        challenges.delete(key);

        const me = onlinePlayers.get(socket);
        const challenger = onlinePlayers.get(challenge.fromSocket);
        if (!me || !challenger) return;
        if (socketGames.has(me.socket) || socketGames.has(challenger.socket)) return;

        send(challenger.socket, { type: "challenge_accepted", byStudentId: student.studentId, byName: student.fullName });
        startGame(challenger, me);
        return;
      }

      if (msg.type === "challenge_decline" && msg.fromStudentId) {
        const key = `${msg.fromStudentId}-${student.studentId}`;
        const challenge = challenges.get(key);
        if (!challenge) return;
        challenges.delete(key);
        send(challenge.fromSocket, { type: "challenge_declined", byStudentId: student.studentId, byName: student.fullName });
        return;
      }

      const gameId = socketGames.get(socket);
      if (!gameId) return;
      const game = games.get(gameId);
      if (!game) return;

      if (msg.type === "move" && msg.from && msg.to) {
        const isWhite = game.white.socket === socket;
        const myColor = isWhite ? "w" : "b";
        if (game.chess.turn() !== myColor) {
          send(socket, { type: "error", message: "Sizning navbatingiz emas" });
          return;
        }

        let move;
        try {
          move = game.chess.move({ from: msg.from, to: msg.to, promotion: msg.promotion });
        } catch {
          move = null;
        }
        if (!move) {
          send(socket, { type: "error", message: "Noto'g'ri yurish" });
          return;
        }

        const status = gameStatus(game.chess);
        const update = {
          type: "move",
          from: msg.from,
          to: msg.to,
          fen: game.chess.fen(),
          turn: game.chess.turn(),
          ...status,
        };
        send(game.white.socket, update);
        send(game.black.socket, update);

        if (status.gameOver) {
          games.delete(game.id);
          socketGames.delete(game.white.socket);
          socketGames.delete(game.black.socket);
        }
        return;
      }

      if (msg.type === "resign") {
        const isWhite = game.white.socket === socket;
        endGame(game, isWhite ? "black_wins_resign" : "white_wins_resign");
      }
    });

    socket.on("close", () => {
      const idx = queue.findIndex((p) => p.socket === socket);
      if (idx !== -1) queue.splice(idx, 1);

      onlinePlayers.delete(socket);
      for (const [key, challenge] of challenges) {
        if (challenge.fromSocket === socket || student.studentId === challenge.toStudentId) {
          challenges.delete(key);
        }
      }

      const gameId = socketGames.get(socket);
      if (!gameId) {
        broadcastOnlineList();
        return;
      }
      const game = games.get(gameId);
      if (!game) {
        broadcastOnlineList();
        return;
      }

      const isWhite = game.white.socket === socket;
      const opponent = isWhite ? game.black.socket : game.white.socket;
      games.delete(game.id);
      socketGames.delete(game.white.socket);
      socketGames.delete(game.black.socket);
      send(opponent, { type: "ended", reason: "opponent_disconnected" });
      broadcastOnlineList();
    });
  });
}
