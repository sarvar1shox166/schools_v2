import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { hashPassword } from "../modules/auth/auth.service.js";
import { createTestApp, loginAs, authHeader } from "./helpers.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

describe("Student deletion safeguards and deactivation", () => {
  let app: FastifyInstance;
  let tenant: TestTenant;
  let adminToken: string;

  async function makeStudent(label: string): Promise<{ studentId: string; userId: string; phone: string }> {
    const phone = `+998${Math.floor(100000000 + Math.random() * 800000000)}`;
    const hash = await hashPassword("password123");
    const u = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
       VALUES ($1, 'student', $2, $3, $3, $4) RETURNING id`,
      [tenant.tenantId, `Del ${label}`, phone, hash]
    );
    const s = await pool.query(
      `INSERT INTO students (tenant_id, user_id) VALUES ($1, $2) RETURNING id`,
      [tenant.tenantId, u.rows[0].id]
    );
    return { studentId: s.rows[0].id, userId: u.rows[0].id, phone };
  }

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant("stu-del");
    adminToken = await loginAs(app, tenant.admin.phone);
  });

  afterAll(async () => {
    await destroyTestTenant(tenant.tenantId);
    await app.close();
  });

  it("deletes a student with no financial history, together with their empty future individual slots", async () => {
    const st = await makeStudent("clean");
    const slot = await pool.query(
      `INSERT INTO schedule_slots (tenant_id, teacher_id, student_id, lesson_type, custom_name, day_of_week, start_time, duration_minutes, specific_date)
       VALUES ($1, $2, $3, 'individual', 'future', 1, '10:00', 60, '2099-12-01') RETURNING id`,
      [tenant.tenantId, tenant.teacherId, st.studentId]
    );

    const impact = await app.inject({ method: "GET", url: `/api/v1/students/${st.studentId}/deletion-impact`, headers: authHeader(adminToken) });
    expect(impact.statusCode).toBe(200);
    expect(impact.json().canDelete).toBe(true);
    expect(impact.json().counts.futureEmptySlots).toBe(1);

    const del = await app.inject({ method: "DELETE", url: `/api/v1/students/${st.studentId}`, headers: authHeader(adminToken) });
    expect(del.statusCode).toBe(200);

    expect((await pool.query(`SELECT 1 FROM students WHERE id = $1`, [st.studentId])).rows.length).toBe(0);
    expect((await pool.query(`SELECT 1 FROM users WHERE id = $1`, [st.userId])).rows.length).toBe(0);
    expect((await pool.query(`SELECT 1 FROM schedule_slots WHERE id = $1`, [slot.rows[0].id])).rows.length).toBe(0);
  });

  it("refuses to delete a student who has payments, debts or packages (409) and lists why", async () => {
    const st = await makeStudent("paid");
    const pkg = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES ($1, 'P', 8, 450000) RETURNING id`,
      [tenant.tenantId]
    );
    const sp = await pool.query(
      `INSERT INTO student_packages (student_id, package_id, total_lessons, used_lessons, status, purchased_at)
       VALUES ($1, $2, 8, 2, 'active', now()) RETURNING id`,
      [st.studentId, pkg.rows[0].id]
    );
    const charge = await pool.query(
      `INSERT INTO student_charges (tenant_id, student_id, student_package_id, amount) VALUES ($1, $2, $3, 450000) RETURNING id`,
      [tenant.tenantId, st.studentId, sp.rows[0].id]
    );
    await pool.query(
      `INSERT INTO transactions (tenant_id, student_id, student_package_id, charge_id, amount, method, status, paid_at)
       VALUES ($1, $2, $3, $4, 200000, 'naqd', 'paid', now())`,
      [tenant.tenantId, st.studentId, sp.rows[0].id, charge.rows[0].id]
    );

    const impact = await app.inject({ method: "GET", url: `/api/v1/students/${st.studentId}/deletion-impact`, headers: authHeader(adminToken) });
    const body = impact.json();
    expect(body.canDelete).toBe(false);
    expect(body.counts.paidTotal).toBe(200000);
    expect(body.counts.outstandingDebt).toBe(250000);
    expect(body.counts.remainingLessons).toBe(6);
    expect(body.blockers.map((b: { code: string }) => b.code).sort()).toEqual(["charges", "packages", "transactions"]);

    const del = await app.inject({ method: "DELETE", url: `/api/v1/students/${st.studentId}`, headers: authHeader(adminToken) });
    expect(del.statusCode).toBe(409);
    expect(del.json().blockers.length).toBe(3);
    expect((await pool.query(`SELECT 1 FROM students WHERE id = $1`, [st.studentId])).rows.length).toBe(1);
  });

  it("refuses to delete a student whose individual lessons already paid a teacher", async () => {
    const st = await makeStudent("lessons");
    const slot = await pool.query(
      `INSERT INTO schedule_slots (tenant_id, teacher_id, student_id, lesson_type, custom_name, day_of_week, start_time, duration_minutes, specific_date)
       VALUES ($1, $2, $3, 'individual', 'past', 1, '10:00', 60, '2099-01-01') RETURNING id`,
      [tenant.tenantId, tenant.teacherId, st.studentId]
    );
    await pool.query(
      `INSERT INTO lesson_sessions (schedule_slot_id, teacher_id, lesson_type, date, students_count, rate, amount)
       VALUES ($1, $2, 'individual', '2099-01-01', 0, 100000, 100000)`,
      [slot.rows[0].id, tenant.teacherId]
    );

    const del = await app.inject({ method: "DELETE", url: `/api/v1/students/${st.studentId}`, headers: authHeader(adminToken) });
    expect(del.statusCode).toBe(409);
    expect(del.json().blockers.map((b: { code: string }) => b.code)).toContain("lesson_history");
  });

  it("returns 404 for a student of another tenant", async () => {
    const other = await createTestTenant("stu-del-other");
    try {
      const res = await app.inject({ method: "DELETE", url: `/api/v1/students/${other.studentId}`, headers: authHeader(adminToken) });
      expect(res.statusCode).toBe(404);
      expect((await pool.query(`SELECT 1 FROM students WHERE id = $1`, [other.studentId])).rows.length).toBe(1);
    } finally {
      await destroyTestTenant(other.tenantId);
    }
  });

  it("deactivate keeps all history but blocks login; activate restores it", async () => {
    const st = await makeStudent("deact");

    const off = await app.inject({ method: "POST", url: `/api/v1/students/${st.studentId}/deactivate`, headers: authHeader(adminToken) });
    expect(off.statusCode).toBe(200);
    const row = await pool.query(
      `SELECT s.status, u.is_active FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`, [st.studentId]
    );
    expect(row.rows[0].status).toBe("nofaol");
    expect(row.rows[0].is_active).toBe(false);

    const blocked = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { login: st.phone, password: "password123" } });
    expect(blocked.statusCode).not.toBe(200);

    const on = await app.inject({ method: "POST", url: `/api/v1/students/${st.studentId}/activate`, headers: authHeader(adminToken) });
    expect(on.statusCode).toBe(200);
    const ok = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { login: st.phone, password: "password123" } });
    expect(ok.statusCode).toBe(200);
  });

  it("PATCH status 'nofaol' also blocks login (stays consistent with deactivate)", async () => {
    const st = await makeStudent("patch");
    const res = await app.inject({
      method: "PATCH", url: `/api/v1/students/${st.studentId}`,
      headers: authHeader(adminToken), payload: { status: "nofaol" },
    });
    expect(res.statusCode).toBe(200);
    const blocked = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { login: st.phone, password: "password123" } });
    expect(blocked.statusCode).not.toBe(200);
  });
});
