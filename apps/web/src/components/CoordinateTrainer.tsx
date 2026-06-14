import { useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function randomSquare(): string {
  const file = FILES[Math.floor(Math.random() * 8)];
  const rank = Math.floor(Math.random() * 8) + 1;
  return `${file}${rank}`;
}

export function CoordinateTrainer() {
  const [active, setActive] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showCoords, setShowCoords] = useState(true);

  function start() {
    setActive(true);
    setCorrect(0);
    setWrong(0);
    setStreak(0);
    setTarget(randomSquare());
  }

  function stop() {
    setActive(false);
    setTarget(null);
  }

  function handleClick(square: string) {
    if (!active || !target) return;
    if (square === target) {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }
    setTarget(randomSquare());
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ position: "relative", width: 320, maxWidth: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              aspectRatio: "1",
              borderRadius: 6,
              overflow: "hidden",
              border: "2.5px solid rgba(0,0,0,.4)",
            }}
          >
            {Array.from({ length: 8 }, (_, rowIdx) =>
              Array.from({ length: 8 }, (_, colIdx) => {
                const rank = 8 - rowIdx;
                const file = FILES[colIdx];
                const square = `${file}${rank}`;
                const isLight = (rowIdx + colIdx) % 2 === 0;
                return (
                  <div
                    key={square}
                    className="ksq active"
                    onClick={() => handleClick(square)}
                    style={{ background: isLight ? "#f0d9b5" : "#b58863", cursor: active ? "pointer" : "default" }}
                  >
                    {showCoords && (
                      <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, opacity: 0.6 }}>{square}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {target && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                fontSize: "clamp(50px, 9vw, 100px)",
                fontWeight: 900,
                fontFamily: "Georgia, serif",
                color: "rgba(255,255,255,.88)",
                textShadow: "2px 4px 20px rgba(0,0,0,.7)",
              }}
            >
              {target}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          {active ? (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <span>To'g'ri: <b style={{ color: "#22c55e" }}>{correct}</b></span>
                <span>Xato: <b style={{ color: "#f87171" }}>{wrong}</b></span>
                <span>🔥 Streak: <b style={{ color: "#fbbf24" }}>{streak}</b></span>
              </div>
              <button className="btn" onClick={stop}>To'xtatish</button>
            </>
          ) : (
            <>
              <label className="ktog" onClick={(e) => { e.preventDefault(); setShowCoords((v) => !v); }}>
                <div className={"ktog-sw " + (showCoords ? "on" : "off")}><div className="kknob" /></div>
                Koordinatlarni ko'rsatish
              </label>
              <button className="btn primary" style={{ marginTop: 12 }} onClick={start}>
                Boshlash
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
