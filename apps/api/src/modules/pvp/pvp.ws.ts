import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { Chess } from "@chess-school/chess-engine";
import { pool } from "../../db/pool.js";
import type { JwtPayload } from "../../plugins/auth.js";
import { getComputerMove, difficultyToSkill } from "./stockfish.service.js";

interface OnlinePlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
  elo: number;
}

interface QueuedPlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
  elo: number;
}

interface GamePlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
  elo: number;
}

interface Game {
  id: string;
  chess: Chess;
  white: GamePlayer;
  black: GamePlayer;
}

interface Challenge {
  fromStudentId: string;
  fromSocket: WebSocket;
  fromName: string;
  fromElo: number;
  toStudentId: string;
  tc: string;
  tcType: string;
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
  const inGame = new Set([...socketGames.keys()]);
  const list = [...onlinePlayers.values()].map((p) => ({
    studentId: p.studentId,
    fullName: p.fullName,
    elo: p.elo,
    inGame: inGame.has(p.socket),
  }));
  for (const p of onlinePlayers.values()) {
    send(p.socket, {
      type: "online_list",
      players: list.filter((x) => x.studentId !== p.studentId),
    });
  }
}

function startGame(
  a: { socket: WebSocket; studentId: string; fullName: string; elo: number },
  b: { socket: WebSocket; studentId: string; fullName: string; elo: number },
  tc?: string,
  tcType?: string,
) {
  const id = `${a.studentId}-${b.studentId}-${Date.now()}`;
  const chess = new Chess();
  const game: Game = { id, chess, white: a, black: b };
  games.set(id, game);
  socketGames.set(a.socket, id);
  socketGames.set(b.socket, id);

  send(a.socket, { type: "matched", color: "w", opponent: b.fullName, opponentElo: b.elo, fen: chess.fen(), tc, tcType });
  send(b.socket, { type: "matched", color: "b", opponent: a.fullName, opponentElo: a.elo, fen: chess.fen(), tc, tcType });
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
  const eloWhite = eloMap.get(game.white.studentId) ?? game.white.elo;
  const eloBlack = eloMap.get(game.black.studentId) ?? game.black.elo;

  const expectedWhite = 1 / (1 + 10 ** ((eloBlack - eloWhite) / 400));
  const K = 16;
  const newEloWhite = Math.round(eloWhite + K * (scoreWhite - expectedWhite));
  const newEloBlack = Math.round(eloBlack + K * ((1 - scoreWhite) - (1 - expectedWhite)));

  const updates: [string, number, number, "win" | "draw" | "loss", string, number][] = [
    [game.white.studentId, newEloWhite, newEloWhite - eloWhite,
      scoreWhite === 1 ? "win" : scoreWhite === 0 ? "loss" : "draw",
      game.black.fullName, eloBlack],
    [game.black.studentId, newEloBlack, newEloBlack - eloBlack,
      scoreWhite === 0 ? "win" : scoreWhite === 1 ? "loss" : "draw",
      game.white.fullName, eloWhite],
  ];

  for (const [studentId, elo, eloChange, result, opponentName] of updates) {
    await pool.query(
      `INSERT INTO student_xp (student_id, elo) VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET elo = $2`,
      [studentId, elo]
    );
    await pool.query(
      `INSERT INTO elo_history (student_id, elo) VALUES ($1, $2)`,
      [studentId, elo]
    );
    await pool.query(
      `INSERT INTO game_results (student_id, opponent_name, result, elo_change) VALUES ($1, $2, $3, $4)`,
      [studentId, opponentName, result, eloChange]
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
    if (a.socket.readyState !== a.socket.OPEN) { queue.unshift(b); continue; }
    if (b.socket.readyState !== b.socket.OPEN) { queue.unshift(a); continue; }
    startGame(a, b);
  }
}

async function getStudent(userId: string): Promise<{ studentId: string; fullName: string; elo: number } | null> {
  const { rows } = await pool.query(
    `SELECT s.id AS "studentId", u.full_name AS "fullName", COALESCE(sx.elo, 1200) AS elo
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN student_xp sx ON sx.student_id = s.id
     WHERE s.user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function pvpRoutes(app: FastifyInstance) {
  /* ── Record game result (computer games) ──────────────────────────────── */
  app.post("/pvp/game-result", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { opponentName, result, opponentElo } = request.body as {
      opponentName: string;
      result: "win" | "draw" | "loss";
      opponentElo: number;
    };

    if (!opponentName || !["win", "draw", "loss"].includes(result)) {
      return reply.code(400).send({ error: "invalid params" });
    }

    const payload = request.user as { sub: string };
    const { rows: sRows } = await pool.query(
      `SELECT s.id FROM students s JOIN users u ON u.id = s.user_id WHERE u.id = $1`,
      [payload.sub]
    );
    const studentId: string | undefined = sRows[0]?.id;
    if (!studentId) return reply.code(404).send({ error: "student not found" });

    const { rows: xpRows } = await pool.query(
      `SELECT elo FROM student_xp WHERE student_id = $1`,
      [studentId]
    );
    const myElo = xpRows[0]?.elo ?? 1200;
    const oppElo = opponentElo ?? 1200;

    const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
    const expected = 1 / (1 + 10 ** ((oppElo - myElo) / 400));
    const K = 16;
    const eloChange = Math.round(K * (score - expected));
    const newElo = myElo + eloChange;

    await pool.query(
      `INSERT INTO student_xp (student_id, elo) VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET elo = $2`,
      [studentId, newElo]
    );
    await pool.query(`INSERT INTO elo_history (student_id, elo) VALUES ($1, $2)`, [studentId, newElo]);
    await pool.query(
      `INSERT INTO game_results (student_id, opponent_name, result, elo_change) VALUES ($1, $2, $3, $4)`,
      [studentId, opponentName, result, eloChange]
    );

    return reply.send({ newElo, eloChange });
  });

  /* ── Computer move ────────────────────────────────────────────────────── */
  app.post("/pvp/computer-move", async (request, reply) => {
    const { fen, difficulty, unbeatable } = request.body as {
      fen: string; difficulty: number; unbeatable?: boolean;
    };
    if (!fen || typeof fen !== "string") return reply.code(400).send({ error: "fen required" });

    let chess: Chess;
    try { chess = new Chess(fen); } catch { return reply.code(400).send({ error: "invalid fen" }); }
    if (chess.isGameOver()) return reply.send({ move: null, gameOver: true });

    const skillLevel = unbeatable ? 20 : difficultyToSkill(difficulty ?? 5);
    const movetime = unbeatable ? 3000 : Math.min(200 + difficulty * 80, 1200);
    const move = await getComputerMove(fen, skillLevel, movetime);
    return reply.send({ move });
  });

  /* ── WebSocket PvP ────────────────────────────────────────────────────── */
  app.get("/ws/pvp", { websocket: true }, async (socket, request) => {
    const { token } = request.query as { token?: string };
    if (!token) { socket.close(4001, "Unauthorized"); return; }

    let payload: JwtPayload;
    try { payload = app.jwt.verify<JwtPayload>(token); }
    catch { socket.close(4001, "Unauthorized"); return; }

    if (payload.role !== "student") { socket.close(4003, "Forbidden"); return; }

    const student = await getStudent(payload.sub);
    if (!student) { socket.close(4004, "Student not found"); return; }

    // Remove stale connections for the same student (e.g. page refresh)
    for (const [oldSocket, p] of onlinePlayers.entries()) {
      if (p.studentId === student.studentId) {
        onlinePlayers.delete(oldSocket);
        const qi = queue.findIndex((q) => q.socket === oldSocket);
        if (qi !== -1) queue.splice(qi, 1);
        oldSocket.close(4000, "Replaced by new connection");
      }
    }

    // Add to lobby (not queue)
    onlinePlayers.set(socket, { socket, studentId: student.studentId, fullName: student.fullName, elo: student.elo });
    send(socket, { type: "connected", myElo: student.elo });
    broadcastOnlineList();

    socket.on("message", (raw) => {
      let msg: {
        type: string;
        from?: string; to?: string; promotion?: string;
        targetStudentId?: string; fromStudentId?: string;
        tc?: string; tcType?: string;
      };
      try { msg = JSON.parse(raw.toString()); }
      catch { return; }

      /* ── Join queue ── */
      if (msg.type === "join_queue") {
        const alreadyInQueue = queue.some((p) => p.studentId === student.studentId);
        if (!alreadyInQueue) {
          queue.push({ socket, studentId: student.studentId, fullName: student.fullName, elo: student.elo });
          send(socket, { type: "queued" });
          tryMatch();
        }
        return;
      }

      /* ── Leave queue ── */
      if (msg.type === "leave_queue") {
        const idx = queue.findIndex((p) => p.socket === socket);
        if (idx !== -1) queue.splice(idx, 1);
        send(socket, { type: "left_queue" });
        return;
      }

      /* ── Send challenge ── */
      if (msg.type === "challenge" && msg.targetStudentId) {
        const me = onlinePlayers.get(socket);
        const target = [...onlinePlayers.values()].find((p) => p.studentId === msg.targetStudentId);
        if (!target || !me || socketGames.has(target.socket) || socketGames.has(socket)) return;

        const key = `${student.studentId}-${msg.targetStudentId}`;
        challenges.set(key, {
          fromStudentId: student.studentId,
          fromSocket: socket,
          fromName: student.fullName,
          fromElo: student.elo,
          toStudentId: msg.targetStudentId,
          tc: msg.tc ?? "5+0",
          tcType: msg.tcType ?? "BLITS",
        });
        send(target.socket, {
          type: "challenge_received",
          fromStudentId: student.studentId,
          fromName: student.fullName,
          fromElo: student.elo,
          tc: msg.tc ?? "5+0",
          tcType: msg.tcType ?? "BLITS",
        });
        return;
      }

      /* ── Accept challenge ── */
      if (msg.type === "challenge_accept" && msg.fromStudentId) {
        const key = `${msg.fromStudentId}-${student.studentId}`;
        const challenge = challenges.get(key);
        if (!challenge) return;
        challenges.delete(key);

        const me = onlinePlayers.get(socket);
        const challenger = onlinePlayers.get(challenge.fromSocket);
        if (!me || !challenger) return;
        if (socketGames.has(me.socket) || socketGames.has(challenger.socket)) return;

        // Remove both from queue if present
        const removeFromQueue = (sock: WebSocket) => {
          const idx = queue.findIndex((p) => p.socket === sock);
          if (idx !== -1) queue.splice(idx, 1);
        };
        removeFromQueue(me.socket);
        removeFromQueue(challenger.socket);

        send(challenger.socket, { type: "challenge_accepted", byName: student.fullName });
        startGame(challenger, me, challenge.tc, challenge.tcType);
        return;
      }

      /* ── Decline challenge ── */
      if (msg.type === "challenge_decline" && msg.fromStudentId) {
        const key = `${msg.fromStudentId}-${student.studentId}`;
        const challenge = challenges.get(key);
        if (!challenge) return;
        challenges.delete(key);
        send(challenge.fromSocket, { type: "challenge_declined", byName: student.fullName });
        return;
      }

      /* ── In-game messages ── */
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
        try { move = game.chess.move({ from: msg.from, to: msg.to, promotion: msg.promotion }); }
        catch { move = null; }
        if (!move) { send(socket, { type: "error", message: "Noto'g'ri yurish" }); return; }

        const status = gameStatus(game.chess);
        const update = { type: "move", from: msg.from, to: msg.to, fen: game.chess.fen(), turn: game.chess.turn(), ...status };
        send(game.white.socket, update);
        send(game.black.socket, update);

        // Fix: ELO update on checkmate/stalemate/draw
        if (status.gameOver) {
          games.delete(game.id);
          socketGames.delete(game.white.socket);
          socketGames.delete(game.black.socket);
          broadcastOnlineList();
          updateElo(game, status.result!).catch((err) => console.error("ELO update failed", err));
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
      if (!gameId) { broadcastOnlineList(); return; }
      const game = games.get(gameId);
      if (!game) { broadcastOnlineList(); return; }

      const opponent = game.white.socket === socket ? game.black.socket : game.white.socket;
      games.delete(game.id);
      socketGames.delete(game.white.socket);
      socketGames.delete(game.black.socket);
      send(opponent, { type: "ended", reason: "opponent_disconnected" });
      broadcastOnlineList();
    });
  });
}
