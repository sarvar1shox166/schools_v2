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

/** Ustoz "Darsga kirish"ni bosmasdan (masalan "Uy vazifalari" sahifasi orqali)
 *  to'g'ridan-to'g'ri guruh davomatini belgilasa ham maosh (lesson_sessions)
 *  to'g'ri yozilishini tekshiradi — bu ilgari jimgina yozilmay qolar edi. */
describe("POST /attendance auto-credits teacher_attendance for payroll", () => {
  let app: FastifyInstance;
  let tenant: TestTenant;
  let scheduleSlotId: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant("att-payroll");

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

  it("marks teacher_attendance='p' and creates a lesson_sessions row, without the teacher ever joining", async () => {
    const token = await loginAs(app, tenant.admin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(token),
      payload: {
        scheduleSlotId,
        date: "2099-03-01",
        records: [{ studentId: tenant.studentId, status: "p" }],
      },
    });
    expect(res.statusCode).toBe(200);

    const ta = await pool.query(
      `SELECT status, marked_by FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
      [tenant.teacherId, scheduleSlotId, "2099-03-01"]
    );
    expect(ta.rows[0]?.status).toBe("p");
    expect(ta.rows[0]?.marked_by).toBeNull();

    const ls = await pool.query(
      `SELECT id FROM lesson_sessions WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, "2099-03-01"]
    );
    expect(ls.rows.length).toBe(1);
  });

  it("does not overwrite a manually-marked 'absent' teacher_attendance record", async () => {
    const date = "2099-03-02";
    const adminToken = await loginAs(app, tenant.admin.phone);

    // Admin qo'lda ustozni "kelmadi" deb belgilaydi (marked_by to'ldiriladi).
    const markRes = await app.inject({
      method: "POST",
      url: "/api/v1/attendance/teacher",
      headers: authHeader(adminToken),
      payload: { date, records: [{ scheduleSlotId, teacherId: tenant.teacherId, status: "a" }] },
    });
    expect(markRes.statusCode).toBe(200);

    // Keyin guruh davomati (masalan admin/operator tomonidan) belgilanadi.
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(adminToken),
      payload: { scheduleSlotId, date, records: [{ studentId: tenant.studentId, status: "p" }] },
    });
    expect(res.statusCode).toBe(200);

    const ta = await pool.query(
      `SELECT status FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
      [tenant.teacherId, scheduleSlotId, date]
    );
    expect(ta.rows[0]?.status).toBe("a");

    const ls = await pool.query(
      `SELECT id FROM lesson_sessions WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, date]
    );
    expect(ls.rows.length).toBe(0);
  });

  it("corrects a sweep-marked ('a', marked_by IS NULL) absence once real attendance is submitted", async () => {
    const date = "2099-03-03";
    // Fon jarayoni (teacher-absence-sweep) xatti-harakatini taqlid qilamiz.
    await pool.query(
      `INSERT INTO teacher_attendance (tenant_id, teacher_id, schedule_slot_id, date, status, marked_by)
       VALUES ($1, $2, $3, $4, 'a', NULL)`,
      [tenant.tenantId, tenant.teacherId, scheduleSlotId, date]
    );

    const token = await loginAs(app, tenant.admin.phone);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attendance",
      headers: authHeader(token),
      payload: { scheduleSlotId, date, records: [{ studentId: tenant.studentId, status: "p" }] },
    });
    expect(res.statusCode).toBe(200);

    const ta = await pool.query(
      `SELECT status FROM teacher_attendance WHERE teacher_id = $1 AND schedule_slot_id = $2 AND date = $3`,
      [tenant.teacherId, scheduleSlotId, date]
    );
    expect(ta.rows[0]?.status).toBe("p");

    const ls = await pool.query(
      `SELECT id FROM lesson_sessions WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, date]
    );
    expect(ls.rows.length).toBe(1);
  });

  it("stays idempotent — calling POST /attendance twice leaves exactly one lesson_sessions row", async () => {
    const date = "2099-03-04";
    const token = await loginAs(app, tenant.admin.phone);
    const payload = { scheduleSlotId, date, records: [{ studentId: tenant.studentId, status: "p" }] };

    const res1 = await app.inject({ method: "POST", url: "/api/v1/attendance", headers: authHeader(token), payload });
    expect(res1.statusCode).toBe(200);
    const res2 = await app.inject({ method: "POST", url: "/api/v1/attendance", headers: authHeader(token), payload });
    expect(res2.statusCode).toBe(200);

    const ls = await pool.query(
      `SELECT id FROM lesson_sessions WHERE schedule_slot_id = $1 AND date = $2`,
      [scheduleSlotId, date]
    );
    expect(ls.rows.length).toBe(1);
  });
});
