import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

describe("Cross-tenant isolation", () => {
  let app: FastifyInstance;
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let packageIdB: string;
  let scheduleSlotIdB: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenantA = await createTestTenant("iso-a");
    tenantB = await createTestTenant("iso-b");

    const pkgRes = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES ($1, 'Secret Package', 8, 500000) RETURNING id`,
      [tenantB.tenantId]
    );
    packageIdB = pkgRes.rows[0].id;
    await pool.query(
      `INSERT INTO student_packages (student_id, package_id, total_lessons, used_lessons, status, purchased_at)
       VALUES ($1, $2, 8, 0, 'active', now())`,
      [tenantB.studentId, packageIdB]
    );

    const slotRes = await pool.query(
      `INSERT INTO schedule_slots (tenant_id, day_of_week, start_time, duration_minutes, lesson_type)
       VALUES ($1, 1, '10:00', 60, 'individual') RETURNING id`,
      [tenantB.tenantId]
    );
    scheduleSlotIdB = slotRes.rows[0].id;
    await pool.query(
      `INSERT INTO attendance_records (student_id, schedule_slot_id, date, status, lesson_counted)
       VALUES ($1, $2, '2099-01-01', 'p', true)`,
      [tenantB.studentId, scheduleSlotIdB]
    );
  });

  afterAll(async () => {
    await destroyTestTenant(tenantA.tenantId);
    await destroyTestTenant(tenantB.tenantId);
    await app.close();
  });

  it("does not leak another tenant's student packages", async () => {
    const token = await loginAs(app, tenantA.admin.phone);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/students/${tenantB.studentId}/packages`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("does not leak another tenant's attendance records", async () => {
    const token = await loginAs(app, tenantA.admin.phone);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/attendance?scheduleSlotId=${scheduleSlotIdB}&date=2099-01-01`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("rejects a student calling GET /students/:id/packages entirely", async () => {
    const token = await loginAs(app, tenantA.studentUser.phone);
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/students/${tenantA.studentId}/packages`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(403);
  });
});
