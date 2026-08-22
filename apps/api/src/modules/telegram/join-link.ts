import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env.js";

export interface JoinTokenPayload {
  studentId: string;
  scheduleSlotId: string;
  date: string;
}

/** Telegram xabaridagi "Darsga kirish" tugmasi shu token bilan ishlaydi —
 *  tugma bosilganda kim, qaysi dars uchun ekanini isbotlaydi, lekin
 *  o'zicha kirish huquqi bermaydi (server baribir checkStudentCanJoin
 *  orqali qayta tekshiradi). JWT ishlatmadik — bu yerda faqat 3 ta maydon
 *  bor, oddiy HMAC yetarli va URL qisqaroq bo'ladi. */
export function signJoinToken(payload: JoinTokenPayload): string {
  const data = `${payload.studentId}:${payload.scheduleSlotId}:${payload.date}`;
  const dataB64 = Buffer.from(data, "utf8").toString("base64url");
  const sig = createHmac("sha256", env.JWT_SECRET).update(dataB64).digest("base64url");
  return `${dataB64}.${sig}`;
}

export function verifyJoinToken(token: string): JoinTokenPayload | null {
  const [dataB64, sig] = token.split(".");
  if (!dataB64 || !sig) return null;

  const expectedSig = createHmac("sha256", env.JWT_SECRET).update(dataB64).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  const data = Buffer.from(dataB64, "base64url").toString("utf8");
  const [studentId, scheduleSlotId, date] = data.split(":");
  if (!studentId || !scheduleSlotId || !date) return null;
  return { studentId, scheduleSlotId, date };
}
