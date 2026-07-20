import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

describe("Staff role hierarchy", () => {
  let app: FastifyInstance;
  let tenant: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant("staff");
  });

  afterAll(async () => {
    await destroyTestTenant(tenant.tenantId);
    await app.close();
  });

  it("blocks an assistant_admin from creating a new admin account", async () => {
    const token = await loginAs(app, tenant.assistantAdmin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff",
      headers: authHeader(token),
      payload: { fullName: "Rogue Admin", phone: `+998${Math.floor(900000000 + Math.random() * 90000000)}`, role: "admin" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("allows an assistant_admin to create a lower-ranked operator account", async () => {
    const token = await loginAs(app, tenant.assistantAdmin.phone);
    const phone = `+998${Math.floor(900000000 + Math.random() * 90000000)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff",
      headers: authHeader(token),
      payload: { fullName: "New Operator", phone, role: "operator" },
    });
    expect(res.statusCode).toBe(201);
    await pool.query(`DELETE FROM users WHERE phone = $1`, [phone]);
  });

  it("blocks an assistant_admin from deleting an existing admin", async () => {
    const token = await loginAs(app, tenant.assistantAdmin.phone);
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/staff/${tenant.admin.id}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(403);

    const { rows } = await pool.query(`SELECT id FROM users WHERE id = $1`, [tenant.admin.id]);
    expect(rows.length).toBe(1);
  });
});
