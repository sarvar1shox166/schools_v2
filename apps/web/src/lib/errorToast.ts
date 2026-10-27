import { useEffect, useState } from "react";

type ToastKind = "error" | "warning" | "info";

interface ErrorToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let toasts: ErrorToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function push(message: string, kind: ToastKind, ttl: number) {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, ttl);
}

export function showError(message: string) {
  push(message, "error", 4500);
}

/** Muvaffaqiyatli bo'lgan, lekin e'tibor talab qiladigan holat (masalan, paket yo'qligi) — uzoqroq turadi. */
export function showWarning(message: string) {
  push(message, "warning", 9000);
}

export function showInfo(message: string) {
  push(message, "info", 6000);
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
