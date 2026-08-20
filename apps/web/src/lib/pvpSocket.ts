import { useEffect, useState } from "react";
import { useAuthStore } from "./auth-store.js";
import { queryClient } from "./queryClient.js";

// O'yin (real raqib bilan) tugaganda ELO serverda yangilanadi, lekin bu
// modul React Query'dan mustaqil (WebSocket orqali ishlaydi) — shu sabab
// natija kelganda tegishli so'rovlarni qo'lda eskirgan deb belgilaymiz,
// aks holda "Reyting" sahifasi va profil sahifadan chiqib-kirmaguncha
// eski (masalan 1200) qiymatni ko'rsatib turaverardi.
function invalidatePvpResultQueries() {
  queryClient.invalidateQueries({ queryKey: ["myXp"] });
  queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  queryClient.invalidateQueries({ queryKey: ["eloHistory"] });
  queryClient.invalidateQueries({ queryKey: ["gameStats"] });
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface OnlinePlayer { studentId: string; fullName: string; elo: number; avatarUrl: string | null; inGame: boolean; }
export interface IncomingChallenge { fromStudentId: string; fromName: string; fromElo: number; tc: string; tcType: string; }
export type PvpStatus = "disconnected" | "connecting" | "lobby" | "queued" | "playing" | "finished";

interface PvpState {
  status: PvpStatus;
  myElo: number;
  onlinePlayers: OnlinePlayer[];
  incomingChallenge: IncomingChallenge | null;
  challengeSent: string | null;
  color: "w" | "b" | null;
  opponent: string | null;
  opponentElo: number;
  opponentAvatarUrl: string | null;
  opponentXp: number;
  fen: string;
  gameTc: string | null;
  gameTcType: string | null;
  moves: string[];
  turn: "w" | "b";
  mySeconds: number;
  opSeconds: number;
  result: string | null;
  error: string | null;
  // Raqib ulanishi uzilganda "N soniya ichida qaytmasa yutasiz" bannerini
  // ko'rsatish uchun — soatning o'zi serverda davom etadi.
  opponentDisconnected: boolean;
  // Durang taklifi — men taklif qilganim yoki raqib menga taklif qilgani.
  drawOfferSent: boolean;
  drawOffered: boolean;
}

function initialState(): PvpState {
  return {
    status: "disconnected", myElo: 1200, onlinePlayers: [], incomingChallenge: null, challengeSent: null,
    color: null, opponent: null, opponentElo: 1200, opponentAvatarUrl: null, opponentXp: 0,
    fen: START_FEN, gameTc: null, gameTcType: null,
    moves: [], turn: "w", mySeconds: 300, opSeconds: 300, result: null, error: null,
    opponentDisconnected: false, drawOfferSent: false, drawOffered: false,
  };
}

let state: PvpState = initialState();
let ws: WebSocket | null = null;
let generation = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit() { for (const l of listeners) l(); }
function setState(patch: Partial<PvpState>) { state = { ...state, ...patch }; emit(); }

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// Bu faqat soniyama-soniya vizual sanoq uchun — soatni tugatish (flag)
// qarori serverda qabul qilinadi (har bir yurishda serverdan kelgan
// whiteMs/blackMs bilan sinxronlanadi), shuning uchun bu yerda 0 ga
// yetganda resign() chaqirilmaydi — mijoz sekinlashgan/fon tabda bo'lsa ham
// noto'g'ri natija yozilmaydi.
function ensureTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (state.status !== "playing") { stopTimer(); return; }
    const isMyTurn = state.turn === state.color;
    if (isMyTurn) {
      setState({ mySeconds: Math.max(0, state.mySeconds - 1) });
    } else {
      setState({ opSeconds: Math.max(0, state.opSeconds - 1) });
    }
  }, 1000);
}

function msToSeconds(ms: number): number {
  return Math.max(0, Math.round(ms / 1000));
}

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/v1/ws/pvp`;
}

function connect(token: string) {
  if (ws && ws.readyState <= 1) return; // already connecting/open
  const myGeneration = ++generation;
  setState({ status: "connecting" });
  const socket = new WebSocket(wsUrl());
  ws = socket;

  socket.onopen = () => {
    if (generation !== myGeneration) return;
    socket.send(JSON.stringify({ type: "auth", token }));
  };
  socket.onerror = () => {
    if (generation !== myGeneration) return;
    setState({ error: "Ulanishda xatolik", status: "disconnected" });
  };
  socket.onclose = () => {
    if (generation !== myGeneration) return;
    stopTimer();
    setState({ onlinePlayers: [], status: state.status === "playing" ? "finished" : "disconnected" });
    reconnectTimer = setTimeout(() => {
      const currentToken = useAuthStore.getState().accessToken;
      if (currentToken) connect(currentToken);
    }, 4000);
  };

  socket.onmessage = (event) => {
    if (generation !== myGeneration) return;
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case "connected":
        setState({ myElo: (msg.myElo as number) ?? 1200, status: "lobby" });
        break;
      case "online_list":
        setState({ onlinePlayers: (msg.players as OnlinePlayer[]) ?? [] });
        break;
      case "queued":
        setState({ status: "queued" });
        break;
      case "left_queue":
        setState({ status: "lobby" });
        break;
      case "challenge_received":
        setState({
          incomingChallenge: {
            fromStudentId: msg.fromStudentId as string,
            fromName: msg.fromName as string,
            fromElo: (msg.fromElo as number) ?? 1200,
            tc: (msg.tc as string) ?? "5+0",
            tcType: (msg.tcType as string) ?? "BLITS",
          },
        });
        break;
      case "challenge_accepted":
        setState({ challengeSent: null });
        break;
      case "challenge_declined":
        setState({ challengeSent: null, error: `${msg.byName as string} taklifni rad etdi` });
        setTimeout(() => setState({ error: null }), 3000);
        break;
      case "matched": {
        const color = msg.color as "w" | "b";
        const whiteMs = (msg.whiteMs as number) ?? 300_000;
        const blackMs = (msg.blackMs as number) ?? 300_000;
        setState({
          incomingChallenge: null, challengeSent: null,
          color, opponent: (msg.opponent as string) ?? null,
          opponentElo: (msg.opponentElo as number) ?? 1200,
          opponentAvatarUrl: (msg.opponentAvatarUrl as string) ?? null,
          opponentXp: (msg.opponentXp as number) ?? 0,
          fen: (msg.fen as string) ?? START_FEN,
          gameTc: (msg.tc as string) ?? null, gameTcType: (msg.tcType as string) ?? null,
          status: "playing", result: null, error: null, moves: [], turn: "w",
          opponentDisconnected: false, drawOfferSent: false, drawOffered: false,
          mySeconds: msToSeconds(color === "w" ? whiteMs : blackMs),
          opSeconds: msToSeconds(color === "w" ? blackMs : whiteMs),
        });
        ensureTimer();
        break;
      }
      // Sahifa yangilandi yoki tarmoq qisqa uzilgandan keyin serverga qayta
      // ulanilganda, agar o'yin hali davom etayotgan bo'lsa shu xabar keladi —
      // butun holatni (yurishlar, soat) serverdan qayta tiklaymiz.
      case "resume": {
        const color = msg.color as "w" | "b";
        const whiteMs = (msg.whiteMs as number) ?? 300_000;
        const blackMs = (msg.blackMs as number) ?? 300_000;
        setState({
          color, opponent: (msg.opponent as string) ?? null,
          opponentElo: (msg.opponentElo as number) ?? 1200,
          opponentAvatarUrl: (msg.opponentAvatarUrl as string) ?? null,
          opponentXp: (msg.opponentXp as number) ?? 0,
          fen: (msg.fen as string) ?? START_FEN,
          gameTc: (msg.tc as string) ?? null, gameTcType: (msg.tcType as string) ?? null,
          status: "playing", result: null, error: null,
          moves: (msg.moves as string[]) ?? [], turn: (msg.turn as "w" | "b") ?? "w",
          opponentDisconnected: false, drawOfferSent: false, drawOffered: false,
          mySeconds: msToSeconds(color === "w" ? whiteMs : blackMs),
          opSeconds: msToSeconds(color === "w" ? blackMs : whiteMs),
        });
        ensureTimer();
        break;
      }
      case "draw_offered":
        setState({ drawOffered: true });
        break;
      case "draw_declined":
        setState({ drawOfferSent: false, error: "Raqib durangni rad etdi" });
        setTimeout(() => setState({ error: null }), 3000);
        break;
      case "opponent_disconnected_grace":
        setState({ opponentDisconnected: true });
        break;
      case "opponent_reconnected":
        setState({ opponentDisconnected: false });
        break;
      case "move": {
        const gameOver = !!msg.gameOver;
        const whiteMs = msg.whiteMs as number | undefined;
        const blackMs = msg.blackMs as number | undefined;
        const clockPatch = whiteMs !== undefined && blackMs !== undefined
          ? {
              mySeconds: msToSeconds(state.color === "w" ? whiteMs : blackMs),
              opSeconds: msToSeconds(state.color === "w" ? blackMs : whiteMs),
            }
          : {};
        setState({
          fen: msg.fen as string, turn: (msg.turn as "w" | "b") ?? "w",
          moves: [...state.moves, `${msg.from as string}${msg.to as string}`],
          drawOfferSent: false, drawOffered: false,
          ...clockPatch,
          ...(gameOver ? { result: msg.result as string, status: "finished" as PvpStatus } : {}),
        });
        if (gameOver) { stopTimer(); invalidatePvpResultQueries(); }
        break;
      }
      case "ended":
        stopTimer();
        setState({ result: msg.reason as string, status: "finished", opponentDisconnected: false });
        invalidatePvpResultQueries();
        break;
      case "error":
        setState({ error: msg.message as string });
        break;
    }
  };
}

export function joinQueue() {
  ws?.send(JSON.stringify({ type: "join_queue" }));
}

export function leaveQueue() {
  ws?.send(JSON.stringify({ type: "leave_queue" }));
}

export function sendChallenge(targetStudentId: string, tc: string, tcType: string) {
  setState({ challengeSent: targetStudentId });
  ws?.send(JSON.stringify({ type: "challenge", targetStudentId, tc, tcType }));
}

export function respondChallenge(accept: boolean) {
  if (!state.incomingChallenge) return;
  ws?.send(JSON.stringify({
    type: accept ? "challenge_accept" : "challenge_decline",
    fromStudentId: state.incomingChallenge.fromStudentId,
  }));
  setState({ incomingChallenge: null });
}

export function dismissIncomingChallenge() {
  setState({ incomingChallenge: null });
}

export function handleMove(from: string, to: string, promotion: "q" | "r" | "b" | "n" = "q") {
  setState({ error: null });
  ws?.send(JSON.stringify({ type: "move", from, to, promotion }));
}

export function resign() {
  ws?.send(JSON.stringify({ type: "resign" }));
}

export function offerDraw() {
  setState({ drawOfferSent: true });
  ws?.send(JSON.stringify({ type: "draw_offer" }));
}

export function respondDraw(accept: boolean) {
  setState({ drawOffered: false });
  ws?.send(JSON.stringify({ type: accept ? "draw_accept" : "draw_decline" }));
}

export function playAgain() {
  setState({
    fen: START_FEN, color: null, opponent: null, result: null, error: null, moves: [], status: "lobby",
  });
}

export function reconnectPvp() {
  const token = useAuthStore.getState().accessToken;
  if (token) connect(token);
}

/** Bu hook chaqirilgan joydan qat'i nazar bitta umumiy PvP ulanishini ta'minlaydi —
 *  ulanish student sessiyasi davomida saqlanadi (sahifalar orasida uzilmaydi), shu
 *  bilan boshqa o'quvchi istalgan paytda (PvP sahifasida bo'lmasa ham) chaqiruv
 *  yubora oladi va bu darhol topbar'da ko'rinadi. */
export function usePvpSocket(enabled: boolean = true) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  useEffect(() => {
    // Faqat student rolida ulanamiz — server boshqa rollarni 4003 bilan rad etadi,
    // shu tufayli cheksiz qayta-ulanish tsiklini oldini olish uchun umuman urinmaymiz.
    if (!enabled || !accessToken) return;
    connect(accessToken);
    // Ataylab ulanishni uzmaymiz — sahifa o'zgarganda ham chaqiruvlarni qabul qilishda davom etishi kerak.
  }, [enabled, accessToken]);

  return {
    ...state,
    joinQueue, leaveQueue, sendChallenge, respondChallenge, dismissIncomingChallenge,
    handleMove, resign, offerDraw, respondDraw, playAgain, reconnect: reconnectPvp,
  };
}
