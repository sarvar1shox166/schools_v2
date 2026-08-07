import { useState, useEffect, useRef, useMemo } from "react";
import { parseFen } from "chessops/fen";
import { Chess } from "chessops/chess";
import { makeSanAndPlay } from "chessops/san";
import { parseSquare, makeSquare } from "chessops/util";
import { boardEquals } from "chessops/board";
import type { Square } from "chessops/types";
import {
  useAttemptPuzzle, usePuzzleHint, usePuzzleStats, useFetchRandomPuzzle, usePuzzleSectionCounts,
  useRevealSolution, type PuzzleSection, type Puzzle,
} from "../../lib/queries.js";
import { PuzzleBoard } from "../../components/PuzzleBoard.js";
import { PromotionModal } from "../../components/PromotionModal.js";
import { isPromotionMove, pieceAt } from "../../lib/chessMaterial.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

/* ── Sections ────────────────────────────────────────────────────────────── */
interface SectionMeta { id: PuzzleSection; title: string; desc: string; color: string; locked?: boolean; }
const SECTIONS: SectionMeta[] = [
  { id:"mot1", title:"1 xodlik motlar",   desc:"Bitta yurishda mot qiling",     color:"#22c55e" },
  { id:"mot2", title:"2 xodlik motlar",   desc:"Ikkita yurishda mot qiling",    color:"#3b82f6" },
  { id:"mot3", title:"3 xodlik motlar",   desc:"Uchta yurishda mot qiling",     color:"#f59e0b" },
  { id:"mot4", title:"4 xodlik motlar",   desc:"To'rtta yurishda mot qiling",   color:"#ec4899" },
  { id:"mot5", title:"5 xodlik motlar",   desc:"Beshta yurishda mot qiling",    color:"#f87171" },
];

const DIFFICULTY_LABEL: Record<string, string> = { hammasi: "Hammasi", oson: "Oson", orta: "O'rta", qiyin: "Qiyin" };

function DifficultyIcon({ level, color }: { level: number; color: string }) {
  const bars = [{ h: 8 }, { h: 12 }, { h: 16 }, { h: 20 }];
  return (
    <svg width="22" height="22" viewBox="0 0 26 24" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={2 + i * 6} y={22 - b.h} width={4} height={b.h} rx={1.5} fill={i < level ? color : "#33333a"} />
      ))}
    </svg>
  );
}
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const CrownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#facc15"><path d="M2 18h20l-1.5-9-4.5 3-4-6-4 6-4.5-3z" /></svg>
);

/* ── Responsive hook ─────────────────────────────────────────────────────── */
// Desktop ko'rinishda ikkita fixed-kenglik panel bor (250px + 280px = 530px) —
// taxtaga yetarli joy qolishi uchun oddiy mobil chegaradan (768px) kengroq
// nuqtada stacked (mobil) ko'rinishga o'tkazamiz, aks holda planshetlarda
// (768-1000px) taxta siqilib qoladi.
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1000);
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 1000);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return narrow;
}

/* ── chessops yordamchilari (yurishlar tarixi uchun) ────────────────────── */
function findReplyMove(pos: Chess, targetFen: string): { from: Square; to: Square; promotion?: "queen"|"rook"|"bishop"|"knight" } | null {
  let targetSetup;
  try { targetSetup = parseFen(targetFen).unwrap(); } catch { return null; }
  const promotions: ("queen"|"rook"|"bishop"|"knight")[] = ["queen", "rook", "bishop", "knight"];
  for (const [from, tos] of pos.allDests()) {
    for (const to of tos) {
      for (const promotion of [undefined, ...promotions]) {
        const clone = pos.clone();
        try {
          clone.play({ from, to, promotion });
        } catch { continue; }
        if (boardEquals(clone.board, targetSetup.board)) return { from, to, promotion };
        if (promotion === undefined) continue; // faqat piyoda oxirgi qatorga yetganda promotionlarni sinab ko'ramiz, aks holda keyingi to'ga o'tamiz
      }
    }
  }
  return null;
}

/** Chessground/chessops rokirovkani "shoh → o'z roki katagi" (masalan e1h1)
 *  ko'rinishida ham taklif qiladi (Lichess uslubi), lekin server tomondagi
 *  chess.js faqat standart UCI (e1g1/e1c1) ni qabul qiladi — shu yerda
 *  normalizatsiya qilamiz. Shoh o'z rokini "olishi" oddiy shaxmatda mumkin
 *  emas, shuning uchun bu holat bir ma'noli rokirovka belgisi. */
function normalizeCastling(fen: string, from: string, to: string): string {
  const moving = pieceAt(fen, from);
  if (!moving || moving.toLowerCase() !== "k") return to;
  const target = pieceAt(fen, to);
  if (!target || target.toLowerCase() !== "r") return to;
  const sameColor = (moving === moving.toUpperCase()) === (target === target.toUpperCase());
  if (!sameColor) return to;
  const kingFile = from.charCodeAt(0);
  const rookFile = to.charCodeAt(0);
  return (rookFile > kingFile ? "g" : "c") + from[1];
}

interface MovePair { num: number; white?: string; black?: string }
function buildPairs(sanList: string[], startFullmove: number, startTurn: "w" | "b"): MovePair[] {
  const pairs: MovePair[] = [];
  let num = startFullmove;
  let turn = startTurn;
  for (const san of sanList) {
    if (turn === "w") {
      pairs.push({ num, white: san });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && last.num === num && last.black === undefined) last.black = san;
      else pairs.push({ num, black: san });
      num++;
    }
    turn = turn === "w" ? "b" : "w";
  }
  return pairs;
}

/* ── Chap panel: statistika ──────────────────────────────────────────────── */
function StatsPanel({ correct, wrong, accuracy }: { correct:number; wrong:number; accuracy:number }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#f5f5f6", marginBottom: 14 }}>
        Masala statistikasi
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 12, padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckIcon />
            <span style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 700, letterSpacing: "0.03em" }}>TO'G'RI</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80", lineHeight: 1, marginTop: 8 }}>{correct}</div>
        </div>
        <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 12, padding: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CrossIcon />
            <span style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700, letterSpacing: "0.03em" }}>XATO</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f87171", lineHeight: 1, marginTop: 8 }}>{wrong}</div>
        </div>
      </div>
      <div style={{ height: 6, background: "#232328", borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 8 }}>
        <div style={{ width: `${accuracy}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, color: "#8b8d98", fontWeight: 500 }}>Aniqlik</span>
        <span style={{ fontSize: 12.5, color: "#4ade80", fontWeight: 800 }}>{accuracy}%</span>
      </div>
    </div>
  );
}

/* ── Chap panel: masala ma'lumoti (reyting, qiyinlik filtri) ─────────────── */
function PuzzleInfoCard({ puzzle, difficultyFilter, onDifficultyChange, autoAdvance, onAutoAdvanceChange }: {
  puzzle: Puzzle | null;
  difficultyFilter: string;
  onDifficultyChange: (v: string) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
}) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <CrownIcon />
        <span style={{ fontSize: 22, fontWeight: 900, color: "#facc15" }}>{puzzle?.rating ?? "—"}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "#8b8d98", fontWeight: 500, marginBottom: 14 }}>
        {puzzle ? `${puzzle.attemptCount} marta yechilgan` : ""}
      </div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8b8d98", letterSpacing: "0.04em", marginBottom: 6 }}>
        QIYINLIK DARAJASI
      </label>
      <select
        value={difficultyFilter}
        onChange={(e) => onDifficultyChange(e.target.value)}
        style={{
          width: "100%", background: "#18181c", border: `1px solid ${CARD_BORDER}`, color: "#f5f5f6",
          borderRadius: 10, padding: "9px 10px", fontSize: 13.5, fontWeight: 600, marginBottom: 14,
        }}
      >
        {Object.entries(DIFFICULTY_LABEL).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#c7c8d0", cursor: "pointer" }}>
        <input type="checkbox" checked={autoAdvance} onChange={(e) => onAutoAdvanceChange(e.target.checked)} />
        Keyingi masalaga darhol o'tish
      </label>
    </div>
  );
}

/* ── O'ng panel: yurishlar tarixi ─────────────────────────────────────────── */
function MoveListPanel({ pairs, puzzleLabel }: { pairs: MovePair[]; puzzleLabel: string }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#8b8d98", letterSpacing: "0.04em" }}>{puzzleLabel}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
        {pairs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#65666f" }}>Hali yurish qilinmagan</div>
        ) : (
          pairs.map((p) => (
            <div key={p.num} style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr", gap: 8, fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "#65666f", fontWeight: 700 }}>{p.num}.</span>
              <span style={{ color: "#f5f5f6", fontWeight: 600 }}>{p.white ?? ""}</span>
              <span style={{ color: "#c7c8d0", fontWeight: 600 }}>{p.black ?? ""}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Markaziy ustun: masala ───────────────────────────────────────────────── */
function PuzzleCenter({ section, puzzle, isLoading, notFound, autoAdvance, showMoveList, onNext }: {
  section: SectionMeta;
  puzzle: Puzzle | null;
  isLoading: boolean;
  notFound: boolean;
  autoAdvance: boolean;
  showMoveList: boolean;
  onNext: () => void;
}) {
  const attempt = useAttemptPuzzle();
  const hint = usePuzzleHint();
  const reveal = useRevealSolution();
  const [feedback, setFeedback] = useState<string|null>(null);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hintSquare, setHintSquare] = useState<string|undefined>(undefined);
  const [fen, setFen] = useState<string|null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [sanList, setSanList] = useState<string[]>([]);
  const [revertKey, setRevertKey] = useState(0);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const posRef = useRef<Chess | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFen = fen ?? puzzle?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // O'quvchining o'zi qaysi rangda o'ynayotgani — masalaning BOSHLANG'ICH
  // FEN'idan bir marta olinadi, `activeFen`dan emas. `activeFen`ning navbat
  // maydoni har yurishda (hatto mot qo'yilgan zumda ham, chunki keyingi
  // "navbat" endi mag'lub tomonga o'tadi) o'zgaradi — shu FEN'ga qarab
  // aylantirsak, masala yechilgan zahoti taxta noto'g'ri aylanib ketardi.
  const studentFen = puzzle?.fen ?? activeFen;
  const turnColor = studentFen.includes(" b ") ? "b" : "w";

  const isMateSection = section.id === "mot1" || section.id === "mot2";
  const initialMovesRemaining = section.id === "mot1" ? 1 : section.id === "mot2" ? 2 : undefined;
  const [movesRemaining, setMovesRemaining] = useState<number | undefined>(initialMovesRemaining);

  // Har safar masala o'zgarganda (yangi tasodifiy masala kelganda, bo'lim/
  // qiyinlik almashganda yoki "Keyingisi" bosilganda) butun holat va
  // chessops pozitsiyasi boshlang'ich FEN'dan qayta quriladi.
  useEffect(() => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    setFen(null);
    setMoveIndex(0);
    setMovesRemaining(initialMovesRemaining);
    setFeedback(null);
    setSolved(false);
    setRevealed(false);
    setHintSquare(undefined);
    setSanList([]);
    setPendingPromotion(null);
    if (!puzzle) { posRef.current = null; return; }
    try {
      const setup = parseFen(puzzle.fen).unwrap();
      posRef.current = Chess.fromSetup(setup).unwrap();
    } catch {
      posRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  function applyStudentMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n"): string | null {
    if (!posRef.current) return null;
    const promoMap = { q: "queen", r: "rook", b: "bishop", n: "knight" } as const;
    try {
      const san = makeSanAndPlay(posRef.current, {
        from: parseSquare(from)!, to: parseSquare(to)!,
        promotion: promotion ? promoMap[promotion] : undefined,
      });
      return san;
    } catch { return null; }
  }

  function applyReplyMove(targetFen: string): string | null {
    if (!posRef.current) return null;
    const reply = findReplyMove(posRef.current, targetFen);
    if (!reply) return null;
    const san = makeSanAndPlay(posRef.current, reply);
    return san;
  }

  function resetPuzzle() {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    setFen(null);
    setMoveIndex(0);
    setMovesRemaining(initialMovesRemaining);
    setFeedback(null);
    setSolved(false);
    setRevealed(false);
    setHintSquare(undefined);
    setSanList([]);
    setPendingPromotion(null);
  }

  function goNext() {
    resetPuzzle();
    onNext();
  }

  async function handleMove(from: string, to: string) {
    if (solved || !puzzle) return;
    // Rokirovka "shoh → rok" ko'rinishida kelgan bo'lsa standart UCI'ga o'tkazamiz
    to = normalizeCastling(activeFen, from, to);
    // Piyoda oxirgi qatorga yetdi — avval dona tanlatamiz, serverga keyin yuboramiz
    if (isPromotionMove(activeFen, from, to)) {
      setPendingPromotion({ from, to });
      return;
    }
    await submitMove(from, to);
  }

  async function submitMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (solved || !puzzle) return;
    setHintSquare(undefined);
    const uci = `${from}${to}${promotion ?? ""}`;
    const res = await attempt.mutateAsync(
      isMateSection
        ? { puzzleId: puzzle.id, move: uci, fen: activeFen, movesRemaining }
        : { puzzleId: puzzle.id, moveIndex, move: uci }
    );
    if (!res.correct) {
      setFeedback("Noto'g'ri yurish. Yana urinib ko'ring.");
      // Chessground yurishni allaqachon taxtada bajargan (chessops uni
      // qonuniy shaxmat yurishi deb hisoblagani uchun) — noto'g'ri bo'lsa,
      // dona boshlang'ich katagiga qaytishi kerak (Lichess'dagi kabi).
      setRevertKey((k) => k + 1);
      return;
    }
    const studentSan = applyStudentMove(from, to, promotion);
    const newSans = studentSan ? [studentSan] : [];
    setFen(res.fenAfter);
    if (res.finished) {
      if (newSans.length) setSanList((prev) => [...prev, ...newSans]);
      setSolved(true);
      setFeedback(`✅ To'g'ri! +${res.xpAwarded} XP`);
    } else {
      const replySan = applyReplyMove(res.fenAfter);
      if (replySan) newSans.push(replySan);
      if (newSans.length) setSanList((prev) => [...prev, ...newSans]);
      if (isMateSection) setMovesRemaining(res.movesRemaining);
      else setMoveIndex(moveIndex + 2);
      setFeedback("To'g'ri yurish! Davom eting.");
    }
  }

  async function handleHint() {
    if (!puzzle) return;
    const res = await hint.mutateAsync(
      isMateSection
        ? { puzzleId: puzzle.id, fen: activeFen, movesRemaining }
        : { puzzleId: puzzle.id, moveIndex }
    );
    setHintSquare(res.from);
  }

  async function handleReveal() {
    if (!puzzle || solved) return;
    const res = await reveal.mutateAsync(puzzle.id);
    const moves = [...res.moves];
    // Yechim har doim masalaning BOSHIdan yoziladi — o'quvchi allaqachon
    // yurgan (yoki mot bo'limlarida taxta kanonik yo'ldan chetlashgan)
    // bo'lishi mumkin, shuning uchun avval pozitsiyani boshlang'ich FEN'ga
    // qaytaramiz, aks holda yechim yurishlari noqonuniy bo'lib, jimgina
    // yutilib ketar edi (taxta "qotib qolgan"dek ko'rinardi).
    try {
      const setup = parseFen(puzzle.fen).unwrap();
      posRef.current = Chess.fromSetup(setup).unwrap();
    } catch { return; }
    setFen(puzzle.fen);
    setSanList([]);
    setHintSquare(undefined);
    setPendingPromotion(null);
    // Ko'rsatish davomida taxta qulflanadi (solved → disabled) va XP ham,
    // avto-o'tish ham bo'lmaydi (revealed guard).
    setSolved(true);
    setRevealed(true);
    setFeedback("👁️ Yechim ko'rsatilmoqda...");
    revealTimerRef.current = setInterval(() => {
      const uci = moves.shift();
      if (!uci || !posRef.current) {
        if (revealTimerRef.current) clearInterval(revealTimerRef.current);
        setFeedback("👁️ Yechim ko'rsatildi");
        return;
      }
      const from = uci.slice(0, 2), to = uci.slice(2, 4);
      const promotionChar = uci.length > 4 ? uci.slice(4) : undefined;
      const promoMap: Record<string, "queen"|"rook"|"bishop"|"knight"> = { q: "queen", r: "rook", b: "bishop", n: "knight" };
      try {
        const san = makeSanAndPlay(posRef.current, {
          from: parseSquare(from)!, to: parseSquare(to)!,
          promotion: promotionChar ? promoMap[promotionChar] : undefined,
        });
        setSanList((prev) => [...prev, san]);
        setFen(fenFromPos(posRef.current));
      } catch { /* ignore */ }
    }, 650);
  }

  function fenFromPos(pos: Chess): string {
    // Faqat joylashuv qismini quramiz — PuzzleBoard shu qismini ishlatadi.
    const parts: string[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      let empty = 0;
      let row = "";
      for (let file = 0; file < 8; file++) {
        const sq = rank * 8 + file;
        const piece = pos.board.get(sq as Square);
        if (!piece) { empty++; continue; }
        if (empty > 0) { row += empty; empty = 0; }
        const letters: Record<string, string> = { pawn: "p", knight: "n", bishop: "b", rook: "r", queen: "q", king: "k" };
        const letter = letters[piece.role];
        row += piece.color === "white" ? letter.toUpperCase() : letter;
      }
      if (empty > 0) row += empty;
      parts.push(row);
    }
    return `${parts.join("/")} ${pos.turn === "white" ? "w" : "b"} - - 0 1`;
  }

  useEffect(() => () => { if (revealTimerRef.current) clearInterval(revealTimerRef.current); }, []);

  // Avtomatik keyingisiga o'tish
  useEffect(() => {
    if (!solved || !autoAdvance || revealed) return;
    const t = setTimeout(() => goNext(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, autoAdvance, revealed]);

  const startFullmove = puzzle ? Number(puzzle.fen.split(" ")[5] ?? 1) : 1;
  const startTurn: "w" | "b" = puzzle ? (puzzle.fen.split(" ")[1] === "b" ? "b" : "w") : "w";
  const pairs = useMemo(() => buildPairs(sanList, startFullmove, startTurn), [sanList, startFullmove, startTurn]);

  // Bu bo'lim/qiyinlik kombinatsiyasida masala topilmadi
  if (!isLoading && notFound) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:12, padding:"60px 20px",
        background: CARD_BG, borderRadius:18, border:`1px solid ${CARD_BORDER}` }}>
        <div style={{ fontSize:48 }}>🧩</div>
        <div style={{ fontWeight:700, fontSize:16, color:"rgba(255,255,255,.7)" }}>Bu bo'limda masalalar yo'q</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", textAlign:"center" }}>
          Tanlangan qiyinlik darajasida masala topilmadi
        </div>
      </div>
    );
  }

  const puzzleLabel = puzzle
    ? SECTIONS.find((s) => s.id === puzzle.section)?.title ?? section.title
    : section.title;

  return (
    <div style={{ display: "grid", gridTemplateColumns: showMoveList ? "1fr 280px" : "1fr", gap: 20, alignItems: "start" }}>
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${section.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DifficultyIcon level={SECTIONS.findIndex((s) => s.id === section.id) + 1} color={section.color} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>{section.title}</div>
            </div>
          </div>
        </div>

        {/* Board */}
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, padding: 14, boxShadow: "0 16px 46px rgba(0,0,0,.5)" }}>
          {isLoading ? (
            <div style={{ aspectRatio:"1", background:"rgba(255,255,255,.05)", borderRadius:12,
              display:"grid", placeItems:"center", color:"rgba(255,255,255,.3)", fontSize:14 }}>
              Yuklanmoqda...
            </div>
          ) : puzzle ? (
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <PuzzleBoard
                fen={activeFen}
                onMove={handleMove}
                disabled={solved}
                hintSquare={hintSquare}
                revertKey={revertKey}
                orientation={turnColor === "b" ? "black" : "white"}
              />
            </div>
          ) : null}
        </div>

        {/* Piyoda aylantirish (promotion) tanlovi */}
        {pendingPromotion && (
          <PromotionModal
            color={turnColor}
            onPick={(piece) => {
              const { from, to } = pendingPromotion;
              setPendingPromotion(null);
              submitMove(from, to, piece);
            }}
            onCancel={() => {
              setPendingPromotion(null);
              setRevertKey((k) => k + 1);
            }}
          />
        )}

        {/* "Siz yurasiz" ko'rsatma qutisi */}
        {puzzle && !solved && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "12px 16px" }}>
            <CrownIcon />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f5f5f6" }}>
              {turnColor === "w" ? "Siz oq bo'lib yurasiz" : "Siz qora bo'lib yurasiz"} — eng yaxshi yurishni toping
            </div>
          </div>
        )}

        {feedback && (
          <div style={{ marginTop:10, fontSize:13, fontWeight:700,
            color: feedback.startsWith("✅") ? "#4ade80" : (feedback.startsWith("Noto") ? "#f87171" : "#60a5fa"),
            textAlign:"center" }}>
            {feedback}
          </div>
        )}

        {/* Havolalar */}
        {puzzle && !solved && (
          <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
            <span onClick={handleHint} style={{ fontSize: 12.5, color: "#60a5fa", cursor: "pointer", fontWeight: 600 }}>💡 Yordam olish</span>
            <span onClick={handleReveal} style={{ fontSize: 12.5, color: "#a3a4ad", cursor: "pointer", fontWeight: 600 }}>👁️ Yechimni ko'rish</span>
          </div>
        )}

        {/* Keyingisi tugmasi */}
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          <div onClick={goNext}
            style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", fontSize:14.5, fontWeight:800, padding:13, borderRadius:11, cursor:"pointer",
              boxShadow: "0 6px 18px rgba(34,197,94,.25)" }}>
            Keyingisi →
          </div>
        </div>

        {!showMoveList && (
          <div style={{ marginTop: 16 }}>
            <MoveListPanel pairs={pairs} puzzleLabel={puzzleLabel} />
          </div>
        )}
      </div>

      {showMoveList && <MoveListPanel pairs={pairs} puzzleLabel={puzzleLabel} />}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PuzzlesPage() {
  const [activeSection, setActiveSection] = useState<PuzzleSection>("mot1");
  const [difficultyFilter, setDifficultyFilter] = useState("hammasi");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const fetchRandom = useFetchRandomPuzzle();
  const { data: stats } = usePuzzleStats();
  const { data: counts = {} } = usePuzzleSectionCounts();
  const narrow = useNarrow();
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  async function loadPuzzle(excludeId?: string) {
    setPuzzleLoading(true);
    setNotFound(false);
    try {
      const p = await fetchRandom.mutateAsync({ section: activeSection, difficulty: difficultyFilter, excludeId });
      setPuzzle(p);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setPuzzle(null);
        setNotFound(true);
      } else {
        throw e;
      }
    } finally {
      setPuzzleLoading(false);
    }
  }

  // Bo'lim yoki qiyinlik filtri o'zgarganda yangi tasodifiy masala so'raladi.
  useEffect(() => {
    loadPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, difficultyFilter]);

  const correct  = stats?.correct  ?? 0;
  const wrong    = stats?.incorrect ?? 0;
  const accuracy = stats?.accuracyPct ?? 0;

  const infoCard = (
    <PuzzleInfoCard
      puzzle={puzzle}
      difficultyFilter={difficultyFilter}
      onDifficultyChange={setDifficultyFilter}
      autoAdvance={autoAdvance}
      onAutoAdvanceChange={setAutoAdvance}
    />
  );

  return (
    <div>
      {/* Bo'lim tab-qatori */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {SECTIONS.map((s) => {
          const isActive = s.id === activeSection;
          const cnt = counts[s.id] ?? 0;
          return (
            <div key={s.id} onClick={() => !s.locked && setActiveSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 12,
                background: isActive ? s.color : CARD_BG,
                border: `1px solid ${isActive ? s.color : CARD_BORDER}`,
                color: isActive ? "#fff" : "#c7c8d0",
                cursor: s.locked ? "default" : "pointer", opacity: s.locked ? 0.5 : 1,
                fontSize: 13.5, fontWeight: 700, transition: "all .15s",
              }}>
              <DifficultyIcon level={SECTIONS.indexOf(s) + 1} color={isActive ? "#fff" : s.color} />
              {s.title}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{s.locked ? "🔒" : cnt}</span>
            </div>
          );
        })}
      </div>

      {narrow ? (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {infoCard}
          <PuzzleCenter section={section} puzzle={puzzle} isLoading={puzzleLoading} notFound={notFound} autoAdvance={autoAdvance} showMoveList={false} onNext={() => loadPuzzle(puzzle?.id)} />
          <StatsPanel correct={correct} wrong={wrong} accuracy={accuracy} />
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"250px 1fr", gap:20, alignItems:"start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {infoCard}
            <StatsPanel correct={correct} wrong={wrong} accuracy={accuracy} />
          </div>
          <PuzzleCenter section={section} puzzle={puzzle} isLoading={puzzleLoading} notFound={notFound} autoAdvance={autoAdvance} showMoveList onNext={() => loadPuzzle(puzzle?.id)} />
        </div>
      )}
    </div>
  );
}
