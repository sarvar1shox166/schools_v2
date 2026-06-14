import { useEffect, useRef, useState } from "react";
import { Avatar, Card, Icon, PageHead, Segmented } from "@chess-school/ui";
import { ChessBoard } from "../../components/ChessBoard.js";
import { CoordinateTrainer } from "../../components/CoordinateTrainer.js";
import { useAuthStore } from "../../lib/auth-store.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const RESULT_LABELS: Record<string, string> = {
  white_wins: "Oq g'alaba qozondi (mat)",
  black_wins: "Qora g'alaba qozondi (mat)",
  white_wins_resign: "Oq g'alaba qozondi (raqib taslim bo'ldi)",
  black_wins_resign: "Qora g'alaba qozondi (raqib taslim bo'ldi)",
  draw_stalemate: "Durang (pat)",
  draw_repetition: "Durang (takrorlanish)",
  draw_material: "Durang (yetarli material yo'q)",
  draw: "Durang",
  opponent_disconnected: "Raqib o'yindan chiqdi",
};

const TIME_CONTROLS = [
  { tc: "1+0", type: "Bullet", cls: "tc-bullet" },
  { tc: "3+0", type: "Blits", cls: "tc-blitz" },
  { tc: "5+0", type: "Blits", cls: "tc-blitz" },
  { tc: "10+0", type: "Rapid", cls: "tc-rapid" },
  { tc: "15+10", type: "Rapid", cls: "tc-rapid" },
  { tc: "30+0", type: "Klassik", cls: "tc-klassik" },
];

const TABS = [
  { v: "pvp", label: "Jonli o'yin" },
  { v: "coords", label: "Koordinata mashqi" },
];

type Status = "idle" | "connecting" | "queued" | "playing" | "finished";
type OnlinePlayer = { studentId: string; fullName: string };

export default function PvpPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [tab, setTab] = useState("pvp");
  const [status, setStatus] = useState<Status>("idle");
  const [color, setColor] = useState<"w" | "b" | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [fen, setFen] = useState(START_FEN);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [timeControl, setTimeControl] = useState("5+0");
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<{ fromStudentId: string; fromName: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  function startSearch() {
    if (!accessToken) return;
    setError(null);
    setResult(null);
    setColor(null);
    setOpponent(null);
    setFen(START_FEN);
    setOnlinePlayers([]);
    setIncomingChallenge(null);
    setStatus("connecting");

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/pvp?token=${encodeURIComponent(accessToken)}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("queued");
    ws.onclose = () => setStatus((s) => (s === "playing" ? "finished" : "idle"));
    ws.onerror = () => setError("Ulanishda xatolik yuz berdi");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "queued") {
        setStatus("queued");
      } else if (msg.type === "online_list") {
        setOnlinePlayers(msg.players);
      } else if (msg.type === "challenge_received") {
        setIncomingChallenge({ fromStudentId: msg.fromStudentId, fromName: msg.fromName });
      } else if (msg.type === "challenge_declined") {
        setError(`${msg.byName} taklifni rad etdi`);
      } else if (msg.type === "matched") {
        setIncomingChallenge(null);
        setColor(msg.color);
        setOpponent(msg.opponent);
        setFen(msg.fen);
        setStatus("playing");
      } else if (msg.type === "move") {
        setFen(msg.fen);
        if (msg.gameOver) {
          setResult(msg.result);
          setStatus("finished");
        }
      } else if (msg.type === "error") {
        setError(msg.message);
      } else if (msg.type === "ended") {
        setResult(msg.reason);
        setStatus("finished");
      }
    };
  }

  function handleMove(from: string, to: string) {
    setError(null);
    wsRef.current?.send(JSON.stringify({ type: "move", from, to, promotion: "q" }));
  }

  function resign() {
    wsRef.current?.send(JSON.stringify({ type: "resign" }));
  }

  function sendChallenge(targetStudentId: string) {
    wsRef.current?.send(JSON.stringify({ type: "challenge", targetStudentId }));
  }

  function respondChallenge(accept: boolean) {
    if (!incomingChallenge) return;
    wsRef.current?.send(JSON.stringify({
      type: accept ? "challenge_accept" : "challenge_decline",
      fromStudentId: incomingChallenge.fromStudentId,
    }));
    setIncomingChallenge(null);
  }

  return (
    <div>
      <PageHead title="Jonli o'yin (PvP)">
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </PageHead>

      {tab === "coords" && (
        <Card className="card-pad fade-up">
          <CoordinateTrainer />
        </Card>
      )}

      {tab === "pvp" && (
        <>
          {status === "idle" && (
            <Card className="card-pad fade-up">
              <p className="cell-sub" style={{ marginBottom: 12 }}>
                Boshqa o'quvchi bilan jonli shaxmat o'ynang.
              </p>
              <div className="tc-grid-wrap" style={{ marginBottom: 14, maxWidth: 360 }}>
                <div className="tc-grid">
                  {TIME_CONTROLS.map(({ tc, type, cls }) => (
                    <button
                      key={tc}
                      className={"tc-btn " + cls + (timeControl === tc ? " active" : "")}
                      onClick={() => setTimeControl(tc)}
                      style={timeControl === tc ? { background: "var(--hover)", fontWeight: 700 } : undefined}
                    >
                      <div className="tc-num">{tc}</div>
                      <div className="tc-type">{type}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn primary" onClick={startSearch}>
                <Icon name="zap" size={14} /> Raqib qidirish
              </button>
            </Card>
          )}

          {(status === "connecting" || status === "queued") && (
            <>
              <Card className="card-pad fade-up">
                <div className="empty">
                  <Icon name="refresh" size={28} />
                  <div>Raqib qidirilmoqda...</div>
                </div>
              </Card>
              <Card className="fade-up">
                <div className="online-stat-bar">
                  <Icon name="students" size={16} />
                  <span className="cell-main">Onlayn o'quvchilar: {onlinePlayers.length}</span>
                </div>
                <div className="list">
                  {onlinePlayers.map((p) => (
                    <div className="op-row" key={p.studentId}>
                      <Avatar name={p.fullName} size="sm" />
                      <div className="cell-main" style={{ flex: 1 }}>{p.fullName}</div>
                      <button className="btn sm" onClick={() => sendChallenge(p.studentId)}>
                        <Icon name="swords" size={14} /> Chaqirish
                      </button>
                    </div>
                  ))}
                  {onlinePlayers.length === 0 && <div className="empty">Boshqa o'quvchilar onlayn emas</div>}
                </div>
              </Card>
            </>
          )}

          {(status === "playing" || status === "finished") && (
            <Card className="card-pad fade-up">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                <ChessBoard fen={fen} onMove={handleMove} disabled={status !== "playing"} flipped={color === "b"} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="cell-main" style={{ marginBottom: 6 }}>
                    Siz: {color === "w" ? "Oq" : "Qora"}
                  </div>
                  {opponent && <div className="cell-sub">Raqib: {opponent}</div>}
                  {error && <div className="badge dang" style={{ marginTop: 8 }}>{error}</div>}
                  {result && <div className="badge suc" style={{ marginTop: 8 }}>{RESULT_LABELS[result] ?? result}</div>}
                  {status === "playing" && (
                    <button className="btn" style={{ marginTop: 12 }} onClick={resign}>
                      Taslim bo'lish
                    </button>
                  )}
                  {status === "finished" && (
                    <button className="btn primary" style={{ marginTop: 12 }} onClick={startSearch}>
                      Yana o'ynash
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className={"chal-overlay" + (incomingChallenge ? " show" : "")}>
            <div className="chal-box">
              <div className="cell-main" style={{ marginBottom: 8 }}>
                {incomingChallenge?.fromName} sizni o'yinga taklif qilmoqda
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="btn primary" onClick={() => respondChallenge(true)}>Qabul qilish</button>
                <button className="btn" onClick={() => respondChallenge(false)}>Rad etish</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
