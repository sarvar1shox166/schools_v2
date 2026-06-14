const AV_COLORS = [
  "linear-gradient(140deg,#6366f1,#8b5cf6)",
  "linear-gradient(140deg,#0ea5a4,#14b8a6)",
  "linear-gradient(140deg,#f59e0b,#f97316)",
  "linear-gradient(140deg,#ec4899,#f43f5e)",
  "linear-gradient(140deg,#3b82f6,#06b6d4)",
  "linear-gradient(140deg,#10b981,#84cc16)",
  "linear-gradient(140deg,#8b5cf6,#d946ef)",
  "linear-gradient(140deg,#0891b2,#0ea5e9)",
  "linear-gradient(140deg,#e11d48,#fb7185)",
  "linear-gradient(140deg,#7c3aed,#6366f1)",
];

export function avColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase();
}

export function fmtSom(n: number) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}
