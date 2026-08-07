import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { Chess } from "@chess-school/chess-engine";
import { pool } from "../../db/pool.js";
import type { JwtPayload } from "../../plugins/auth.js";
import { getComputerMove, difficultyToSkill, computerOpponentElo } from "./stockfish.service.js";
import { checkAchievements } from "../gamification/xp.js";

interface OnlinePlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
  elo: number;
  tenantId: string;
}

interface QueuedPlayer {
  socket: WebSocket;
  studentId: string;
  fullName: string;
  elo: number;
  tenantId: string;
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
  tc: string;
  tcType: string;
  // Soat serverda yuritiladi — mijozdagi setInterval fon tabda sekinlashishi,
  // qoldiq vaqtni soxtalashtirish yoki tarmoq bilan mos kelmasligi mumkin edi.
  whiteMs: number;
  blackMs: number;
  incrementMs: number;
  turnStartedAt: number;
  flagTimer: ReturnType<typeof setTimeout> | null;
  // Ulanish uzilganda darhol mag'lubiyat YOZILMAYDI — qayta ulanish uchun
  // muddat beriladi (RECONNECT_GRACE_SECONDS), aks holda oddiy sahifa
  // yangilash yoki qisqa internet uzilishi o'yinni notekis tugatardi.
  disconnectTimers: Map<"w" | "b", ReturnType<typeof setTimeout>>;
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
// studentId → gameId: socketdan mustaqil, shuning uchun qayta ulanishda
// (yangi socket bilan) o'quvchining faol o'yinini topa olamiz.
const studentGames = new Map<string, string>();
const onlinePlayers = new Map<WebSocket, OnlinePlayer>();
const challenges = new Map<string, Challenge>();

const RECONNECT_GRACE_SECONDS = 30;

function tcToMs(tc?: string): { totalMs: number; incrementMs: number } {
  const [min, inc = "0"] = (tc ?? "5+0").split("+");
  const totalMs = (parseInt(min, 10) || 5) * 60_000;
  const incrementMs = (parseInt(inc, 10) || 0) * 1000;
  return { totalMs, incrementMs };
}

// Har bir foydalanuvchi bir vaqtda cheklangan sondagina Stockfish jarayonini
// ishga tushira olsin — aks holda cheksiz parallel chaqiruv orqali DoS mumkin.
const MAX_CONCURRENT_ENGINE_CALLS_PER_USER = 3;
const activeEngineCalls = new Map<string, number>();

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcastOnlineList() {
  const inGame = new Set([...socketGames.keys()]);
  const all = [...onlinePlayers.values()];
  for (const viewer of all) {
    send(viewer.socket, {
      type: "online_list",
      // Faqat o'z maktabidagi o'quvchilarni ko'rsatamiz — turli tenant o'quvchilari
      // bir-birining ismi/reytingini ko'rmasligi va o'ynashga taklif qila olmasligi kerak.
      players: all
        .filter((p) => p.tenantId === viewer.tenantId && p.studentId !== viewer.studentId)
        .map((p) => ({ studentId: p.studentId, fullName: p.fullName, elo: p.elo, inGame: inGame.has(p.socket) })),
    });
  }
}

// O'yin faol tomon soati tugashiga qadar bir martalik timeout rejalashtiradi.
// Yurish qilinganda (yoki o'yin boshqa sabab bilan tugaganda) bu timer bekor
// qilinib, yangi qoldiq vaqt uchun qayta rejalashtiriladi.
function scheduleFlagTimer(game: Game) {
  if (game.flagTimer) clearTimeout(game.flagTimer);
  const turn = game.chess.turn();
  const remaining = turn === "w" ? game.whiteMs : game.blackMs;
  game.flagTimer = setTimeout(() => {
    if (!games.has(game.id)) return; // o'yin allaqachon boshqa sabab bilan tugagan
    endGame(game, turn === "w" ? "black_wins_time" : "white_wins_time");
  }, Math.max(0, remaining));
}

function startGame(
  a: { socket: WebSocket; studentId: string; fullName: string; elo: number },
  b: { socket: WebSocket; studentId: string; fullName: string; elo: number },
  tc: string = "5+0",
  tcType: string = "BLITS",
) {
  const id = `${a.studentId}-${b.studentId}-${Date.now()}`;
  const chess = new Chess();
  const { totalMs, incrementMs } = tcToMs(tc);
  const game: Game = {
    id, chess, white: a, black: b, tc, tcType,
    whiteMs: totalMs, blackMs: totalMs, incrementMs,
    turnStartedAt: Date.now(), flagTimer: null, disconnectTimers: new Map(),
  };
  games.set(id, game);
  socketGames.set(a.socket, id);
  socketGames.set(b.socket, id);
  studentGames.set(a.studentId, id);
  studentGames.set(b.studentId, id);

  send(a.socket, { type: "matched", color: "w", opponent: b.fullName, opponentElo: b.elo, fen: chess.fen(), tc, tcType, whiteMs: totalMs, blackMs: totalMs });
  send(b.socket, { type: "matched", color: "b", opponent: a.fullName, opponentElo: a.elo, fen: chess.fen(), tc, tcType, whiteMs: totalMs, blackMs: totalMs });
  scheduleFlagTimer(game);
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
    // O'yinlar soni va reyting o'rni shu yerda o'zgaradi — "100 marta
    // shaxmat o'ynadi" va "1-o'ringa chiqdi" yutuqlari faqat shu holatda
    // qo'lga kiritilishi mumkin.
    await checkAchievements(pool, studentId);
  }
}

function endGame(game: Game, reason: string) {
  if (game.flagTimer) clearTimeout(game.flagTimer);
  for (const t of game.disconnectTimers.values()) clearTimeout(t);
  game.disconnectTimers.clear();
  games.delete(game.id);
  socketGames.delete(game.white.socket);
  socketGames.delete(game.black.socket);
  studentGames.delete(game.white.studentId);
  studentGames.delete(game.black.studentId);
  send(game.white.socket, { type: "ended", reason });
  send(game.black.socket, { type: "ended", reason });
  broadcastOnlineList();
  updateElo(game, reason).catch((err) => console.error("ELO update failed", err));
}

function tryMatch() {
  // Faqat bitta maktab (tenant) ichidagi o'quvchilarni moslashtiramiz.
  for (const tenantId of new Set(queue.map((p) => p.tenantId))) {
    let bucket = queue.filter((p) => p.tenantId === tenantId);
    while (bucket.length >= 2) {
      const a = bucket.shift()!;
      const b = bucket.shift()!;
      const removeFromQueue = (p: QueuedPlayer) => {
        const idx = queue.findIndex((q) => q.socket === p.socket);
        if (idx !== -1) queue.splice(idx, 1);
      };
      if (a.socket.readyState !== a.socket.OPEN) { removeFromQueue(a); continue; }
      if (b.socket.readyState !== b.socket.OPEN) { removeFromQueue(b); continue; }
      removeFromQueue(a);
      removeFromQueue(b);
      startGame(a, b);
    }
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
    const { opponentName, result, difficulty, unbeatable } = request.body as {
      opponentName: string;
      result: "win" | "draw" | "loss";
      difficulty: number;
      unbeatable?: boolean;
    };

    if (!opponentName || !["win", "draw", "loss"].includes(result) || typeof difficulty !== "number") {
      return reply.code(400).send({ error: "invalid params" });
    }

    const payload = request.user as { sub: string };
    const { rows: sRows } = await pool.query(
      `SELECT s.id FROM students s JOIN users u ON u.id = s.user_id WHERE u.id = $1`,
      [payload.sub]
    );
    const studentId: string | undefined = sRows[0]?.id;
    if (!studentId) return reply.code(404).send({ error: "student not found" });

    // Kunlik limit — skript orqali natijalarni takroran yuborib ELO'ni sun'iy
    // oshirishning oldini olish uchun.
    const DAILY_GAME_LIMIT = 40;
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS n FROM game_results WHERE student_id = $1 AND played_at >= date_trunc('day', now())`,
      [studentId]
    );
    if (countRows[0].n >= DAILY_GAME_LIMIT) {
      return reply.code(429).send({ error: "Bugungi o'yinlar limiti tugadi, ertaga qaytadan urinib ko'ring" });
    }

    const { rows: xpRows } = await pool.query(
      `SELECT elo FROM student_xp WHERE student_id = $1`,
      [studentId]
    );
    const myElo = xpRows[0]?.elo ?? 1200;
    const oppElo = computerOpponentElo(difficulty, unbeatable);

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
    await checkAchievements(pool, studentId);

    return reply.send({ newElo, eloChange });
  });

  /* ── Computer move ────────────────────────────────────────────────────── */
  app.post("/pvp/computer-move", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { fen, difficulty, unbeatable } = request.body as {
      fen: string; difficulty: number; unbeatable?: boolean;
    };
    if (!fen || typeof fen !== "string") return reply.code(400).send({ error: "fen required" });

    let chess: Chess;
    try { chess = new Chess(fen); } catch { return reply.code(400).send({ error: "invalid fen" }); }
    if (chess.isGameOver()) return reply.send({ move: null, gameOver: true });

    const userId = request.user.sub;
    const active = activeEngineCalls.get(userId) ?? 0;
    if (active >= MAX_CONCURRENT_ENGINE_CALLS_PER_USER) {
      return reply.code(429).send({ error: "Juda ko'p parallel so'rov, birozdan keyin urinib ko'ring" });
    }
    activeEngineCalls.set(userId, active + 1);

    try {
      const skillLevel = unbeatable ? 20 : difficultyToSkill(difficulty ?? 5);
      const movetime = unbeatable ? 3000 : Math.min(200 + difficulty * 80, 1200);
      const move = await getComputerMove(fen, skillLevel, movetime);
      return reply.send({ move });
    } finally {
      const remaining = (activeEngineCalls.get(userId) ?? 1) - 1;
      if (remaining <= 0) activeEngineCalls.delete(userId);
      else activeEngineCalls.set(userId, remaining);
    }
  });

  /* ── WebSocket PvP ────────────────────────────────────────────────────── */
  // Auth token travels as the first WS message (not a URL query param) so it never
  // ends up in proxy access logs or browser history.
  app.get("/ws/pvp", { websocket: true }, async (socket) => {
    const payload = await new Promise<JwtPayload | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      socket.once("message", (raw) => {
        clearTimeout(timeout);
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type !== "auth" || typeof msg.token !== "string") return resolve(null);
          resolve(app.jwt.verify<JwtPayload>(msg.token));
        } catch {
          resolve(null);
        }
      });
    });
    if (!payload) { socket.close(4001, "Unauthorized"); return; }

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

    const tenantId = payload.tenantId!;

    // Add to lobby (not queue)
    onlinePlayers.set(socket, { socket, studentId: student.studentId, fullName: student.fullName, elo: student.elo, tenantId });
    send(socket, { type: "connected", myElo: student.elo });

    // Qayta ulanish: bu o'quvchining hali tugamagan o'yini bo'lsa (sahifa
    // yangilandi yoki tarmoq qisqa uzildi), yangi socket'ni o'sha o'yinga
    // qayta ulaymiz — mag'lubiyat-taymer bo'lsa bekor qilinadi.
    const activeGameId = studentGames.get(student.studentId);
    if (activeGameId && games.has(activeGameId)) {
      const game = games.get(activeGameId)!;
      const isWhite = game.white.studentId === student.studentId;
      const me = isWhite ? game.white : game.black;
      const opponent = isWhite ? game.black : game.white;
      me.socket = socket;
      socketGames.set(socket, activeGameId);

      const myColor: "w" | "b" = isWhite ? "w" : "b";
      const pendingTimer = game.disconnectTimers.get(myColor);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        game.disconnectTimers.delete(myColor);
        send(opponent.socket, { type: "opponent_reconnected" });
      }

      send(socket, {
        type: "resume",
        color: myColor,
        opponent: opponent.fullName, opponentElo: opponent.elo,
        fen: game.chess.fen(), turn: game.chess.turn(),
        tc: game.tc, tcType: game.tcType,
        whiteMs: game.whiteMs, blackMs: game.blackMs,
        moves: game.chess.history({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`),
      });
    }

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
          queue.push({ socket, studentId: student.studentId, fullName: student.fullName, elo: student.elo, tenantId });
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
        if (!target || !me || target.tenantId !== me.tenantId || socketGames.has(target.socket) || socketGames.has(socket)) return;

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

        // Soat — real o'tgan vaqtni yurgan tomonning hisobidan ayiramiz, keyin
        // shu tomonga inkrementni qo'shamiz (standart shaxmat soat mantiqi).
        const now = Date.now();
        const elapsed = now - game.turnStartedAt;
        if (myColor === "w") game.whiteMs = Math.max(0, game.whiteMs - elapsed) + game.incrementMs;
        else game.blackMs = Math.max(0, game.blackMs - elapsed) + game.incrementMs;
        game.turnStartedAt = now;

        const status = gameStatus(game.chess);
        const update = {
          type: "move", from: msg.from, to: msg.to, fen: game.chess.fen(), turn: game.chess.turn(),
          whiteMs: game.whiteMs, blackMs: game.blackMs, ...status,
        };
        send(game.white.socket, update);
        send(game.black.socket, update);

        if (status.gameOver) {
          endGame(game, status.result!);
        } else {
          scheduleFlagTimer(game);
        }
        return;
      }

      if (msg.type === "resign") {
        const isWhite = game.white.socket === socket;
        endGame(game, isWhite ? "black_wins_resign" : "white_wins_resign");
      }
    });

    socket.on("close", (code: number) => {
      const idx = queue.findIndex((p) => p.socket === socket);
      if (idx !== -1) queue.splice(idx, 1);

      onlinePlayers.delete(socket);

      for (const [key, challenge] of challenges) {
        if (challenge.fromSocket === socket || student.studentId === challenge.toStudentId) {
          challenges.delete(key);
        }
      }

      // Kod 4000 — shu o'quvchi YANGI socket bilan qayta ulandi (masalan sahifa
      // yangilandi), va yangi ulanish yuqorida allaqachon o'yinga qayta
      // biriktirildi. Bu eski socket shunchaki keksa — o'yinni tugatmaymiz.
      if (code === 4000) { broadcastOnlineList(); return; }

      const gameId = socketGames.get(socket);
      socketGames.delete(socket);
      if (!gameId) { broadcastOnlineList(); return; }
      const game = games.get(gameId);
      // Bu socket boshqa (qayta ulangan) socket bilan allaqachon almashtirilgan
      // bo'lishi mumkin — bu holda o'yinni tugatmaymiz.
      if (!game || (game.white.socket !== socket && game.black.socket !== socket)) {
        broadcastOnlineList();
        return;
      }

      const isWhite = game.white.socket === socket;
      const myColor: "w" | "b" = isWhite ? "w" : "b";
      const opponentSocket = isWhite ? game.black.socket : game.white.socket;

      send(opponentSocket, { type: "opponent_disconnected_grace", seconds: RECONNECT_GRACE_SECONDS });

      // Darhol mag'lubiyat yozmaymiz — qayta ulanish uchun muddat beramiz.
      // Muddat ichida qaytmasa (yuqoridagi qayta-ulanish bloki timer'ni bekor
      // qiladi), mag'lubiyat sifatida yozamiz va ELO yangilanadi.
      const timer = setTimeout(() => {
        game.disconnectTimers.delete(myColor);
        if (!games.has(game.id)) return;
        endGame(game, myColor === "w" ? "black_wins_disconnect" : "white_wins_disconnect");
      }, RECONNECT_GRACE_SECONDS * 1000);
      game.disconnectTimers.set(myColor, timer);

      broadcastOnlineList();
    });
  });
}
