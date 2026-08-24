// Backend API manzili — production'da crm.chesson.uz orqali (CORS ochiq),
// lokal ishlab chiqishda .env.local orqali override qilinadi.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://crm.chesson.uz/api/v1";

export interface LeadPayload {
  fullName: string;
  phone: string;
  ageRange?: string;
  preferredDays?: string;
}

export class LeadSubmitError extends Error {}

export async function submitLead(payload: LeadPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/public/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new LeadSubmitError("Juda ko'p urinish. Iltimos, bir necha daqiqadan so'ng qayta urinib ko'ring.");
    }
    throw new LeadSubmitError("So'rovni yuborib bo'lmadi. Iltimos, qayta urinib ko'ring yoki telefon orqali bog'laning.");
  }
}
