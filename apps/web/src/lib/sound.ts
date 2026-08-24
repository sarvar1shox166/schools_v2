import { useCallback, useState } from "react";

// Haqiqiy audio fayl talab qilmaslik uchun Web Audio API orqali qisqa
// "tok" tovushi sintez qilinadi — yurish va olish (capture) uchun ohang
// biroz farqlanadi, real shaxmat ilovalaridagi kabi.
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

const STORAGE_KEY = "chess_sound_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(on: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

export function playMoveSound(kind: "move" | "capture" = "move"): void {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "capture" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(kind === "capture" ? 190 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(kind === "capture" ? 100 : 210, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "capture" ? 0.24 : 0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "capture" ? 0.15 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    // Ovoz ixtiyoriy — brauzer autoplay siyosati yoki boshqa sabab bilan
    // ishlamasa, o'yin/masala oqimini buzmasligi kerak.
  }
}

export function useSoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);
  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);
  return { enabled, toggle };
}
