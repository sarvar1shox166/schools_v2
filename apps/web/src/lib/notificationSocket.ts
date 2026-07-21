import { useEffect } from "react";
import { queryClient } from "../main.js";
import { useAuthStore } from "./auth-store.js";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/v1/ws/notifications`;
}

function closeSocket() {
  generation++;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
}

function connect(token: string) {
  const myGeneration = ++generation;
  const socket = new WebSocket(wsUrl());
  ws = socket;

  socket.onopen = () => {
    if (generation !== myGeneration) return;
    socket.send(JSON.stringify({ type: "auth", token }));
  };

  socket.onmessage = (e) => {
    if (generation !== myGeneration) return;
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "new") {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch {
      // e'tiborsiz — noto'g'ri formatdagi xabar
    }
  };

  socket.onclose = () => {
    if (generation !== myGeneration) return;
    ws = null;
    reconnectTimer = setTimeout(() => {
      const currentToken = useAuthStore.getState().accessToken;
      if (currentToken) connect(currentToken);
    }, 4000);
  };

  socket.onerror = () => socket.close();
}

/** Bildirishnomalar uchun real-time WS ulanishini boshqaradi — yangi
 *  bildirishnoma kelganda serverdan signal olib, ro'yxatni qayta so'raydi.
 *  30 soniyalik pollingga (useUnreadNotifications) zaxira sifatida qo'shiladi. */
export function useNotificationSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    connect(accessToken);
    return () => closeSocket();
  }, [accessToken]);
}
