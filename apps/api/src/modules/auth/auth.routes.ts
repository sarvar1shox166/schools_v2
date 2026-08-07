import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../../env.js";
import { findUserByLogin, findUserByTelegramId, getUserAuthState, linkTelegramId, revokeAllSessions, verifyPassword } from "./auth.service.js";
import { verifyTelegramInitData } from "./telegram.js";
import { getRefreshJwt } from "../../plugins/auth.js";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

const telegramSchema = z.object({
  initData: z.string().min(1),
});

function issueSession(app: FastifyInstance, user: {
  id: string; tenantId: string | null; branchId: string | null;
  role: "super_admin" | "admin" | "teacher" | "student"; fullName: string; phone: string; login: string;
  avatarUrl: string | null;
  tokenVersion: number;
}) {
  const payload = {
    sub: user.id,
    tenantId: user.tenantId,
    branchId: user.branchId,
    role: user.role,
  };

  const accessToken = app.jwt.sign(payload, { expiresIn: "15m" });
  // Refresh-token ichiga joriy token_version (tv) muhrlanadi — parol tiklanganda
  // yoki "hamma qurilmadan chiqish"da tv oshiriladi va eski tokenlar o'ladi.
  const refreshToken = getRefreshJwt(app).sign({ ...payload, tv: user.tokenVersion }, { expiresIn: "30d" });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      login: user.login,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      avatarUrl: user.avatarUrl,
    },
  };
}

// Brute-force himoyasi: login/parol taxmin qilishga urinishlarni IP bo'yicha cheklaydi.
const loginRateLimit = {
  config: {
    rateLimit: { max: 10, timeWindow: "1 minute" },
  },
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", loginRateLimit, async (request, reply) => {
    const { login, password } = loginSchema.parse(request.body);

    const user = await findUserByLogin(login);

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send(issueSession(app, user));
  });

  app.post("/auth/telegram", async (request, reply) => {
    const { initData } = telegramSchema.parse(request.body);

    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.code(500).send({ error: "Telegram login is not configured" });
    }

    const verified = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    if (!verified) {
      return reply.code(401).send({ error: "Invalid Telegram data" });
    }

    const user = await findUserByTelegramId(verified.user.id);
    if (!user || !user.isActive) {
      return reply.code(404).send({ error: "telegram_not_linked" });
    }

    return reply.send(issueSession(app, user));
  });

  app.post("/me/telegram-link", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { initData } = telegramSchema.parse(request.body);

    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.code(500).send({ error: "Telegram login is not configured" });
    }

    const verified = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
    if (!verified) {
      return reply.code(401).send({ error: "Invalid Telegram data" });
    }

    try {
      await linkTelegramId(request.user.sub, verified.user.id);
    } catch (err) {
      if (err instanceof Error && err.message === "telegram_already_linked") {
        return reply.code(409).send({ error: "telegram_already_linked" });
      }
      throw err;
    }

    return reply.send({ ok: true });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.code(400).send({ error: "refreshToken required" });
    }

    let payload: { sub: string; tenantId: string | null; branchId: string | null; role: "super_admin"|"admin"|"teacher"|"student"; tv?: number };
    try {
      payload = getRefreshJwt(app).verify<typeof payload>(refreshToken);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }

    // Revocation tekshiruvi: hisob hali faol va token bekor qilinmaganmi.
    // Eski tokenlarda tv bo'lmaydi — ular 0-versiya deb qabul qilinadi, shuning
    // uchun birinchi revoke'dan keyin ular ham ishlamay qoladi.
    const state = await getUserAuthState(payload.sub);
    if (!state || !state.isActive) {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }
    if ((payload.tv ?? 0) !== state.tokenVersion) {
      return reply.code(401).send({ error: "Session revoked" });
    }

    const newPayload = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      role: payload.role,
    };

    const accessToken = app.jwt.sign(newPayload, { expiresIn: "15m" });
    const newRefreshToken = getRefreshJwt(app).sign({ ...newPayload, tv: state.tokenVersion }, { expiresIn: "30d" });

    return reply.send({ accessToken, refreshToken: newRefreshToken });
  });

  /** Hamma qurilmadan chiqish — foydalanuvchining barcha refresh-tokenlarini bekor qiladi.
   *  Joriy access-token o'z muddati (≤15 daqiqa) tugaguncha ishlashda davom etadi. */
  app.post("/auth/logout-all", { onRequest: [app.authenticate] }, async (request) => {
    await revokeAllSessions(request.user.sub);
    return { ok: true };
  });

  app.get("/auth/me", { onRequest: [app.authenticate] }, async (request) => {
    return request.user;
  });
}
