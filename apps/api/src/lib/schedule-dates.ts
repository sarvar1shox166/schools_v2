// DB konvensiyasi: 0=Dushanba ... 6=Yakshanba (JS Date.getDay(): 0=Yakshanba ... 6=Shanba)

export function dayOfWeekOf(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** Berilgan hafta kuniga mos eng yaqin sanani qaytaradi (bugun mos kelsa — bugun). */
export function nextDateForDow(dow: number, from: Date = new Date()): string {
  const nowDow = dayOfWeekOf(from);
  const diff = (dow - nowDow + 7) % 7;
  const d = new Date(from);
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}
