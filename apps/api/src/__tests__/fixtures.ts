import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { hashPassword } from "../modules/auth/auth.service.js";

export interface TestUser {
  id: string;
  phone: string;
}

export interface TestTenant {
  tenantId: string;
  admin: TestUser;
  assistantAdmin: TestUser;
  teacherUser: TestUser;
  studentUser: TestUser;
  teacherId: string;
  studentId: string;
  groupId: string;
}

function randomPhone(): string {
  return `+998${Math.floor(100000000 + Math.random() * 800000000)}`;
}

/** Butunlay izolyatsiyalangan test tenant — admin/assistant_admin/teacher/student/group bilan. */
export async function createTestTenant(label: string): Promise<TestTenant> {
  const tenantRes = await pool.query(
    `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id`,
    [`Test ${label}`, `test-${label}-${randomUUID().slice(0, 8)}`]
  );
  const tenantId = tenantRes.rows[0].id as string;
  const passwordHash = await hashPassword("password123");

  async function makeUser(role: string): Promise<TestUser> {
    const phone = randomPhone();
    const res = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
       VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
      [tenantId, role, `Test ${role}`, phone, passwordHash]
    );
    return { id: res.rows[0].id, phone };
  }

  const admin = await makeUser("admin");
  const assistantAdmin = await makeUser("assistant_admin");
  const teacherUser = await makeUser("teacher");
  const studentUser = await makeUser("student");

  const teacherRes = await pool.query(
    `INSERT INTO teachers (tenant_id, user_id) VALUES ($1, $2) RETURNING id`,
    [tenantId, teacherUser.id]
  );
  const teacherId = teacherRes.rows[0].id as string;

  const studentRes = await pool.query(
    `INSERT INTO students (tenant_id, user_id) VALUES ($1, $2) RETURNING id`,
    [tenantId, studentUser.id]
  );
  const studentId = studentRes.rows[0].id as string;

  const groupRes = await pool.query(
    `INSERT INTO groups (tenant_id, name, teacher_id, capacity) VALUES ($1, 'Test Group', $2, 10) RETURNING id`,
    [tenantId, teacherId]
  );
  const groupId = groupRes.rows[0].id as string;

  await pool.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [groupId, studentId]);

  return { tenantId, admin, assistantAdmin, teacherUser, studentUser, teacherId, studentId, groupId };
}

/** Tenant'ni va unga tegishli barcha qatorlarni (cascade orqali) o'chiradi. */
export async function destroyTestTenant(tenantId: string): Promise<void> {
  await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
}
