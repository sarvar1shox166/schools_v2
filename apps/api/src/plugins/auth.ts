import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export type Role = "super_admin" | "admin" | "teacher" | "student";

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  branchId: string | null;
  role: Role;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** `@fastify/jwt`'s built-in types only model the default (non-namespaced) registration. */
export interface RefreshJwt {
  sign(payload: JwtPayload, options?: Record<string, unknown>): string;
  verify<T = JwtPayload>(token: string): T;
}

export function getRefreshJwt(app: import("fastify").FastifyInstance): RefreshJwt {
  return (app.jwt as unknown as { refresh: RefreshJwt }).refresh;
}

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_SECRET });
  // Separate secret + namespace for refresh tokens so an access token can never
  // be replayed as a refresh token (or vice versa) — they are cryptographically distinct.
  await app.register(jwt, { secret: env.JWT_REFRESH_SECRET, namespace: "refresh" });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!roles.includes(request.user.role)) {
        reply.code(403).send({ error: "Forbidden" });
      }
    };
  });
});
