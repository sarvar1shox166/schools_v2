import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ── Board constants ─────────────────────────────────────────────────────── */
const CELL = 76;
const COLS_LABEL = ["a","b","c","d","e","f","g","h"];

type Pos = [number, number]; // [col 0-7, row 0-7]  row 0 = rank 1

function cellCenter(col: number, row: number): [number, number] {
  return [col * CELL + CELL / 2, (7 - row) * CELL + CELL / 2];
}

/* ── Lesson data ─────────────────────────────────────────────────────────── */
interface Step {
  from: Pos; to: Pos;
  pieceIcon?: string;
  moveType?:  "rux" | "fil" | "farzin" | "shoh" | "ot" | "piyoda" | "rokirovka" | "enpassant" | "libre";
  enemies?:   { pos: Pos; icon: string }[];
}

interface LessonDef {
  id: string; title: string; desc: string;
  pieceIcon: string; instruction: string;
  moveType: "rux" | "fil" | "farzin" | "shoh" | "ot" | "piyoda" | "rokirovka" | "enpassant" | "libre";
  steps: Step[];
  enemies?: { pos: Pos; icon: string }[];
}

const LESSON_MAP: Record<string, LessonDef> = {
  rux: {
    id:"rux", title:"Rux", desc:"Rux to'g'ri chiziq bo'yicha harakatlanadi",
    pieceIcon:"♖", moveType:"rux", instruction:"Ruxni ustiga bosib yulduzchaga olib boring!",
    steps:[
      { from:[4,1], to:[4,5] }, { from:[0,0], to:[7,0] },
      { from:[3,3], to:[3,7] }, { from:[2,2], to:[2,6] },
      { from:[5,1], to:[0,1] }, { from:[1,4], to:[1,0] },
    ],
  },
  fil: {
    id:"fil", title:"Fil", desc:"Fil diagonal bo'yicha harakatlanadi",
    pieceIcon:"♗", moveType:"fil", instruction:"Filni yulduzchaga olib boring!",
    steps:[
      { from:[3,0], to:[6,3] }, { from:[2,2], to:[5,5] },
      { from:[4,4], to:[1,7] }, { from:[0,0], to:[4,4] },
      { from:[7,7], to:[3,3] }, { from:[1,6], to:[4,3] },
    ],
  },
  farzin: {
    id:"farzin", title:"Farzin", desc:"Farzin = rux + fil",
    pieceIcon:"♕", moveType:"farzin", instruction:"Farzinni yulduzchaga olib boring!",
    steps:[
      { from:[3,0], to:[3,6] }, { from:[4,4], to:[7,7] },
      { from:[0,0], to:[7,7] }, { from:[3,4], to:[7,0] },
      { from:[2,1], to:[2,7] },
    ],
  },
  shoh: {
    id:"shoh", title:"Shoh", desc:"Eng muhim dona",
    pieceIcon:"♔", moveType:"shoh", instruction:"Shohni yulduzchaga olib boring!",
    steps:[
      { from:[4,0], to:[4,1] }, { from:[4,1], to:[3,2] },
      { from:[3,2], to:[4,3] }, { from:[4,3], to:[5,4] },
    ],
  },
  ot: {
    id:"ot", title:"Ot", desc:"Ot \"L\" shaklida harakatlanadi",
    pieceIcon:"♘", moveType:"ot", instruction:"Otni yulduzchaga olib boring!",
    steps:[
      { from:[1,0], to:[2,2] }, { from:[3,3], to:[5,4] },
      { from:[4,2], to:[2,3] }, { from:[2,4], to:[4,5] },
      { from:[5,5], to:[3,6] }, { from:[0,1], to:[2,0] },
    ],
  },
  piyoda: {
    id:"piyoda", title:"Piyoda", desc:"Faqat oldinga yuradi",
    pieceIcon:"♙", moveType:"piyoda", instruction:"Piyodani yulduzchaga olib boring!",
    steps:[
      { from:[4,1], to:[4,2] }, { from:[4,2], to:[4,3] },
      { from:[2,1], to:[2,3] }, { from:[3,3], to:[3,4] },
      { from:[5,1], to:[5,2] },
    ],
  },

  /* ── O'rta daraja ── */
  taxt: {
    id:"taxt", title:"Taxtani terish", desc:"O'yin qanday boshlanadi",
    pieceIcon:"♖", moveType:"libre", instruction:"Donani boshlang'ich joyiga qo'ying!",
    steps:[
      { from:[7,3], to:[0,0], pieceIcon:"♖", moveType:"libre",
        enemies:[{pos:[4,4],icon:"♟"},{pos:[3,5],icon:"♟"},{pos:[6,5],icon:"♟"}] },
      { from:[4,5], to:[1,0], pieceIcon:"♘", moveType:"libre",
        enemies:[{pos:[6,3],icon:"♟"},{pos:[2,4],icon:"♟"},{pos:[5,5],icon:"♟"}] },
      { from:[6,5], to:[2,0], pieceIcon:"♗", moveType:"libre",
        enemies:[{pos:[4,3],icon:"♟"},{pos:[0,4],icon:"♟"},{pos:[7,3],icon:"♟"}] },
      { from:[1,5], to:[3,0], pieceIcon:"♕", moveType:"libre",
        enemies:[{pos:[5,4],icon:"♟"},{pos:[2,3],icon:"♟"},{pos:[6,2],icon:"♟"}] },
      { from:[5,4], to:[4,0], pieceIcon:"♔", moveType:"libre",
        enemies:[{pos:[7,2],icon:"♟"},{pos:[1,3],icon:"♟"},{pos:[3,4],icon:"♟"}] },
    ],
  },
  rok: {
    id:"rok", title:"Rokirovka", desc:"Shohning maxsus yurishi",
    pieceIcon:"♔", moveType:"rokirovka", instruction:"Shohni rokirovka qiling!",
    steps:[
      // Kingside
      { from:[4,0], to:[6,0],
        enemies:[{pos:[3,4],icon:"♜"},{pos:[5,5],icon:"♜"}] },
      // Queenside
      { from:[4,0], to:[2,0],
        enemies:[{pos:[4,5],icon:"♜"},{pos:[2,4],icon:"♜"}] },
      // Kingside (other position, more enemies)
      { from:[4,0], to:[6,0],
        enemies:[{pos:[0,3],icon:"♜"},{pos:[1,4],icon:"♝"},{pos:[5,5],icon:"♜"}] },
      // Queenside (other position)
      { from:[4,0], to:[2,0],
        enemies:[{pos:[7,3],icon:"♜"},{pos:[6,4],icon:"♝"},{pos:[3,5],icon:"♜"}] },
    ],
  },
  kesib: {
    id:"kesib", title:"En passant", desc:"Piyodaning maxsus yurishi",
    pieceIcon:"♙", moveType:"enpassant", instruction:"En passant qiling!",
    steps:[
      // Left diagonal en passant
      { from:[4,4], to:[3,5], moveType:"enpassant",
        enemies:[{pos:[3,4],icon:"♟"},{pos:[6,5],icon:"♟"},{pos:[1,5],icon:"♟"}] },
      // Right diagonal en passant
      { from:[3,4], to:[4,5], moveType:"enpassant",
        enemies:[{pos:[4,4],icon:"♟"},{pos:[1,4],icon:"♟"},{pos:[6,5],icon:"♟"}] },
      // Left diagonal from different position
      { from:[5,4], to:[4,5], moveType:"enpassant",
        enemies:[{pos:[4,4],icon:"♟"},{pos:[2,5],icon:"♟"},{pos:[7,5],icon:"♟"}] },
      // Right diagonal from different position
      { from:[2,4], to:[3,5], moveType:"enpassant",
        enemies:[{pos:[3,4],icon:"♟"},{pos:[0,5],icon:"♟"},{pos:[5,5],icon:"♟"}] },
    ],
  },
  pat: {
    id:"pat", title:"Pat", desc:"O'yin — durang",
    pieceIcon:"♕", moveType:"farzin", instruction:"Shohni matga qo'ymasdan qisib oling!",
    steps:[
      // Move Queen to restrict enemy King (at a8 corner)
      { from:[3,5], to:[1,6], pieceIcon:"♕", moveType:"farzin",
        enemies:[{pos:[0,7],icon:"♚"},{pos:[1,7],icon:"♟"},{pos:[0,6],icon:"♟"}] },
      // Rook cuts off rank
      { from:[0,3], to:[0,6], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[6,7],icon:"♟"},{pos:[7,6],icon:"♟"}] },
      // Queen positions for stalemate
      { from:[5,3], to:[6,6], pieceIcon:"♕", moveType:"farzin",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[5,7],icon:"♟"},{pos:[7,5],icon:"♟"}] },
      // Final restricting move
      { from:[2,4], to:[5,5], pieceIcon:"♕", moveType:"farzin",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[6,6],icon:"♟"},{pos:[6,7],icon:"♟"}] },
    ],
  },

  /* ── Yuqori daraja ── */
  dona: {
    id:"dona", title:"Donalar qiymati", desc:"Donalar kuchini baholang",
    pieceIcon:"♕", moveType:"farzin", instruction:"Eng qimmatli dushman donasini urib oling!",
    steps:[
      // Q takes R (9>5) — capture the rook, not the pawn
      { from:[0,0], to:[7,4], pieceIcon:"♕", moveType:"farzin",
        enemies:[{pos:[7,4],icon:"♜"},{pos:[3,3],icon:"♟"},{pos:[5,5],icon:"♟"}] },
      // R takes B (5>3) — capture the bishop, not the pawn
      { from:[7,0], to:[7,6], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[7,6],icon:"♝"},{pos:[7,3],icon:"♟"},{pos:[4,6],icon:"♟"}] },
      // B takes N (3=3) — capture the knight (same value, but it's the target)
      { from:[0,0], to:[4,4], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[4,4],icon:"♞"},{pos:[6,2],icon:"♟"},{pos:[2,6],icon:"♟"}] },
      // N takes Q (3<9) — oops! Knight shouldn't take Queen for free?
      // Actually: N takes P to show low value trade
      { from:[1,0], to:[2,2], pieceIcon:"♘", moveType:"ot",
        enemies:[{pos:[2,2],icon:"♟"},{pos:[5,5],icon:"♜"},{pos:[0,6],icon:"♝"}] },
    ],
  },
  ikki: {
    id:"ikki", title:"Ikki yurishda shoh berish", desc:"Shoh berish uchun ikki yurish",
    pieceIcon:"♕", moveType:"farzin", instruction:"Shoh berishga tayyorlaning!",
    steps:[
      // Step 1: Rook to open file (prepare check)
      { from:[0,0], to:[4,0], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[3,6],icon:"♟"},{pos:[5,6],icon:"♟"}] },
      // Step 2: Deliver the check
      { from:[4,0], to:[4,5], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[3,6],icon:"♟"},{pos:[5,6],icon:"♟"}] },
      // Step 3: Bishop setup (diagonal)
      { from:[0,0], to:[3,3], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[6,5],icon:"♟"},{pos:[2,5],icon:"♟"}] },
      // Step 4: Queen delivers check (using the opened diagonal)
      { from:[3,0], to:[0,3], pieceIcon:"♕", moveType:"farzin",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[1,6],icon:"♟"},{pos:[5,6],icon:"♟"}] },
    ],
  },

  /* ── Asosiy prinsiplar — har bosqich mustaqil pozitsiya ── */
  urib_olish: {
    id:"urib_olish", title:"Urib olish", desc:"Raqib donalarini urib oling",
    pieceIcon:"♖", moveType:"rux", instruction:"Dushman donasini urib oling!",
    steps:[
      // 1: Rux piyodani urib oladi (vertikal)
      { from:[2,2], to:[2,6],
        enemies:[{pos:[2,6],icon:"♟"},{pos:[5,4],icon:"♟"},{pos:[0,5],icon:"♟"}] },
      // 2: Fil otni urib oladi (diagonal)
      { from:[0,0], to:[3,3], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[3,3],icon:"♞"},{pos:[6,5],icon:"♟"},{pos:[1,5],icon:"♟"}] },
      // 3: Ot filni urib oladi (L-shakl)
      { from:[1,0], to:[2,2], pieceIcon:"♘", moveType:"ot",
        enemies:[{pos:[2,2],icon:"♝"},{pos:[5,3],icon:"♟"},{pos:[4,6],icon:"♟"}] },
      // 4: Farzin ruxni urib oladi (diagonal)
      { from:[3,0], to:[7,4], pieceIcon:"♛", moveType:"farzin",
        enemies:[{pos:[7,4],icon:"♜"},{pos:[0,7],icon:"♟"},{pos:[5,6],icon:"♟"}] },
      // 5: Shoh piyodani urib oladi (1 qadam)
      { from:[4,1], to:[3,1], pieceIcon:"♔", moveType:"shoh",
        enemies:[{pos:[3,1],icon:"♟"},{pos:[6,3],icon:"♟"},{pos:[1,3],icon:"♟"}] },
    ],
  },
  himoya: {
    id:"himoya", title:"Himoya", desc:"Muhim katakchalarni himoya qiling",
    pieceIcon:"♖", moveType:"rux", instruction:"Donangizni himoya uchun joylashtiring!",
    steps:[
      // 1: Rux raqib ruxining yo'lini to'sadi (e-ustun)
      { from:[0,3], to:[4,3], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[4,7],icon:"♜"},{pos:[4,6],icon:"♟"}] },
      // 2: Fil diagonal tahdidni to'sadi
      { from:[1,1], to:[4,4], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[7,7],icon:"♝"},{pos:[5,6],icon:"♟"},{pos:[2,6],icon:"♟"}] },
      // 3: Ot muhim katakni nazorat qiladi
      { from:[6,0], to:[5,2], pieceIcon:"♘", moveType:"ot",
        enemies:[{pos:[3,3],icon:"♜"},{pos:[7,4],icon:"♜"}] },
      // 4: Shoh xavfdan uzoqlashadi
      { from:[4,0], to:[3,0], pieceIcon:"♔", moveType:"shoh",
        enemies:[{pos:[4,7],icon:"♜"},{pos:[5,7],icon:"♜"}] },
    ],
  },
  jang: {
    id:"jang", title:"Jang", desc:"Donalarni bir-bir urib oling",
    pieceIcon:"♘", moveType:"ot", instruction:"Hujum qiling!",
    steps:[
      // 1: Ot piyodani urib oladi
      { from:[1,0], to:[2,2], pieceIcon:"♘", moveType:"ot",
        enemies:[{pos:[2,2],icon:"♟"},{pos:[4,3],icon:"♟"},{pos:[6,4],icon:"♟"}] },
      // 2: Rux piyodani urib oladi (gorizontal)
      { from:[0,5], to:[5,5], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[5,5],icon:"♟"},{pos:[2,3],icon:"♞"},{pos:[7,2],icon:"♜"}] },
      // 3: Fil otni urib oladi (diagonal)
      { from:[5,0], to:[2,3], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[2,3],icon:"♞"},{pos:[0,5],icon:"♟"},{pos:[6,6],icon:"♟"}] },
      // 4: Farzin ruxni urib oladi (diagonal)
      { from:[3,0], to:[7,4], pieceIcon:"♛", moveType:"farzin",
        enemies:[{pos:[7,4],icon:"♜"},{pos:[1,5],icon:"♟"},{pos:[5,2],icon:"♟"}] },
    ],
  },
  shoh_berish: {
    id:"shoh_berish", title:"Shoh berish", desc:"Dushman shohiga shoh bering",
    pieceIcon:"♛", moveType:"farzin", instruction:"Qora shohga shoh bering!",
    steps:[
      // 1: Rux e-ustunda shoh beradi
      { from:[4,0], to:[4,5], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[3,6],icon:"♟"},{pos:[5,6],icon:"♟"}] },
      // 2: Fil diagonalda shoh beradi  (a4→c6, c6 checks e8 diag Δ2,2)
      { from:[0,3], to:[2,5], pieceIcon:"♗", moveType:"fil",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[6,6],icon:"♟"},{pos:[0,6],icon:"♟"}] },
      // 3: Ot shoh beradi (h5→f6, f6 checks e8 knight Δ-1,2)
      { from:[7,4], to:[5,5], pieceIcon:"♘", moveType:"ot",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[2,6],icon:"♟"},{pos:[6,6],icon:"♟"}] },
      // 4: Farzin 8-qatorda shoh beradi (a5→a8, rank-8 checks e8)
      { from:[0,4], to:[0,7], pieceIcon:"♛", moveType:"farzin",
        enemies:[{pos:[4,7],icon:"♚"},{pos:[1,6],icon:"♟"},{pos:[3,6],icon:"♟"}] },
    ],
  },
  shohdan_qutulish: {
    id:"shohdan_qutulish", title:"Shohdan qutulish", desc:"Shohingizni xavfdan oling",
    pieceIcon:"♔", moveType:"shoh", instruction:"Shohni xavfsiz katakka olib boring!",
    steps:[
      // 1: e-ustundan chiqish (rux tahdidi)
      { from:[4,0], to:[3,0],
        enemies:[{pos:[4,7],icon:"♜"},{pos:[4,5],icon:"♜"}] },
      // 2: h-ustundan diagonal qochish
      { from:[7,0], to:[6,1],
        enemies:[{pos:[7,7],icon:"♜"},{pos:[5,7],icon:"♜"}] },
      // 3: Fil tahdididan qochish
      { from:[4,2], to:[3,2],
        enemies:[{pos:[7,5],icon:"♝"},{pos:[1,5],icon:"♝"}] },
      // 4: Xavfsiz burchakka borish
      { from:[5,3], to:[6,4],
        enemies:[{pos:[0,3],icon:"♜"},{pos:[5,7],icon:"♜"}] },
    ],
  },
  mot_berish: {
    id:"mot_berish", title:"Mot berish", desc:"Dushmanga mot bering",
    pieceIcon:"♛", moveType:"farzin", instruction:"Mat bering!",
    steps:[
      // 1: Rux orqa qatorda mat (h8 shoh, g7 piyoda to'sadi)
      { from:[0,6], to:[7,6], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[6,6],icon:"♟"},{pos:[6,7],icon:"♟"}] },
      // 2: Farzin burchak matda (a8 shoh, a7 piyoda to'sadi)
      { from:[3,5], to:[1,7], pieceIcon:"♛", moveType:"farzin",
        enemies:[{pos:[0,7],icon:"♚"},{pos:[0,6],icon:"♟"},{pos:[2,7],icon:"♟"}] },
      // 3: Rux orqa qatorda mat (e8 shoh)
      { from:[5,0], to:[5,7], pieceIcon:"♖", moveType:"rux",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[6,7],icon:"♟"},{pos:[6,6],icon:"♟"}] },
      // 4: Farzin diagonal mat (h8 shoh)
      { from:[4,5], to:[6,7], pieceIcon:"♛", moveType:"farzin",
        enemies:[{pos:[7,7],icon:"♚"},{pos:[5,7],icon:"♟"},{pos:[6,6],icon:"♟"}] },
    ],
  },
};

/* ── Sidebar data ────────────────────────────────────────────────────────── */
const SIDEBAR = [
  {
    title:"Shaxmat donalari",
    lessons:[
      { id:"rux",    title:"Rux",    icon:"♜" },
      { id:"fil",    title:"Fil",    icon:"♝" },
      { id:"farzin", title:"Farzin", icon:"♛" },
      { id:"shoh",   title:"Shoh",   icon:"♚" },
      { id:"ot",     title:"Ot",     icon:"♞" },
      { id:"piyoda", title:"Piyoda", icon:"♟" },
    ],
  },
  {
    title:"Asosiy prinsiplar",
    lessons:[
      { id:"urib_olish",       title:"Urib olish",       icon:"🏹" },
      { id:"himoya",           title:"Himoya",            icon:"🛡️" },
      { id:"jang",             title:"Jang",              icon:"⚔️" },
      { id:"shoh_berish",      title:"Shoh berish",       icon:"♛" },
      { id:"shohdan_qutulish", title:"Shohdan qutulish",  icon:"🏃" },
      { id:"mot_berish",       title:"Mot berish",        icon:"👑" },
    ],
  },
  {
    title:"O'rta daraja",
    lessons:[
      { id:"taxt",  title:"Taxtani terish",     icon:"♟" },
      { id:"rok",   title:"Rokirovka",           icon:"🏰" },
      { id:"kesib", title:"En passant",          icon:"🔄" },
      { id:"pat",   title:"Pat",                 icon:"⚖️" },
    ],
  },
  {
    title:"Yuqori daraja",
    lessons:[
      { id:"dona", title:"Donalar qiymati",          icon:"💎" },
      { id:"ikki", title:"Ikki yurishda shoh berish", icon:"⚔️" },
    ],
  },
];

/* ── Valid move highlights ────────────────────────────────────────────────── */
function getHighlights(mt: LessonDef["moveType"], from: Pos): Pos[] {
  const [col, row] = from;
  const all: Pos[] = [];
  if (mt === "rux" || mt === "farzin") {
    for (let c = 0; c < 8; c++) if (c !== col) all.push([c, row]);
    for (let r = 0; r < 8; r++) if (r !== row) all.push([col, r]);
  }
  if (mt === "fil" || mt === "farzin") {
    for (let d = 1; d < 8; d++) {
      ([[col+d,row+d],[col-d,row+d],[col+d,row-d],[col-d,row-d]] as Pos[]).forEach(([c,r])=>{
        if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
      });
    }
  }
  if (mt === "shoh") {
    for (let dc=-1;dc<=1;dc++) for (let dr=-1;dr<=1;dr++) {
      if (dc===0&&dr===0) continue;
      const c=col+dc, r=row+dr;
      if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
    }
  }
  if (mt === "ot") {
    ([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]] as Pos[]).forEach(([dc,dr])=>{
      const c=col+dc, r=row+dr;
      if (c>=0&&c<8&&r>=0&&r<8) all.push([c,r]);
    });
  }
  if (mt === "piyoda") {
    if (row+1<8) all.push([col, row+1]);
    if (row===1)  all.push([col, row+2]);
  }
  if (mt === "rokirovka") {
    // kingside and queenside castling squares
    if (col-2>=0) all.push([col-2, row]);
    if (col+2<8)  all.push([col+2, row]);
  }
  if (mt === "enpassant") {
    // forward + diagonal captures
    if (row+1<8) {
      all.push([col, row+1]);
      if (col-1>=0) all.push([col-1, row+1]);
      if (col+1<8)  all.push([col+1, row+1]);
    }
  }
  if (mt === "libre") {
    // all squares (used for "place piece on starting square" lessons)
    for (let c=0;c<8;c++) for (let r=0;r<8;r++) if (c!==col||r!==row) all.push([c,r]);
  }
  return all;
}

/* ── Board ───────────────────────────────────────────────────────────────── */
function Board({ lesson, stepIdx, showHint, onStepComplete, onMistake }:
  { lesson: LessonDef; stepIdx: number; showHint: boolean; onStepComplete: ()=>void; onMistake: ()=>void }) {

  const boardRef    = useRef<HTMLDivElement>(null);
  const wasDragRef  = useRef(false);
  const [dragging,  setDragging]  = useState(false);
  const [selected,  setSelected]  = useState(false);
  const [relCursor, setRelCursor] = useState({ x:0, y:0 });
  const [hoverCell, setHoverCell] = useState<Pos|null>(null);
  const [wrongCell, setWrongCell] = useState<Pos|null>(null);

  const step          = lesson.steps[stepIdx] ?? lesson.steps[0];
  const stepPieceIcon = step.pieceIcon ?? lesson.pieceIcon;
  const stepMoveType  = step.moveType  ?? lesson.moveType;
  const stepEnemies   = step.enemies   ?? lesson.enemies ?? [];
  const highlights    = getHighlights(stepMoveType, step.from);
  const [fromX, fromY] = cellCenter(...step.from);
  const [toX, toY]     = cellCenter(...step.to);

  // Reset selection and wrong cell when step changes
  useEffect(() => { setSelected(false); setWrongCell(null); }, [stepIdx]);

  function clientToBoard(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { rx: clientX - rect.left, ry: clientY - rect.top };
  }

  function clientToCell(clientX: number, clientY: number): Pos | null {
    const pos = clientToBoard(clientX, clientY);
    if (!pos) return null;
    const col  = Math.floor(pos.rx / CELL);
    const dRow = Math.floor(pos.ry / CELL);
    if (col < 0 || col > 7 || dRow < 0 || dRow > 7) return null;
    return [col, 7 - dRow];
  }

  function tryMove(col: number, row: number) {
    const isValid = highlights.some(([c,r]) => c===col && r===row);
    if (!isValid) return;
    if (col === step.to[0] && row === step.to[1]) {
      setSelected(false);
      onStepComplete();
    } else {
      // Valid square but not the star — mistake
      setWrongCell([col, row]);
      setTimeout(() => setWrongCell(null), 500);
      onMistake();
    }
  }

  useEffect(() => {
    if (!dragging) return;

    function getClientXY(e: MouseEvent | TouchEvent) {
      if ("changedTouches" in e && e.type === "touchend")
        return { cx: e.changedTouches[0].clientX, cy: e.changedTouches[0].clientY };
      if ("touches" in e)
        return { cx: (e as TouchEvent).touches[0].clientX, cy: (e as TouchEvent).touches[0].clientY };
      return { cx: (e as MouseEvent).clientX, cy: (e as MouseEvent).clientY };
    }

    function onMove(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      wasDragRef.current = true;
      const { cx, cy } = getClientXY(e);
      const pos = clientToBoard(cx, cy);
      if (pos) setRelCursor({ x: pos.rx, y: pos.ry });
      setHoverCell(clientToCell(cx, cy));
    }

    function onUp(e: MouseEvent | TouchEvent) {
      const { cx, cy } = getClientXY(e);
      setDragging(false);
      setHoverCell(null);
      document.body.style.cursor = "";

      if (!wasDragRef.current) {
        // Pure click on piece → toggle selected
        setSelected(prev => !prev);
        return;
      }
      // Drag drop → try move
      const cell = clientToCell(cx, cy);
      if (cell) tryMove(cell[0], cell[1]);
    }

    document.body.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
      document.body.style.cursor = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, step, onStepComplete, onMistake]);

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    wasDragRef.current = false;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pos = clientToBoard(cx, cy);
    if (pos) setRelCursor({ x: pos.rx, y: pos.ry });
    setDragging(true);
  }

  function handleCellClick(col: number, row: number) {
    // Click on the piece itself → toggle select
    if (col === step.from[0] && row === step.from[1]) {
      setSelected(prev => !prev);
      return;
    }
    if (!selected) return;
    tryMove(col, row);
  }

  const isHoverTarget = hoverCell?.[0] === step.to[0] && hoverCell?.[1] === step.to[1];

  // Per-step enemies — no carry-over between steps
  const visibleEnemies = stepEnemies;

  return (
    <div ref={boardRef}
      style={{ position:"relative", width:CELL*8, height:CELL*8, flexShrink:0,
        boxShadow:"0 8px 40px rgba(0,0,0,.5)", userSelect:"none",
        overflow:"visible" }}>

      {/* Cells */}
      {Array.from({length:8}, (_,displayRow) =>
        Array.from({length:8}, (_,col) => {
          const row      = 7 - displayRow;
          const isLight  = (col + displayRow) % 2 === 0;
          const isTarget = col === step.to[0]   && row === step.to[1];
          const isPiece  = col === step.from[0] && row === step.from[1];
          const isHL     = selected && highlights.some(([c,r]) => c===col && r===row);
          const isHover  = hoverCell?.[0]===col && hoverCell?.[1]===row;
          const isWrong  = wrongCell?.[0]===col && wrongCell?.[1]===row;
          const enemy    = visibleEnemies.find(e => e.pos[0]===col && e.pos[1]===row);
          const isEnemyTarget = isTarget && !!enemy; // enemy on the capture square

          return (
            <div key={`${col}-${displayRow}`}
              onClick={() => handleCellClick(col, row)}
              style={{ position:"absolute", left:col*CELL, top:displayRow*CELL,
                width:CELL, height:CELL,
                background: isWrong ? "#ef4444"
                  : isHover && isTarget ? "#4ade80"
                  : isEnemyTarget && isHL ? "rgba(239,68,68,.35)"
                  : isHL && !isTarget ? (isLight ? "#d4f0a0" : "#a8d870")
                  : isLight ? "#f0d9b5" : "#b58863",
                transition: isWrong ? "background 0s" : "background .1s",
                cursor: isHL || isPiece ? "pointer" : "default",
                display:"flex", alignItems:"center", justifyContent:"center" }}>

              {/* Highlight dot (only on non-enemy, non-target squares) */}
              {isHL && !isTarget && !enemy && (
                <div style={{ width:24, height:24, borderRadius:"50%",
                  background:"rgba(0,0,0,.28)", pointerEvents:"none" }}/>
              )}

              {/* Enemy piece (shown behind capture ring if highlighted) */}
              {enemy && !isPiece && (
                <span style={{ fontSize:46, lineHeight:1, display:"block",
                  color:"#1a1a1a", textShadow:"0 1px 4px rgba(0,0,0,.4)",
                  filter: isHL ? "drop-shadow(0 0 6px rgba(239,68,68,.8))" : undefined,
                  opacity: dragging && isHover ? 0.6 : 1,
                  pointerEvents:"none", position:"relative", zIndex:1 }}>
                  {enemy.icon}
                </span>
              )}

              {/* Capture ring on enemy target */}
              {isHL && isEnemyTarget && (
                <div style={{ position:"absolute", inset:4, borderRadius:4,
                  border:"3px solid rgba(239,68,68,.7)", pointerEvents:"none" }}/>
              )}

              {isPiece && !dragging && (
                <span onMouseDown={startDrag} onTouchStart={startDrag}
                  style={{ fontSize:50, lineHeight:1, color:"#fff",
                    textShadow:"0 2px 8px rgba(0,0,0,.8)",
                    cursor:"pointer", position:"relative", zIndex:2, display:"block",
                    filter: selected ? "drop-shadow(0 0 10px rgba(74,222,128,.9))" : undefined }}>
                  {stepPieceIcon}
                </span>
              )}

              {isPiece && dragging && (
                <div style={{ width:CELL-10, height:CELL-10, borderRadius:8,
                  border:"2px dashed rgba(255,255,255,.25)" }}/>
              )}
            </div>
          );
        })
      )}

      {/* SVG: hint arrow (only step 0) + star */}
      <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }}>
        {showHint && (
          <>
            <line x1={fromX} y1={fromY} x2={toX} y2={toY}
              stroke="rgba(40,200,90,.55)" strokeWidth={16} strokeLinecap="round"/>
            <polygon
              points={`${toX},${toY - 8} ${toX - 8},${toY + 8} ${toX + 8},${toY + 8}`}
              fill="rgba(40,200,90,.7)"
            />
          </>
        )}
        <text x={toX} y={toY+12} textAnchor="middle" fontSize={44}
          style={{ userSelect:"none" }}>⭐</text>
      </svg>

      {/* Ghost piece while dragging */}
      {dragging && (
        <div style={{ position:"absolute",
          left: relCursor.x - CELL/2, top: relCursor.y - CELL/2,
          width:CELL, height:CELL, borderRadius:"50%",
          background: isHoverTarget ? "rgba(74,222,128,.4)" : "rgba(37,99,235,.35)",
          display:"grid", placeItems:"center", fontSize:52,
          color:"#fff", textShadow:"0 2px 12px rgba(0,0,0,.9)",
          pointerEvents:"none", zIndex:200, transition:"background .12s",
          boxShadow: isHoverTarget ? "0 0 0 4px rgba(74,222,128,.7)" : "0 4px 20px rgba(0,0,0,.5)" }}>
          {stepPieceIcon}
        </div>
      )}

      {/* Coord labels */}
      {COLS_LABEL.map((c,i) => (
        <div key={c} style={{ position:"absolute",bottom:-22,left:i*CELL,width:CELL,
          textAlign:"center",fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600 }}>
          {c}
        </div>
      ))}
      {[8,7,6,5,4,3,2,1].map((r,i) => (
        <div key={r} style={{ position:"absolute",right:-22,top:i*CELL,height:CELL,
          lineHeight:`${CELL}px`,fontSize:12,color:"rgba(255,255,255,.4)",fontWeight:600 }}>
          {r}
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LearnLessonPage() {
  const { lessonId = "rux" } = useParams();
  const navigate = useNavigate();
  const lesson = LESSON_MAP[lessonId] ?? LESSON_MAP["rux"];

  const [stepIdx,      setStepIdx]      = useState(0);
  const [completed,    setCompleted]    = useState<number[]>([]);
  const [showDone,     setShowDone]     = useState(false);
  const [stepMistakes, setStepMistakes] = useState(0);
  const [totalMistakes,setTotalMistakes]= useState(0);
  const [stepStars,    setStepStars]    = useState<number[]>([]);
  const [stepResult,   setStepResult]   = useState<number|null>(null); // stars to show in overlay

  const showHint = stepIdx === 0;

  function handleStepComplete() {
    const stars = stepMistakes === 0 ? 3 : stepMistakes === 1 ? 2 : 1;
    const next  = stepIdx + 1;
    setCompleted(p => [...p, stepIdx]);
    setStepStars(p  => [...p, stars]);
    setTotalMistakes(m => m + stepMistakes);
    setStepMistakes(0);
    setStepResult(stars);
    setTimeout(() => {
      setStepResult(null);
      if (next >= lesson.steps.length) setShowDone(true);
      else setStepIdx(next);
    }, 1200);
  }

  function handleMistake() {
    setStepMistakes(m => m + 1);
  }

  function reset() {
    setStepIdx(0);
    setCompleted([]);
    setShowDone(false);
    setStepMistakes(0);
    setTotalMistakes(0);
    setStepStars([]);
    setStepResult(null);
  }

  const activeSection = SIDEBAR.find(s => s.lessons.some(l => l.id === lessonId));

  const [openSections, setOpenSections] = useState<string[]>(
    () => activeSection ? [activeSection.title] : [SIDEBAR[0].title]
  );

  function toggleSection(title: string) {
    setOpenSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 60px)", margin:"-20px", background:"#181c28" }}>

      {/* ── SIDEBAR (compact) ── */}
      <div style={{ width:200, flexShrink:0, background:"#10131a", borderRight:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <span style={{ fontSize:18 }}>♞</span>
          <span style={{ fontWeight:800, fontSize:14 }}>Menyu</span>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {SIDEBAR.map(section => {
            const isActive  = section === activeSection;
            const isOpen    = openSections.includes(section.title);
            const hasLessons = section.lessons.length > 0;
            return (
              <div key={section.title}>
                {/* Section header — clickable accordion */}
                <div onClick={() => hasLessons && toggleSection(section.title)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"9px 14px", fontSize:12, fontWeight:700, letterSpacing:".01em",
                    color: isActive ? "#fff" : isOpen ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.35)",
                    borderBottom:"1px solid rgba(255,255,255,.05)",
                    cursor: hasLessons ? "pointer" : "default",
                    background: isActive ? "rgba(37,99,235,.15)" : "transparent",
                    transition:"background .15s" }}>
                  <span>{section.title}</span>
                  {hasLessons && (
                    <span style={{ fontSize:10, opacity:.6, transition:"transform .2s",
                      display:"inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  )}
                </div>

                {/* Lessons list */}
                {isOpen && section.lessons.map(l => (
                  <div key={l.id}
                    onClick={() => { reset(); navigate(`/student/learn/${l.id}`); }}
                    style={{ display:"flex", alignItems:"center", gap:8,
                      padding:"7px 14px 7px 22px", cursor:"pointer",
                      background: l.id === lessonId ? "#2563eb" : "transparent",
                      borderBottom:"1px solid rgba(255,255,255,.04)",
                      transition:"background .1s" }}>
                    <span style={{ fontSize:15, flexShrink:0,
                      color: l.id===lessonId ? "#fff" : "rgba(255,255,255,.4)" }}>
                      {l.icon}
                    </span>
                    <span style={{ fontSize:12.5, fontWeight:600,
                      color: l.id===lessonId ? "#fff" : "rgba(255,255,255,.5)" }}>
                      {l.title}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,.07)" }}>
          <button onClick={() => navigate("/student/learn")}
            style={{ width:"100%", padding:"7px 8px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:11.5, cursor:"pointer" }}>
            ← Qaytish
          </button>
        </div>
      </div>

      {/* ── BOARD ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px 60px" }}>
        {showDone ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:8 }}>🏆</div>
            <div style={{ fontSize:52, marginBottom:12, lineHeight:1 }}>
              {"⭐".repeat(totalMistakes === 0 ? 3 : totalMistakes === 1 ? 2 : 1)}
            </div>
            <div style={{ fontSize:26, fontWeight:900, marginBottom:8 }}>
              {totalMistakes === 0 ? "Mukammal!" : totalMistakes === 1 ? "Ajoyib!" : "Yaxshi!"}
            </div>
            <div style={{ fontSize:15, color:"rgba(255,255,255,.5)", marginBottom:4 }}>
              Barcha {lesson.steps.length} ta mashq bajarildi!
            </div>
            {totalMistakes > 0 && (
              <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", marginBottom:4 }}>
                {totalMistakes} ta xato qilindi
              </div>
            )}
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:24 }}>
              <button className="btn" style={{ background:"#2563eb", color:"#fff", border:"none" }} onClick={reset}>
                Qayta ishlash
              </button>
              <button className="btn" style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", color:"#fff" }}
                onClick={() => navigate("/student/learn")}>
                O'rganishga qaytish
              </button>
            </div>
          </div>
        ) : stepResult !== null ? (
          /* Per-step result overlay */
          <div style={{ textAlign:"center", animation:"fadeIn .2s ease" }}>
            <div style={{ fontSize:64, marginBottom:10, lineHeight:1 }}>
              {"⭐".repeat(stepResult)}{"☆".repeat(3 - stepResult)}
            </div>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:6,
              color: stepResult===3 ? "#4ade80" : stepResult===2 ? "#facc15" : "#fb923c" }}>
              {stepResult===3 ? "Mukammal!" : stepResult===2 ? "Yaxshi!" : "Davom eting!"}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>
              {stepIdx + 1}/{lesson.steps.length} bosqich
            </div>
          </div>
        ) : (
          <Board lesson={lesson} stepIdx={stepIdx} showHint={showHint} onStepComplete={handleStepComplete} onMistake={handleMistake} />
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width:270, flexShrink:0, padding:"20px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {/* Lesson card */}
        <div style={{ borderRadius:13, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,.4)" }}>
          {/* Blue header */}
          <div style={{ background:"#2563eb", padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:"rgba(255,255,255,.2)", display:"grid", placeItems:"center", fontSize:24, flexShrink:0 }}>
              {lesson.pieceIcon}
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:17, color:"#fff" }}>{lesson.title}</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,.7)", marginTop:2, lineHeight:1.35 }}>{lesson.desc}</div>
            </div>
          </div>
          {/* Instruction */}
          <div style={{ background:"#1a1f30", padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            <p style={{ margin:0, fontSize:13.5, textAlign:"center", lineHeight:1.6, color:"rgba(255,255,255,.8)", fontWeight:600 }}>
              {showDone ? "Barcha mashqlar bajarildi! 🎉" : lesson.instruction}
            </p>
          </div>
          {/* Steps */}
          <div style={{ background:"#1a1f30", padding:"10px 16px", display:"flex", gap:6, flexWrap:"wrap" }}>
            {lesson.steps.map((_,i) => {
              const isDone    = completed.includes(i);
              const isCurrent = i === stepIdx && !showDone;
              const stars     = stepStars[i];
              const bgColor   = isDone
                ? (stars===3 ? "#22c55e" : stars===2 ? "#ca8a04" : "#ea580c")
                : isCurrent ? "#2563eb" : "rgba(255,255,255,.07)";
              return (
                <div key={i}
                  onClick={() => { if (!showDone) setStepIdx(i); }}
                  style={{ width:44, height:44, borderRadius:9, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", cursor:"pointer",
                    background: bgColor,
                    border: isCurrent ? "2px solid #60a5fa" : "1.5px solid transparent",
                    gap:1 }}>
                  {isDone && stars !== undefined ? (
                    <>
                      <div style={{ fontSize:9, lineHeight:1, letterSpacing:"-1px" }}>
                        {"★".repeat(stars)}{"☆".repeat(3 - stars)}
                      </div>
                      <div style={{ fontSize:10, fontWeight:800, color:"#fff", lineHeight:1 }}>{i+1}</div>
                    </>
                  ) : (
                    <div style={{ fontSize:13, fontWeight:800,
                      color: isCurrent ? "#fff" : "rgba(255,255,255,.35)" }}>
                      {i+1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint status */}
        {!showDone && (
          <div style={{ borderRadius:10, padding:"10px 13px", fontSize:12, lineHeight:1.55, color:"rgba(255,255,255,.5)",
            background: showHint ? "rgba(40,200,90,.1)" : "rgba(255,255,255,.04)",
            border: `1px solid ${showHint ? "rgba(40,200,90,.3)" : "rgba(255,255,255,.08)"}`,
            transition:"all .4s" }}>
            {showHint
              ? <><span style={{ color:"#4ade80", fontWeight:700 }}>💡 Ko'rsatma:</span> Yashil yo'l bo'ylab yulduzchaga boring.</>
              : <><span style={{ color:"rgba(255,255,255,.3)", fontWeight:700 }}>🧠 Eslang:</span> Yulduzchani toping va bosing!</>
            }
          </div>
        )}
      </div>
    </div>
  );
}
