import { pool } from "./pool.js";
import { hashPassword } from "../modules/auth/auth.service.js";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Tenant ───────────────────────────────────────────────────────────────
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug) VALUES ('Shaxmat Online', 'demo')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const tenantId = tenantRes.rows[0].id as string;

    // ── Clean previous seed data (order matters for FK cascades) ─────────────
    await client.query(`DELETE FROM puzzles`);                                        // cascades: puzzle_attempts
    await client.query(`DELETE FROM notifications WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM video_lessons WHERE tenant_id = $1`, [tenantId]); // cascades: video_progress
    await client.query(`DELETE FROM teacher_reviews WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM groups WHERE tenant_id = $1`, [tenantId]);        // cascades: group_members, schedule_slots→attendance_records, lesson_sessions; SET NULL on lessons
    await client.query(`DELETE FROM users WHERE tenant_id = $1 AND role != 'super_admin'`, [tenantId]); // cascades: teachers→teacher_rates,lessons; students→student_packages,student_xp
    await client.query(`DELETE FROM packages WHERE tenant_id = $1`, [tenantId]);

    const hash = await hashPassword("password123");

    // ── Users ────────────────────────────────────────────────────────────────
    async function insertUser(role: string, fullName: string, phone: string) {
      const res = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
         VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
        [tenantId, role, fullName, phone, hash]
      );
      return res.rows[0].id as string;
    }

    const adminId    = await insertUser("admin",   "Admin Aliyev",    "+998901000001");
    const t1UserId   = await insertUser("teacher", "Nigora Saidova",  "+998901000002");
    const t2UserId   = await insertUser("teacher", "Jasur Rahimov",   "+998901000003");

    const studentDefs = [
      // Group A — Boshlang'ich (beginners)
      { name: "Asilbek Komilov",  phone: "+998901000010", level: "Boshlang'ich", age: 10 },
      { name: "Dilnoza Yusupova", phone: "+998901000011", level: "Boshlang'ich", age: 11 },
      { name: "Bobur Toshmatov",  phone: "+998901000012", level: "Boshlang'ich", age:  9 },
      { name: "Malika Rahimova",  phone: "+998901000013", level: "Boshlang'ich", age: 12 },
      { name: "Sherzod Xolmatov", phone: "+998901000014", level: "Boshlang'ich", age: 10 },
      // Group B — O'rta (intermediate)
      { name: "Zulfiya Nazarova", phone: "+998901000015", level: "O'rta", age: 13 },
      { name: "Rustam Mirzayev",  phone: "+998901000016", level: "O'rta", age: 14 },
      { name: "Kamola Hasanova",  phone: "+998901000017", level: "O'rta", age: 12 },
      { name: "Jamshid Umarov",   phone: "+998901000018", level: "O'rta", age: 15 },
      { name: "Nodira Islamova",  phone: "+998901000019", level: "O'rta", age: 13 },
    ];

    const studentUserIds: string[] = [];
    for (const s of studentDefs) {
      studentUserIds.push(await insertUser("student", s.name, s.phone));
    }

    // ── Teachers ─────────────────────────────────────────────────────────────
    const t1Res = await client.query(
      `INSERT INTO teachers (user_id, tenant_id, spec, title, exp_years)
       VALUES ($1, $2, 'Boshlang''ich tayyorgarlik', 'FIDE Trener', 5) RETURNING id`,
      [t1UserId, tenantId]
    );
    const teacher1Id = t1Res.rows[0].id as string;

    const t2Res = await client.query(
      `INSERT INTO teachers (user_id, tenant_id, spec, title, exp_years)
       VALUES ($1, $2, 'Taktika va strategiya', 'FIDE Master', 9) RETURNING id`,
      [t2UserId, tenantId]
    );
    const teacher2Id = t2Res.rows[0].id as string;

    await client.query(
      `INSERT INTO teacher_rates (teacher_id, group_rate, individual_rate, diagnostic_rate, retention_coef)
       VALUES ($1, 15000, 50000, 35000, 1.10),
              ($2, 18000, 65000, 40000, 1.15)`,
      [teacher1Id, teacher2Id]
    );

    // ── Students ──────────────────────────────────────────────────────────────
    const studentIds: string[] = [];
    for (let i = 0; i < studentDefs.length; i++) {
      const s = studentDefs[i];
      const res = await client.query(
        `INSERT INTO students (user_id, tenant_id, level, age, status)
         VALUES ($1, $2, $3, $4, 'faol') RETURNING id`,
        [studentUserIds[i], tenantId, s.level, s.age]
      );
      studentIds.push(res.rows[0].id as string);
    }

    // ── Groups ────────────────────────────────────────────────────────────────
    const grpARes = await client.query(
      `INSERT INTO groups (tenant_id, name, level, teacher_id, color, capacity)
       VALUES ($1, 'Boshlang''ich — A', 'Boshlang''ich', $2, '#6366f1', 10) RETURNING id`,
      [tenantId, teacher1Id]
    );
    const groupAId = grpARes.rows[0].id as string;

    const grpBRes = await client.query(
      `INSERT INTO groups (tenant_id, name, level, teacher_id, color, capacity)
       VALUES ($1, 'O''rta — B', 'O''rta', $2, '#10b981', 10) RETURNING id`,
      [tenantId, teacher2Id]
    );
    const groupBId = grpBRes.rows[0].id as string;

    // ── Group members: 0–4 → A, 5–9 → B ────────────────────────────────────
    for (let i = 0; i < 5;  i++) await client.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [groupAId, studentIds[i]]);
    for (let i = 5; i < 10; i++) await client.query(`INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)`, [groupBId, studentIds[i]]);

    // ── Schedule slots ────────────────────────────────────────────────────────
    // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat
    // Group A: Mon/Wed/Fri at 09:00
    const slotsARes = await client.query(
      `INSERT INTO schedule_slots (group_id, day_of_week, start_time) VALUES
         ($1, 0, '09:00'), ($1, 2, '09:00'), ($1, 4, '09:00')
       RETURNING id, day_of_week`,
      [groupAId]
    );
    // rows returned in insertion order: [Mon, Wed, Fri]
    const slotsA = slotsARes.rows as { id: string; day_of_week: number }[];

    // Group B: Tue/Thu/Sat at 11:00
    const slotsBRes = await client.query(
      `INSERT INTO schedule_slots (group_id, day_of_week, start_time) VALUES
         ($1, 1, '11:00'), ($1, 3, '11:00'), ($1, 5, '11:00')
       RETURNING id, day_of_week`,
      [groupBId]
    );
    // rows returned in insertion order: [Tue, Thu, Sat]
    const slotsB = slotsBRes.rows as { id: string; day_of_week: number }[];

    // ── Packages ──────────────────────────────────────────────────────────────
    const pkgRes = await client.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price) VALUES
         ($1, '8 darslik paket',  8,  400000),
         ($1, '12 darslik paket', 12, 550000),
         ($1, '16 darslik paket', 16, 700000)
       RETURNING id, lessons_count`,
      [tenantId]
    );
    const pkg12Id = pkgRes.rows.find((r: { lessons_count: number }) => r.lessons_count === 12)!.id as string;

    // ── Student packages + transactions ───────────────────────────────────────
    // used_lessons reflects 4 weeks of attendance history (p/a/l consume, ae does not)
    const usedLessons = [4, 5, 6, 4, 5,   7, 8, 6, 9, 7];
    for (let i = 0; i < 10; i++) {
      const spRes = await client.query(
        `INSERT INTO student_packages (student_id, package_id, total_lessons, used_lessons, status)
         VALUES ($1, $2, 12, $3, 'active') RETURNING id`,
        [studentIds[i], pkg12Id, usedLessons[i]]
      );
      await client.query(
        `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status)
         VALUES ($1, $2, $3, 550000, 'naqd', 'paid')`,
        [tenantId, studentIds[i], spRes.rows[0].id]
      );
    }

    // ── Conducted lessons (4 weeks of history) ────────────────────────────────
    // Today: 2026-06-29 (Monday)
    // Group A: Mon/Wed/Fri
    const datesA = [
      "2026-06-01","2026-06-03","2026-06-05",
      "2026-06-08","2026-06-10","2026-06-12",
      "2026-06-15","2026-06-17","2026-06-19",
      "2026-06-22","2026-06-24","2026-06-26",
    ];
    const topicsA = [
      "Rux va fil hujumi","Farzin strategiyasi","Rokirovka",
      "Piyoda tuzilishi","Ot manevrlari","Shoh xavfsizligi",
      "Taktik kombinatsiyalar","Ochiq liniyalar","Ikki fil ustunligi",
      "Endshpil asoslari","Tekis piyoda endshpili","Rux endshpili",
    ];

    const lessonsA: string[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await client.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, topic)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenantId, slotsA[i % 3].id, groupAId, teacher1Id, datesA[i], topicsA[i]]
      );
      lessonsA.push(res.rows[0].id as string);
    }

    // Group B: Tue/Thu/Sat
    const datesB = [
      "2026-06-02","2026-06-04","2026-06-06",
      "2026-06-09","2026-06-11","2026-06-13",
      "2026-06-16","2026-06-18","2026-06-20",
      "2026-06-23","2026-06-25","2026-06-27",
    ];
    const topicsB = [
      "Debyut nazariyasi","Siciliya mudofaasi","Ispancha o'yin",
      "Vilka taktikasi","Mixlash usuli","Cho'gir kombinatsiyasi",
      "Kompleks kombinatsiyalar","Pozitsion o'yin","Faol figura joylashtirish",
      "Kadetlar endshpili","Piyoda endshpili chuqurligi","Farzin endshpili",
    ];

    const lessonsB: string[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await client.query(
        `INSERT INTO lessons (tenant_id, schedule_slot_id, group_id, teacher_id, conducted_at, topic)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenantId, slotsB[i % 3].id, groupBId, teacher2Id, datesB[i], topicsB[i]]
      );
      lessonsB.push(res.rows[0].id as string);
    }

    // ── Attendance records ─────────────────────────────────────────────────────
    // p=present, a=absent, l=late, ae=excused (ae does not count against package)
    const attPatternA: string[][] = [
      ["p","p","p","p","p","a","p","p","l","p","p","p"], // Asilbek
      ["p","p","a","p","p","p","ae","p","p","p","l","p"], // Dilnoza
      ["p","l","p","p","p","p","p","a","p","p","p","ae"], // Bobur
      ["ae","p","p","l","p","p","p","p","p","a","p","p"], // Malika
      ["p","p","p","p","ae","p","p","p","l","p","p","p"], // Sherzod
    ];
    const attPatternB: string[][] = [
      ["p","p","p","a","p","p","l","p","p","p","p","ae"], // Zulfiya
      ["p","p","l","p","p","ae","p","p","p","p","a","p"], // Rustam
      ["p","p","p","p","l","p","p","p","ae","p","p","p"], // Kamola
      ["a","p","p","p","p","p","p","l","p","p","p","p"],  // Jamshid
      ["p","ae","p","p","p","p","p","p","p","l","p","p"], // Nodira
    ];

    for (let si = 0; si < 5; si++) {
      for (let li = 0; li < 12; li++) {
        const status = attPatternA[si][li];
        await client.query(
          `INSERT INTO attendance_records (student_id, schedule_slot_id, date, status, marked_by, lesson_id, lesson_counted)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [studentIds[si], slotsA[li % 3].id, datesA[li], status, adminId, lessonsA[li], status !== "ae"]
        );
      }
    }
    for (let si = 0; si < 5; si++) {
      for (let li = 0; li < 12; li++) {
        const status = attPatternB[si][li];
        await client.query(
          `INSERT INTO attendance_records (student_id, schedule_slot_id, date, status, marked_by, lesson_id, lesson_counted)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [studentIds[si + 5], slotsB[li % 3].id, datesB[li], status, adminId, lessonsB[li], status !== "ae"]
        );
      }
    }

    // ── Student XP (level = floor(xp/200) + 1) ───────────────────────────────
    const xpData = [
      // Group A (beginners): 180–310 xp, elo 1100–1220
      { xp: 180, streak: 3,  elo: 1150, last: "2026-06-26" },
      { xp: 240, streak: 5,  elo: 1180, last: "2026-06-26" },
      { xp: 160, streak: 2,  elo: 1120, last: "2026-06-24" },
      { xp: 310, streak: 7,  elo: 1220, last: "2026-06-26" },
      { xp: 200, streak: 4,  elo: 1190, last: "2026-06-26" },
      // Group B (intermediate): 390–750 xp, elo 1310–1520
      { xp: 480, streak: 8,  elo: 1380, last: "2026-06-27" },
      { xp: 620, streak: 12, elo: 1450, last: "2026-06-27" },
      { xp: 390, streak: 5,  elo: 1310, last: "2026-06-25" },
      { xp: 750, streak: 15, elo: 1520, last: "2026-06-27" },
      { xp: 520, streak: 9,  elo: 1400, last: "2026-06-25" },
    ];
    for (let i = 0; i < 10; i++) {
      const d = xpData[i];
      await client.query(
        `INSERT INTO student_xp (student_id, xp, level, streak, last_active_date, elo)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentIds[i], d.xp, Math.floor(d.xp / 200) + 1, d.streak, d.last, d.elo]
      );
    }

    // ── Puzzles (global, no tenant_id) ────────────────────────────────────────
    const puzzlesRes = await client.query(
      `INSERT INTO puzzles (fen, solution, difficulty, xp_reward) VALUES
         ('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',                   ARRAY['e1e8'],                     'oson',  50),
         ('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', ARRAY['f3g5','g8h6','g5f7'], 'orta',  75),
         ('4r1k1/p4ppp/8/3Q4/8/8/PPP2PPP/4R1K1 w - - 0 1',           ARRAY['d5d8'],                     'qiyin', 100),
         ('r2qkb1r/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 7', ARRAY['d1d3'],           'oson',  50),
         ('2r3k1/5ppp/p7/1p6/4n3/1B6/PPP2PPP/3R2K1 w - - 0 20',      ARRAY['d1d8','c8d8','b3f7'],        'qiyin', 100)
       RETURNING id`
    );
    const puzzleIds = puzzlesRes.rows.map((r: { id: string }) => r.id);

    // Puzzle attempts — Group B students more advanced
    const attempts = [
      [5,0,true],[5,1,true],[5,2,false],
      [6,0,true],[6,1,true],[6,2,true],[6,3,true],
      [7,0,true],[7,1,false],
      [8,0,true],[8,1,true],[8,2,true],[8,3,true],[8,4,true],
      [9,0,true],[9,1,true],[9,3,false],
      // Group A easier puzzles
      [0,0,true],[1,0,true],[2,0,false],[3,0,true],[3,1,false],[4,0,true],
    ] as [number, number, boolean][];

    for (const [si, pi, correct] of attempts) {
      await client.query(
        `INSERT INTO puzzle_attempts (student_id, puzzle_id, correct) VALUES ($1, $2, $3)`,
        [studentIds[si], puzzleIds[pi], correct]
      );
    }

    // ── Teacher reviews ────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO teacher_reviews
         (tenant_id, teacher_id, reviewer_id, rating, lesson_quality, student_results, punctuality, communication, comment, period)
       VALUES
         ($1,$2,$3, 4, 4, 4, 5, 4, 'Darslar sifatli, o''quvchilar yaxshi rivojlanmoqda',        '2026-05'),
         ($1,$2,$3, 5, 5, 4, 5, 5, 'Juda yaxshi natijalar, o''quvchilar jadal o''smoqda',        '2026-06'),
         ($1,$4,$3, 5, 5, 5, 4, 5, 'Yuqori darajali o''qituvchi, taktika bo''limida kuchli',     '2026-05'),
         ($1,$4,$3, 5, 5, 5, 5, 5, 'Ajoyib ish, barcha ko''rsatkichlar yuqori darajada',         '2026-06')`,
      [tenantId, teacher1Id, adminId, teacher2Id]
    );

    // ── Video lessons ──────────────────────────────────────────────────────────
    const videosRes = await client.query(
      `INSERT INTO video_lessons (tenant_id, teacher_id, title, category, video_url, duration_seconds, thumbnail_color, thumbnail_icon) VALUES
         ($1,$2, 'Rux bilan shoh berish usullari',          'endshpil',  'https://youtu.be/example1', 720,  '#6366f1', '♜'),
         ($1,$2, 'Siciliya mudofaasi — kirish qo''llanmasi', 'debyut',    'https://youtu.be/example2', 1080, '#10b981', '♟'),
         ($1,$3, 'Vilka taktikasi — amaliy mashqlar',       'taktika',   'https://youtu.be/example3', 900,  '#f59e0b', '⚡'),
         ($1,$3, 'Pozitsion o''yin asoslari',                'strategiya','https://youtu.be/example4', 1200, '#3b82f6', '♛'),
         ($1,$2, 'Zoom yozuvi — ruh va fil koordinatsiyasi','zoom',       'https://youtu.be/example5', 5400, '#8b5cf6', '🎥'),
         ($1,$3, 'Piyoda tuzilishi va zaifliklari',         'strategiya','https://youtu.be/example6', 960,  '#ef4444', '♟')
       RETURNING id`,
      [tenantId, teacher1Id, teacher2Id]
    );
    const videoIds = videosRes.rows.map((r: { id: string }) => r.id);

    // Video progress for more advanced students
    const videoProgress = [
      [5,0,100],[5,2,75],
      [6,0,100],[6,1,100],[6,2,100],[6,3,60],
      [7,2,100],[7,3,40],
      [8,0,100],[8,1,100],[8,2,100],[8,3,100],[8,4,45],
      [9,2,100],[9,3,80],
      [0,0,40],[3,0,65],
    ] as [number, number, number][];

    for (const [si, vi, pct] of videoProgress) {
      await client.query(
        `INSERT INTO video_progress (student_id, video_id, progress_pct, watched_at)
         VALUES ($1, $2, $3, now() - ($4 || ' days')::interval)`,
        [studentIds[si], videoIds[vi], pct, String(si + vi + 1)]
      );
    }

    // ── Notifications ──────────────────────────────────────────────────────────
    for (let i = 0; i < 10; i++) {
      await client.query(
        `INSERT INTO notifications (tenant_id, user_id, type, icon, title, body)
         VALUES ($1, $2, 'welcome', 'star', 'Xush kelibsiz!',
                 'Shaxmat maktabiga xush kelibsiz. Birinchi darsingiz yaqin!')`,
        [tenantId, studentUserIds[i]]
      );
    }
    await client.query(
      `INSERT INTO notifications (tenant_id, user_id, type, icon, title, body)
       VALUES ($1,$2,'lesson_reminder','calendar','Dars eslatmasi','Bugun soat 09:00 da dars bor. Tayyor bo''ling!')`,
      [tenantId, studentUserIds[0]]
    );
    await client.query(
      `INSERT INTO notifications (tenant_id, user_id, type, icon, title, body)
       VALUES ($1,$2,'xp_earned','zap','XP topladingiz!','Boshqotirma yechib 50 XP topladingiz. Davom eting!')`,
      [tenantId, studentUserIds[3]]
    );

    await client.query("COMMIT");

    console.log("\n✅  Seed yakunlandi!\n");
    console.log("─── Admin ─────────────────────────────────────────");
    console.log("   +998901000001  /  password123  →  Admin Aliyev");
    console.log("\n─── O'qituvchilar ─────────────────────────────────");
    console.log("   +998901000002  /  password123  →  Nigora Saidova  (Boshlang'ich — A)");
    console.log("   +998901000003  /  password123  →  Jasur Rahimov   (O'rta — B)");
    console.log("\n─── O'quvchilar — Guruh A (Boshlang'ich) ──────────");
    for (let i = 0; i < 5; i++) console.log(`   ${studentDefs[i].phone}  →  ${studentDefs[i].name}`);
    console.log("\n─── O'quvchilar — Guruh B (O'rta) ─────────────────");
    for (let i = 5; i < 10; i++) console.log(`   ${studentDefs[i].phone}  →  ${studentDefs[i].name}`);
    console.log("\n   Barcha parollar: password123\n");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
