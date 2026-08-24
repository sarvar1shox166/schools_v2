import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type { Key } from "@lichess-org/chessground/types";
import { parseFen } from "chessops/fen";
import { Chess } from "chessops/chess";
import { chessgroundDests } from "chessops/compat";
import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "./puzzleBoard.css";
import { diffFenMove } from "../lib/chessMaterial.js";
import { playMoveSound } from "../lib/sound.js";

/** Boshqotirmalar uchun taxta — Lichess'ning `chessground` (taxta) va
 *  `chessops` (qonuniy yurishlarni hisoblash) kutubxonalariga asoslangan.
 *  Bu FAQAT mijoz tomonidagi ko'rsatish/interaktivlik uchun — haqiqiy
 *  tekshiruv har doim serverda (`mateSolver`/`checkPuzzleMove`) bo'ladi. */
export function PuzzleBoard({ fen, onMove, disabled, hintSquare, revertKey, orientation }: {
  fen: string;
  onMove: (from: string, to: string) => void;
  disabled?: boolean;
  hintSquare?: string;
  /** Noto'g'ri yurishdan keyin taxtani `fen`ga qaytarish uchun — chessground
   *  yurishni allaqachon o'zicha bajargan bo'ladi (chessops uni qonuniy
   *  yurish deb hisoblagani uchun), shuning uchun `fen` qiymati o'zgarmagan
   *  taqdirda ham qayta `set()` chaqirilishini majburlash kerak. */
  revertKey?: number;
  /** O'quvchi qora bo'lib o'ynayotgan masalalarda taxta aylantiriladi —
   *  Lichess'dagi kabi, o'quvchining donalari har doim pastda turadi. */
  orientation?: "white" | "black";
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const propsRef = useRef({ fen, disabled, hintSquare, orientation });
  propsRef.current = { fen, disabled, hintSquare, orientation };

  function buildConfig(): Config {
    const { fen, disabled, hintSquare, orientation } = propsRef.current;
    const turn: "white" | "black" = fen.split(" ")[1] === "b" ? "black" : "white";
    let dests: Map<Key, Key[]> = new Map();
    try {
      const setup = parseFen(fen).unwrap();
      const pos = Chess.fromSetup(setup).unwrap();
      dests = chessgroundDests(pos) as unknown as Map<Key, Key[]>;
    } catch {
      // chessops to'liq shaxmat qonuniyligini talab qiladi (ikkala shoh va h.k.) —
      // bu komponent faqat Boshqotirmalar uchun ishlatiladi, u yerdagi barcha
      // pozitsiyalar shu talabga javob beradi, shuning uchun bu holat amalda
      // yuz bermaydi.
    }
    return {
      fen,
      turnColor: turn,
      orientation: orientation ?? "white",
      movable: {
        free: false,
        color: disabled ? undefined : "both",
        dests,
        showDests: true,
        events: { after: (orig, dest) => onMoveRef.current(orig, dest) },
      },
      highlight: { lastMove: true, check: true },
      animation: { enabled: true },
      drawable: {
        enabled: true,
        autoShapes: hintSquare ? [{ orig: hintSquare as Key, brush: "green" }] : [],
      },
    };
  }

  useEffect(() => {
    if (!elRef.current) return;
    const el = elRef.current;
    // Boshlang'ich holatni to'g'ridan-to'g'ri haqiqiy FEN bilan quramiz —
    // aks holda chessground avval standart boshlang'ich pozitsiyani (32 dona)
    // chizib, keyin darhol bizning siyrak boshqotirma holatimizga
    // "animatsiya" qilib o'tishga urinar edi, bu esa ba'zan chala qolib
    // ketuvchi ("muallaq") donalarga olib kelardi.
    const ground = Chessground(el, buildConfig());
    groundRef.current = ground;
    return () => {
      ground.destroy();
      // chessground.destroy() DOM elementlarni o'chirmaydi (faqat hodisa
      // tinglovchilarini uzadi) — React StrictMode effektlarni ikki marta
      // ishga tushirganda (dev rejimda) shu qoldiqlar ustiga yangi taxta
      // qurilib, muammo keltirib chiqarardi.
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevFenRef = useRef(fen);
  useEffect(() => {
    groundRef.current?.set(buildConfig());
    // `revertKey` o'zgarganda `fen` qiymati o'zgarmasligi mumkin (noto'g'ri
    // yurishdan keyin taxta orqaga qaytadi) — bu holda tovush chalinmaydi,
    // faqat haqiqatan yangi FEN kelganda (o'z yoki raqib yurishi).
    const prevFen = prevFenRef.current;
    prevFenRef.current = fen;
    if (prevFen !== fen) {
      const diff = diffFenMove(prevFen, fen);
      if (diff) playMoveSound(diff.captured ? "capture" : "move");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, disabled, hintSquare, revertKey, orientation]);

  return <div ref={elRef} className="puzzle-board-wrap" />;
}
