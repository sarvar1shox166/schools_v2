import { useEffect, useState } from "react";
import { Icon } from "./Icon.js";

interface XpToastItem {
  id: number;
  amount: number;
  message: string;
}

interface ConfettiPiece {
  id: number;
  left: number;
  bg: string;
  duration: number;
  delay: number;
}

const CONFETTI_COLORS = ["#3F8CFF", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#81b64c"];

let toasts: XpToastItem[] = [];
let confetti: ConfettiPiece[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function showXp(amount: number, message = "XP qo'lga kiritildi!") {
  (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (style: string) => void } } } })
    .Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");

  const id = nextId++;
  toasts = [...toasts, { id, amount, message }];

  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < 24; i++) {
    pieces.push({
      id: nextId++,
      left: Math.random() * 100,
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 1.6 + Math.random() * 1.4,
      delay: Math.random() * 0.4,
    });
  }
  confetti = [...confetti, ...pieces];
  emit();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3200);

  setTimeout(() => {
    const ids = new Set(pieces.map((p) => p.id));
    confetti = confetti.filter((c) => !ids.has(c.id));
    emit();
  }, 3200);
}

export function useXpToast() {
  return { showXp };
}

function useToastState() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return { toasts, confetti };
}

export function XpToastHost() {
  const { toasts: activeToasts, confetti: activeConfetti } = useToastState();

  return (
    <>
      {activeConfetti.map((c) => (
        <div
          key={c.id}
          className="conf"
          style={{
            left: `${c.left}%`,
            background: c.bg,
            "--d": `${c.duration}s`,
            "--dl": `${c.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {activeToasts.map((t) => (
        <div key={t.id} className="xpop show">
          <Icon name="zap" size={16} />
          <div>
            <b>+{t.amount} XP</b> &mdash; {t.message}
          </div>
        </div>
      ))}
    </>
  );
}
