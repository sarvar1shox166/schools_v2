import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function loginAs(app: FastifyInstance, login: string, password = "password123"): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { login, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${login}: ${res.statusCode} ${res.body}`);
  }
  return (JSON.parse(res.body) as { accessToken: string }).accessToken;
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}
