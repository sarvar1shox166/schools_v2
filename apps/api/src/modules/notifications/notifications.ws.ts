import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { JwtPayload } from "../../plugins/auth.js";

// userId → ochiq WS ulanishlar (bir foydalanuvchi bir nechta tabda ochishi mumkin).
const userSockets = new Map<string, Set<WebSocket>>();

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}

/** Yangi bildirishnoma yozilganda chaqiriladi — shu foydalanuvchining ochiq
 *  tablariga signal yuboradi, ular esa REST orqali ro'yxatni qayta so'raydi. */
export function pushNotificationPing(userId: string) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const s of sockets) send(s, { type: "new" });
}

export async function notificationsWsRoutes(app: FastifyInstance) {
  // Auth token birinchi WS xabari sifatida yuboriladi (URL query'da emas) —
  // shunda u proxy log'lari yoki brauzer tarixida qolib ketmaydi (pvp.ws.ts'dagi naqsh).
  app.get("/ws/notifications", { websocket: true }, async (socket) => {
    const payload = await new Promise<JwtPayload | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      socket.once("message", (raw) => {
        clearTimeout(timeout);
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type !== "auth" || typeof msg.token !== "string") return resolve(null);
          resolve(app.jwt.verify<JwtPayload>(msg.token));
        } catch {
          resolve(null);
        }
      });
    });
    if (!payload) { socket.close(4001, "Unauthorized"); return; }

    const userId = payload.sub;
    let sockets = userSockets.get(userId);
    if (!sockets) { sockets = new Set(); userSockets.set(userId, sockets); }
    sockets.add(socket);

    socket.on("close", () => {
      sockets?.delete(socket);
      if (sockets && sockets.size === 0) userSockets.delete(userId);
    });
  });
}
