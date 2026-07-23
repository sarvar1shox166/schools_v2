import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

/** Refresh-token revocation: parol tiklanganda va logout-all'da eski
 *  refresh-tokenlar ishlamay qolishi. */
describe("refresh token revocation", () => {
  let app: FastifyInstance;
  let t: TestTenant;

  async function login(phone: string) {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { login: phone, password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    return JSON.parse(res.body) as { accessToken: string; refreshToken: string };
  }

  async function refresh(refreshToken: string) {
    return app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
  }

  beforeAll(async () => {
    app = await createTestApp();
    t = await createTestTenant("revoke");
  });

  afterAll(async () => {
    await destroyTestTenant(t.tenantId);
    await app.close();
  });

  it("oddiy refresh ishlaydi va yangi juftlik qaytaradi", async () => {
    const session = await login(t.studentUser.phone);
    const res = await refresh(session.refreshToken);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it("parol tiklangandan keyin eski refresh-token 401 qaytaradi", async () => {
    const session = await login(t.studentUser.phone);
    const adminToken = await loginAs(app, t.admin.phone);

    const resetRes = await app.inject({
      method: "POST",
      url: `/api/v1/students/${t.studentId}/reset-password`,
      headers: authHeader(adminToken),
    });
    expect(resetRes.statusCode).toBe(200);

    const res = await refresh(session.refreshToken);
    expect(res.statusCode).toBe(401);
  });

  it("logout-all barcha eski refresh-tokenlarni bekor qiladi", async () => {
    const s1 = await login(t.teacherUser.phone);
    const s2 = await login(t.teacherUser.phone);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout-all",
      headers: authHeader(s1.accessToken),
    });
    expect(res.statusCode).toBe(200);

    expect((await refresh(s1.refreshToken)).statusCode).toBe(401);
    expect((await refresh(s2.refreshToken)).statusCode).toBe(401);

    // Qayta login qilinganda yangi token normal ishlaydi
    const s3 = await login(t.teacherUser.phone);
    expect((await refresh(s3.refreshToken)).statusCode).toBe(200);
  });

  it("buzilgan refresh-token 401 qaytaradi", async () => {
    const res = await refresh("not-a-real-token");
    expect(res.statusCode).toBe(401);
  });
});
