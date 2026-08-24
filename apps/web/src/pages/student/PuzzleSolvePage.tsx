import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parseFen } from "chessops/fen";
import { Chess } from "chessops/chess";
import { makeSanAndPlay } from "chessops/san";
import { parseSquare } from "chessops/util";
import { boardEquals } from "chessops/board";
import type { Square } from "chessops/types";
import {
  useAttemptPuzzle, usePuzzleHint, usePuzzleStats, useFetchRandomPuzzle, usePuzzleSectionCounts,
  useRevealSolution, type PuzzleSection, type Puzzle,
} from "../../lib/queries.js";
import { PuzzleBoard } from "../../components/PuzzleBoard.js";
import { PromotionModal } from "../../components/PromotionModal.js";
import { SoundToggle } from "../../components/SoundToggle.js";
import { isPromotionMove, pieceAt } from "../../lib/chessMaterial.js";
import { SECTIONS } from "./PuzzlesPage.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

const DIFFICULTY_LABEL: Record<string, string> = { hammasi: "Hammasi", oson: "Oson", orta: "O'rta", qiyin: "Qiyin" };

function DifficultyIcon({ level, color }: { level: number; color: string }) {
  const bars = [{ h: 8 }, { h: 12 }, { h: 16 }, { h: 20 }];
  return (
    <svg width="20" height="20" viewBox="0 0 26 24" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={2 + i * 6} y={22 - b.h} width={4} height={b.h} rx={1.5} fill={i < level ? color : "#33333a"} />
      ))}
    </svg>
  );
}
const CrownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#facc15"><path d="M2 18h20l-1.5-9-4.5 3-4-6-4 6-4.5-3z" /></svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
const CrossIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
);

/* ── Responsive hook — 3 panelli maketning qachon yon panellarga
 *  yig'ilishini va telefonda taxtaga ustuvorlik berishni belgilaydi. ────── */
function useBreakpoint() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { wide: w >= 1180, phone: w < 600 };
}

/* ── chessops yordamchilari (pozitsiyani yurish-ma-yurish kuzatish uchun) ── */
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
 *  normalizatsiya qilamiz. */
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

/* ── Chap panel: statistika ────────────────────────────────────────────── */
function StatsPanel({ correct, wrong, accuracy, todayCount }: { correct: number; wrong: number; accuracy: number; todayCount: number }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#f5f5f6" }}>Masala statistikasi</div>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.22)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <CheckIcon /><span style={{ fontSize: 10.5, fontWeight: 800, color: "#4ade80", letterSpacing: "0.04em" }}>TO'G'RI</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#4ade80" }}>{correct}</div>
        </div>
        <div style={{ flex: 1, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.22)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <CrossIcon /><span style={{ fontSize: 10.5, fontWeight: 800, color: "#f87171", letterSpacing: "0.04em" }}>XATO</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f87171" }}>{wrong}</div>
        </div>
      </div>

      <div>
        <div style={{ height: 6, background: "#232328", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${accuracy}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)", transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b8d98" }}>
          <span>Aniqlik</span><span style={{ color: "#4ade80", fontWeight: 800 }}>{accuracy}%</span>
        </div>
      </div>

      {todayCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: `1px solid ${CARD_BORDER}`, fontSize: 12.5, color: "#c7c8d0" }}>
          🔥 Bugun yechilgan: <b style={{ color: "#f5f5f6" }}>{todayCount} ta</b>
        </div>
      )}
    </div>
  );
}

/* ── O'ng panel: masala bo'limlari ro'yxati ───────────────────────────── */
function SectionsPanel({ activeSection, counts }: { activeSection: PuzzleSection; counts: Record<string, number> }) {
  const navigate = useNavigate();
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#f5f5f6", marginBottom: 4 }}>Masala bo'limlari</div>
      {SECTIONS.map((s, i) => {
        const active = s.id === activeSection;
        return (
          <div
            key={s.id}
            onClick={() => !s.locked && navigate(`/student/puzzles/${s.id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
              cursor: s.locked ? "default" : "pointer", opacity: s.locked ? 0.5 : 1,
              background: active ? `${s.color}18` : "transparent",
              border: `1px solid ${active ? `${s.color}55` : "transparent"}`,
              transition: "background .12s, border-color .12s",
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <DifficultyIcon level={i + 1} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: active ? s.color : "#f5f5f6" }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: "#8b8d98", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.locked ? "🔒 Yopiq" : `${s.desc} · ${counts[s.id] ?? 0} ta`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Sozlamalar: qiyinlik + avto-o'tish (ixcham) ──────────────────────────── */
function SettingsRow({ difficultyFilter, onDifficultyChange, autoAdvance, onAutoAdvanceChange }: {
  difficultyFilter: string;
  onDifficultyChange: (v: string) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
      <select
        value={difficultyFilter}
        onChange={(e) => onDifficultyChange(e.target.value)}
        style={{
          background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: "#c7c8d0",
          borderRadius: 8, padding: "6px 9px", fontSize: 12.5, fontWeight: 600,
        }}
      >
        {Object.entries(DIFFICULTY_LABEL).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b8d98", cursor: "pointer" }}>
        <input type="checkbox" checked={autoAdvance} onChange={(e) => onAutoAdvanceChange(e.target.checked)} />
        Avto-o'tish
      </label>
    </div>
  );
}

/* ── Taxta + boshqaruv ─────────────────────────────────────────────────────── */
function PuzzleBoardBlock({ section, puzzle, isLoading, notFound, autoAdvance, onNext, onSanUpdate }: {
  section: { id: PuzzleSection; title: string; color: string };
  puzzle: Puzzle | null;
  isLoading: boolean;
  notFound: boolean;
  autoAdvance: boolean;
  onNext: () => void;
  onSanUpdate: (sanList: string[], startFullmove: number, startTurn: "w" | "b") => void;
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
  // Raqib javobini biroz kechiktirib qo'yishda (submitMove) foydalanuvchi
  // shu orada "Keyingisi"ni bosib boshqa masalaga o'tib ketgan bo'lishi
  // mumkin — shu holatda eskirgan javobni yangi masala ustiga qo'llamaslik
  // uchun joriy masala id'si shu yerda kuzatiladi.
  const currentPuzzleIdRef = useRef<string | undefined>(undefined);

  const activeFen = fen ?? puzzle?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // O'quvchining o'zi qaysi rangda o'ynayotgani — masalaning BOSHLANG'ICH
  // FEN'idan bir marta olinadi, `activeFen`dan emas — u har yurishda o'zgaradi.
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
    currentPuzzleIdRef.current = puzzle?.id;
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
    const puzzleIdAtStart = puzzle.id;
    const studentSan = applyStudentMove(from, to, promotion);
    if (studentSan) setSanList((prev) => [...prev, studentSan]);

    if (res.finished) {
      // Masala shu yurish bilan tugadi — raqib javobi yo'q, to'g'ridan-to'g'ri
      // yakuniy holatga o'tiladi.
      setFen(res.fenAfter);
      setSolved(true);
      setFeedback(`✅ To'g'ri! +${res.xpAwarded} XP`);
      return;
    }

    // Server res.fenAfter'da ALLAQACHON raqibning javobi ham bor — buni
    // to'g'ridan-to'g'ri qo'ysak, ikki yarim-yurish (o'zimiz + raqib) bitta
    // sakrash bo'lib ko'rinib, "raqib qayerga yurdi" tushunarsiz bo'lardi.
    // Shuning uchun avval faqat o'z yurishimizdan keyingi holatni ko'rsatamiz,
    // keyin qisqa pauzadan so'ng raqib javobini alohida animatsiya bilan qo'yamiz.
    if (posRef.current) setFen(fenFromPos(posRef.current));
    setFeedback("To'g'ri yurish! Davom eting.");

    await new Promise((resolve) => setTimeout(resolve, 380));
    if (currentPuzzleIdRef.current !== puzzleIdAtStart) return; // shu orada boshqa masalaga o'tib ketilgan

    const replySan = applyReplyMove(res.fenAfter);
    if (replySan) setSanList((prev) => [...prev, replySan]);
    setFen(res.fenAfter);
    if (isMateSection) setMovesRemaining(res.movesRemaining);
    else setMoveIndex(moveIndex + 2);
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
    // Yechim har doim masalaning BOSHIdan yoziladi — avval pozitsiyani
    // boshlang'ich FEN'ga qaytaramiz, aks holda yechim yurishlari
    // noqonuniy bo'lib, jimgina yutilib ketar edi.
    try {
      const setup = parseFen(puzzle.fen).unwrap();
      posRef.current = Chess.fromSetup(setup).unwrap();
    } catch { return; }
    setFen(puzzle.fen);
    setSanList([]);
    setHintSquare(undefined);
    setPendingPromotion(null);
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

  useEffect(() => {
    if (!solved || !autoAdvance || revealed) return;
    const t = setTimeout(() => goNext(), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, autoAdvance, revealed]);

  const startFullmove = puzzle ? Number(puzzle.fen.split(" ")[5] ?? 1) : 1;
  const startTurn: "w" | "b" = puzzle ? (puzzle.fen.split(" ")[1] === "b" ? "b" : "w") : "w";

  useEffect(() => {
    onSanUpdate(sanList, startFullmove, startTurn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanList, startFullmove, startTurn]);

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

  return (
    <div>
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, padding: 14, boxShadow: "0 16px 46px rgba(0,0,0,.5)" }}>
        {isLoading ? (
          <div style={{ width: "min(560px, calc(100vh - 300px), 100%)", aspectRatio:"1", margin: "0 auto", background:"rgba(255,255,255,.05)", borderRadius:12,
            display:"grid", placeItems:"center", color:"rgba(255,255,255,.3)", fontSize:14 }}>
            Yuklanmoqda...
          </div>
        ) : puzzle ? (
          <div style={{ width: "min(560px, calc(100vh - 300px), 100%)", margin: "0 auto" }}>
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

      {puzzle && !solved && (
        <div style={{ display: "flex", gap: 18, marginTop: 10, justifyContent: "center" }}>
          <span onClick={handleHint} style={{ fontSize: 12.5, color: "#60a5fa", cursor: "pointer", fontWeight: 600 }}>💡 Yordam olish</span>
          <span onClick={handleReveal} style={{ fontSize: 12.5, color: "#a3a4ad", cursor: "pointer", fontWeight: 600 }}>👁️ Yechimni ko'rish</span>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <div onClick={goNext}
          style={{ flex: 1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            color: "#fff", fontSize:14.5, fontWeight:800, padding:13, borderRadius:11, cursor:"pointer",
            boxShadow: "0 6px 18px rgba(34,197,94,.25)" }}>
          Keyingisi →
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PuzzleSolvePage() {
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section: string }>();
  const [difficultyFilter, setDifficultyFilter] = useState("hammasi");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleLoading, setPuzzleLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const fetchRandom = useFetchRandomPuzzle();
  const { data: stats } = usePuzzleStats();
  const { data: counts = {} } = usePuzzleSectionCounts();
  const { wide, phone } = useBreakpoint();

  const activeSection = (SECTIONS.some((s) => s.id === sectionParam) ? sectionParam : "mot1") as PuzzleSection;
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  // Noto'g'ri/eskirgan bo'lim havolasi kiritilsa — kartalar sahifasiga qaytariladi.
  useEffect(() => {
    if (sectionParam && !SECTIONS.some((s) => s.id === sectionParam)) {
      navigate("/student/puzzles", { replace: true });
    }
  }, [sectionParam, navigate]);

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
  const todayCount = stats?.todayCount ?? 0;

  const turnColor = (puzzle?.fen ?? "").includes(" b ") ? "b" : "w";

  const board = (
    <PuzzleBoardBlock
      section={section}
      puzzle={puzzle}
      isLoading={puzzleLoading}
      notFound={notFound}
      autoAdvance={autoAdvance}
      onNext={() => loadPuzzle(puzzle?.id)}
      onSanUpdate={() => {}}
    />
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate("/student/puzzles")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 12px",
            borderRadius: 10, border: `1px solid ${CARD_BORDER}`,
            background: CARD_BG, color: "#c7c8d0",
            fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
          }}>
          <BackIcon />
          {!phone && "Orqaga"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClockIcon />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "#f5f5f6", letterSpacing: "-0.01em" }}>{section.title}</div>
            <div style={{ fontSize: 12, color: "#8b8d98", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {turnColor === "w" ? "Oq" : "Qora"} yuradi · eng qisqa yo'lni toping
            </div>
          </div>
        </div>

        <SoundToggle style={{ marginLeft: "auto" }} />
      </div>

      {wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 280px", gap: 20, alignItems: "start" }}>
          <StatsPanel correct={correct} wrong={wrong} accuracy={accuracy} todayCount={todayCount} />
          <div>
            {board}
            <SettingsRow difficultyFilter={difficultyFilter} onDifficultyChange={setDifficultyFilter}
              autoAdvance={autoAdvance} onAutoAdvanceChange={setAutoAdvance} />
          </div>
          <SectionsPanel activeSection={activeSection} counts={counts} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {board}
          <SettingsRow difficultyFilter={difficultyFilter} onDifficultyChange={setDifficultyFilter}
            autoAdvance={autoAdvance} onAutoAdvanceChange={setAutoAdvance} />
          <StatsPanel correct={correct} wrong={wrong} accuracy={accuracy} todayCount={todayCount} />
          <SectionsPanel activeSection={activeSection} counts={counts} />
        </div>
      )}
    </div>
  );
}
