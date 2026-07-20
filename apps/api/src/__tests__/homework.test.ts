import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

describe("Homework completion XP idempotency", () => {
  let app: FastifyInstance;
  let tenant: TestTenant;
  let homeworkId: string;
  const XP_REWARD = 30;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant("hw");
    const hwRes = await pool.query(
      `INSERT INTO homework (tenant_id, group_id, title, xp_reward) VALUES ($1, $2, 'Test homework', $3) RETURNING id`,
      [tenant.tenantId, tenant.groupId, XP_REWARD]
    );
    homeworkId = hwRes.rows[0].id;
  });

  afterAll(async () => {
    await destroyTestTenant(tenant.tenantId);
    await app.close();
  });

  it("awards XP only once even if the student marks the same homework complete repeatedly", async () => {
    const token = await loginAs(app, tenant.studentUser.phone);

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/homework/${homeworkId}/complete`,
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(201);
    }

    const { rows } = await pool.query(`SELECT xp FROM student_xp WHERE student_id = $1`, [tenant.studentId]);
    expect(rows[0]?.xp ?? 0).toBe(XP_REWARD);
  });
});
