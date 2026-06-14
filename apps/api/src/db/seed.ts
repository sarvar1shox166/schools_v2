import { pool } from "./pool.js";
import { hashPassword } from "../modules/auth/auth.service.js";

async function seed() {
  const tenantRes = await pool.query(
    `INSERT INTO tenants (name, slug) VALUES ('Shaxmat Online', 'demo')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const tenantId = tenantRes.rows[0].id;

  const passwordHash = await hashPassword("password123");

  async function upsertUser(role: string, fullName: string, phone: string) {
    const res = await pool.query(
      `INSERT INTO users (tenant_id, role, full_name, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      [tenantId, role, fullName, phone, passwordHash]
    );
    return res.rows[0].id as string;
  }

  const adminId = await upsertUser("admin", "Admin Aliyev", "+998900000001");
  const teacherUserId = await upsertUser("teacher", "Nigora Saidova", "+998900000002");
  const studentUserId = await upsertUser("student", "Asilbek Komilov", "+998900000003");

  const teacherRes = await pool.query(
    `INSERT INTO teachers (user_id, tenant_id, spec, title, exp_years)
     VALUES ($1, $2, 'Boshlang''ich tayyorgarlik', 'Trener', 7)
     ON CONFLICT (user_id) DO UPDATE SET spec = EXCLUDED.spec
     RETURNING id`,
    [teacherUserId, tenantId]
  );
  const teacherId = teacherRes.rows[0].id;

  await pool.query(
    `INSERT INTO students (user_id, tenant_id, level, age, status)
     VALUES ($1, $2, 'Boshlang''ich', 9, 'faol')
     ON CONFLICT (user_id) DO NOTHING`,
    [studentUserId, tenantId]
  );

  const groupRes = await pool.query(
    `INSERT INTO groups (tenant_id, name, level, teacher_id, color, capacity)
     VALUES ($1, 'Boshlang''ich — A', 'Boshlang''ich', $2, '#6366f1', 14)
     RETURNING id`,
    [tenantId, teacherId]
  );
  const groupId = groupRes.rows[0].id;

  const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [studentUserId]);
  await pool.query(
    `INSERT INTO group_members (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [groupId, studentRes.rows[0].id]
  );

  await pool.query(
    `INSERT INTO schedule_slots (group_id, day_of_week, start_time) VALUES ($1, 0, '09:00'), ($1, 2, '09:00'), ($1, 4, '09:00')`,
    [groupId]
  );

  await pool.query(
    `INSERT INTO teacher_rates (teacher_id, group_rate, individual_rate, diagnostic_rate, retention_coef)
     VALUES ($1, 15000, 60000, 40000, 1.1)
     ON CONFLICT (teacher_id) DO UPDATE SET group_rate = EXCLUDED.group_rate`,
    [teacherId]
  );

  const pkg8Res = await pool.query(
    `INSERT INTO packages (tenant_id, name, lessons_count, price)
     VALUES ($1, '8 darslik paket', 8, 400000)
     RETURNING id`,
    [tenantId]
  );
  await pool.query(
    `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES
       ($1, '12 darslik paket', 12, 550000),
       ($1, '16 darslik paket', 16, 700000)`,
    [tenantId]
  );
  const pkg8Id = pkg8Res.rows[0].id;

  const studentPackageRes = await pool.query(
    `INSERT INTO student_packages (student_id, package_id, total_lessons, used_lessons)
     VALUES ($1, $2, 8, 3) RETURNING id`,
    [studentRes.rows[0].id, pkg8Id]
  );
  await pool.query(
    `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status)
     VALUES ($1, $2, $3, 400000, 'naqd', 'paid')`,
    [tenantId, studentRes.rows[0].id, studentPackageRes.rows[0].id]
  );

  await pool.query(
    `INSERT INTO puzzles (fen, solution, difficulty, xp_reward) VALUES
       ($1, $2, 'oson', 50),
       ($3, $4, 'orta', 75),
       ($5, $6, 'qiyin', 100)`,
    [
      "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      ["e1e8"],
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      ["f3g5", "g8h6", "g5f7"],
      "4r1k1/p4ppp/8/3Q4/8/8/PPP2PPP/4R1K1 w - - 0 1",
      ["d5d8"],
    ]
  );

  console.log("Seed complete.");
  console.log("Admin login:   +998900000001 / password123");
  console.log("Teacher login: +998900000002 / password123");
  console.log("Student login: +998900000003 / password123");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
