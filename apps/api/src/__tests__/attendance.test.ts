import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

describe("Attendance marking and lesson-credit consumption", () => {
  let app: FastifyInstance;
  let tenant: TestTenant;
  let scheduleSlotId: string;
  let studentPackageId: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant("att");

    const pkgRes = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES ($1, 'Test Package', 8, 500000) RETURNING id`,
      [tenant.tenantId]
    );
    const spRes = await pool.query(
      `INSERT INTO student_packages (student_id, package_id, total_lessons, used_lessons, status, purchased_at)
       VALUES ($1, $2, 8, 0, 'active', now()) RETURNING id`,
      [tenant.studentId, pkgRes.rows[0].id]
    );
    studentPackageId = spRes.rows[0].id;

    const slotRes = await pool.query(
      `INSERT INTO schedule_slots (tenant_id, group_id, day_of_week, start_time, duration_minutes, lesson_type)
       VALUES ($1, $2, 1, '10:00', 60, 'guruh') RETURNING id`,
      [tenant.tenantId, tenant.groupId]
    );
    scheduleSlotId = slotRes.rows[0].id;
  });

  afterAll(async () => {
    await destroyTestTenant(tenant.tenantId);
    await app.close();
  });

  it("consumes exactly one lesson credit when a student is marked present", async () => {
    const token = await loginAs(app, tenant.admin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(token),
      payload: {
        scheduleSlotId,
        date: "2099-02-01",
        records: [{ studentId: tenant.studentId, status: "p" }],
      },
    });
    expect(res.statusCode).toBe(200);

    const { rows } = await pool.query(`SELECT used_lessons FROM student_packages WHERE id = $1`, [studentPackageId]);
    expect(rows[0].used_lessons).toBe(1);
  });

  it("does not consume a second credit when the same attendance is re-submitted with the same status", async () => {
    const token = await loginAs(app, tenant.admin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(token),
      payload: {
        scheduleSlotId,
        date: "2099-02-01",
        records: [{ studentId: tenant.studentId, status: "p" }],
      },
    });
    expect(res.statusCode).toBe(200);

    const { rows } = await pool.query(`SELECT used_lessons FROM student_packages WHERE id = $1`, [studentPackageId]);
    expect(rows[0].used_lessons).toBe(1);
  });

  it("refunds the credit when status changes to excused ('ae')", async () => {
    const token = await loginAs(app, tenant.admin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(token),
      payload: {
        scheduleSlotId,
        date: "2099-02-01",
        records: [{ studentId: tenant.studentId, status: "ae", reason: "sababli" }],
      },
    });
    expect(res.statusCode).toBe(200);

    const { rows } = await pool.query(`SELECT used_lessons FROM student_packages WHERE id = $1`, [studentPackageId]);
    expect(rows[0].used_lessons).toBe(0);
  });
});
