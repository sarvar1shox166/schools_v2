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

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_SECRET });

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
