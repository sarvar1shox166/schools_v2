import { useEffect, useState } from "react";

interface ErrorToastItem {
  id: number;
  message: string;
}

let toasts: ErrorToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function showError(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4500);
}

export function useErrorToasts() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return toasts;
}

/** Axios xatosidan foydalanuvchiga tushunarli xabar chiqaradi. */
export function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { error?: string }; status?: number }; message?: string };
  if (anyErr.response?.status === 401) return ""; // 401 — auth interceptor o'zi hal qiladi, toast shart emas
  return anyErr.response?.data?.error || "Amalni bajarishda xatolik yuz berdi. Qaytadan urinib ko'ring.";
}
