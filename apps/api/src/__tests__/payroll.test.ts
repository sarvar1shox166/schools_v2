import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db/pool.js";
import { computeTeacherEarnings } from "../modules/payroll/payroll.service.js";
import { createTestTenant, destroyTestTenant, type TestTenant } from "./fixtures.js";

/** Payroll hisoblari: uch xil maosh turi (per_lesson / monthly_fixed / percent_income)
 *  to'g'ri hisoblanishi va davr (oy) chegaralari hurmat qilinishi. */
describe("computeTeacherEarnings", () => {
  let t: TestTenant;
  const PERIOD = "2026-03";

  /** Yordamchi: berilgan o'qituvchi uchun slot + lesson_sessions qatori yaratadi. */
  async function addLessonSession(
    teacherId: string, groupId: string, lessonType: string, date: string, amount: number
  ) {
    const slotRes = await pool.query(
      `INSERT INTO schedule_slots (group_id, day_of_week, start_time, tenant_id)
       VALUES ($1, 1, '10:00', $2) RETURNING id`,
      [groupId, t.tenantId]
    );
    await pool.query(
      `INSERT INTO lesson_sessions (schedule_slot_id, teacher_id, group_id, lesson_type, date, students_count, rate, amount)
       VALUES ($1, $2, $3, $4::lesson_type, $5, 1, $6, $6)`,
      [slotRes.rows[0].id, teacherId, groupId, lessonType, date, amount]
    );
  }

  /** Yordamchi: yangi o'qituvchi + guruh (fixture'dagi asosiy o'qituvchidan alohida). */
  async function addTeacher(salaryType: string, monthlyAmount = 0, incomePercent = 0) {
    const userRes = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
       VALUES ($1, 'teacher', 'T', $2, $2, 'x') RETURNING id`,
      [t.tenantId, `+9989${Math.floor(10000000 + Math.random() * 80000000)}`]
    );
    const teacherRes = await pool.query(
      `INSERT INTO teachers (tenant_id, user_id) VALUES ($1, $2) RETURNING id`,
      [t.tenantId, userRes.rows[0].id]
    );
    const teacherId = teacherRes.rows[0].id as string;
    await pool.query(
      `INSERT INTO teacher_rates (teacher_id, salary_type, monthly_amount, income_percent)
       VALUES ($1, $2::salary_type, $3, $4)`,
      [teacherId, salaryType, monthlyAmount, incomePercent]
    );
    const groupRes = await pool.query(
      `INSERT INTO groups (tenant_id, name, teacher_id, capacity) VALUES ($1, 'G', $2, 10) RETURNING id`,
      [t.tenantId, teacherId]
    );
    return { teacherId, groupId: groupRes.rows[0].id as string };
  }

  function earningsOf(results: Awaited<ReturnType<typeof computeTeacherEarnings>>, teacherId: string) {
    return results.find((r) => r.teacherId === teacherId);
  }

  beforeAll(async () => {
    t = await createTestTenant("payroll");
  });

  afterAll(async () => {
    await destroyTestTenant(t.tenantId);
  });

  it("per_lesson: davr ichidagi sessiyalar tur bo'yicha yig'iladi, boshqa oydagisi kirmaydi", async () => {
    const { teacherId, groupId } = await addTeacher("per_lesson");
    await addLessonSession(teacherId, groupId, "group", "2026-03-05", 50000);
    await addLessonSession(teacherId, groupId, "group", "2026-03-12", 50000);
    await addLessonSession(teacherId, groupId, "individual", "2026-03-06", 80000);
    await addLessonSession(teacherId, groupId, "diagnostic", "2026-03-07", 30000);
    // Boshqa oy — hisobga kirmasligi kerak
    await addLessonSession(teacherId, groupId, "group", "2026-04-01", 999999);

    const results = await computeTeacherEarnings(pool, t.tenantId, PERIOD);
    const e = earningsOf(results, teacherId);
    expect(e).toBeDefined();
    expect(e!.groupAmount).toBe(100000);
    expect(e!.individualAmount).toBe(80000);
    expect(e!.diagnosticAmount).toBe(30000);
    expect(e!.totalAmount).toBe(210000);
  });

  it("per_lesson: davrda sessiya bo'lmasa ro'yxatga umuman kirmaydi", async () => {
    const { teacherId } = await addTeacher("per_lesson");
    const results = await computeTeacherEarnings(pool, t.tenantId, PERIOD);
    expect(earningsOf(results, teacherId)).toBeUndefined();
  });

  it("monthly_fixed: sessiyalardan qat'i nazar oylik summa qaytadi", async () => {
    const { teacherId, groupId } = await addTeacher("monthly_fixed", 3000000);
    // Sessiyalar bor — lekin ular hisobga ta'sir qilmasligi kerak
    await addLessonSession(teacherId, groupId, "group", "2026-03-10", 50000);

    const results = await computeTeacherEarnings(pool, t.tenantId, PERIOD);
    const e = earningsOf(results, teacherId);
    expect(e).toBeDefined();
    expect(e!.totalAmount).toBe(3000000);
    expect(e!.groupAmount).toBe(0);
  });

  it("percent_income: o'z guruhi o'quvchilarining paid tranzaksiyalaridan foiz", async () => {
    const { teacherId, groupId } = await addTeacher("percent_income", 0, 10);
    // Fixture o'quvchisini shu guruhga qo'shamiz
    await pool.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [groupId, t.studentId]);

    const pkgRes = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES ($1, 'P', 8, 500000) RETURNING id`,
      [t.tenantId]
    );
    const spRes = await pool.query(
      `INSERT INTO student_packages (student_id, package_id, total_lessons) VALUES ($1, $2, 8) RETURNING id`,
      [t.studentId, pkgRes.rows[0].id]
    );
    // Davr ichida paid — hisobga kiradi
    await pool.query(
      `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status, created_at)
       VALUES ($1, $2, $3, 500000, 'naqd', 'paid', '2026-03-15')`,
      [t.tenantId, t.studentId, spRes.rows[0].id]
    );
    // pending — kirmaydi
    await pool.query(
      `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status, created_at)
       VALUES ($1, $2, $3, 400000, 'naqd', 'pending', '2026-03-16')`,
      [t.tenantId, t.studentId, spRes.rows[0].id]
    );
    // Boshqa oyda paid — kirmaydi
    await pool.query(
      `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status, created_at)
       VALUES ($1, $2, $3, 300000, 'naqd', 'paid', '2026-04-02')`,
      [t.tenantId, t.studentId, spRes.rows[0].id]
    );

    const results = await computeTeacherEarnings(pool, t.tenantId, PERIOD);
    const e = earningsOf(results, teacherId);
    expect(e).toBeDefined();
    // 500 000 ning 10% = 50 000
    expect(e!.totalAmount).toBe(50000);
  });

  it("teacher_rates yozuvi bo'lmagan o'qituvchi per_lesson deb hisoblanadi", async () => {
    // Fixture'dagi asosiy o'qituvchida teacher_rates yo'q
    await addLessonSession(t.teacherId, t.groupId, "group", "2026-03-20", 45000);
    const results = await computeTeacherEarnings(pool, t.tenantId, PERIOD);
    const e = earningsOf(results, t.teacherId);
    expect(e).toBeDefined();
    expect(e!.totalAmount).toBe(45000);
  });
});
