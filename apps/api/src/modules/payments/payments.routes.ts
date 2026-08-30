import type { FastifyInstance } from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { env } from "../../env.js";
import { notifyStudent } from "../notifications/notify.js";

const packageCreateSchema = z.object({
  name: z.string().min(2),
  lessonsCount: z.number().int().positive(),
  price: z.number().positive(),
  lessonType: z.enum(["group", "individual"]).default("group"),
  tier: z.enum(["standard", "pro"]).default("standard"),
  lessonsPerMonth: z.number().int().positive().optional(),
  lessonsPerWeek: z.number().int().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
  maxStudents: z.number().int().positive().optional(),
  delivery: z.enum(["online", "offline"]).default("online"),
});

const packageUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  lessonsCount: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  active: z.boolean().optional(),
  lessonType: z.enum(["group", "individual"]).optional(),
  tier: z.enum(["standard", "pro"]).optional(),
  lessonsPerMonth: z.number().int().positive().optional(),
  lessonsPerWeek: z.number().int().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
  maxStudents: z.number().int().positive().optional(),
  delivery: z.enum(["online", "offline"]).optional(),
});

const assignSchema = z.object({
  studentId: z.string().uuid(),
  packageId: z.string().uuid(),
  method: z.enum(["click", "payme", "naqd", "uzcard"]),
  // PAKET (obuna) muddati — xizmat qachongacha amal qiladi. Faqat student_packages'da saqlanadi.
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // O'tgan sanadagi to'lovni ro'yxatga olish uchun (masalan avvalroq qo'shilgan o'quvchi) —
  // bo'sh bo'lsa hozirgi vaqt ishlatiladi.
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // O'quvchi hoziroq emas, keyinroq to'lamoqchi bo'lsa — usul (naqd/uzcard) qat'i
  // nazar tranzaksiya "kutilmoqda" holatida yaratiladi.
  payLater: z.boolean().optional(),
  // TO'LOV muddati — pul qachongacha kelishi kerak. Faqat to'lanmagan (payLater)
  // to'lov uchun ma'noli; shu sana o'tib ketsa to'lov "qarzdor"ga aylanadi.
  // Paket muddati bilan aralashtirilmaydi — bular ikki xil sana.
  paymentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Bitta pul harakatini tahrirlash. To'lov muddati (dueDate) bu yerda yo'q —
// u majburiyatga (charge) tegishli: bitta majburiyatga bir nechta to'lov
// bo'lishi mumkin, muddat esa ularning har biriga emas, majburiyatga qo'yiladi.
const transactionUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(["click", "payme", "naqd", "uzcard"]).optional(),
  status: z.enum(["pending", "paid", "failed", "cancelled"]).optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const chargeCreateSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const chargeUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().max(500).optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Majburiyatga to'lov qo'shish. amount berilmasa — qolgan qoldiq to'liq yopiladi.
const paymentCreateSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(["click", "payme", "naqd", "uzcard"]).default("naqd"),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Allaqachon tayinlangan paketni tuzatish uchun — masalan "8 ta dars" deb sotib
// olingan paketga admin xato qilib kam/ko'p yozgan bo'lsa, yoki muddatini uzaytirish kerak bo'lsa.
const updateStudentPackageSchema = z.object({
  totalLessons: z.number().int().positive().optional(),
  usedLessons: z.number().int().min(0).optional(),
  status: z.enum(["active", "finished", "expired"]).optional(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function paymentsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // ---- Packages ----

  app.get("/packages", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT id, name, lessons_count AS "lessonsCount", price, active,
              lesson_type AS "lessonType", tier, lessons_per_month AS "lessonsPerMonth",
              lessons_per_week AS "lessonsPerWeek", duration_minutes AS "durationMinutes",
              max_students AS "maxStudents", delivery
       FROM packages WHERE tenant_id = $1 AND active = true ORDER BY price`,
      [tenantId]
    );
    return rows;
  });

  app.post("/packages", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = packageCreateSchema.parse(request.body);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price,
         lesson_type, tier, lessons_per_month, lessons_per_week,
         duration_minutes, max_students, delivery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [tenantId, body.name, body.lessonsCount, body.price,
       body.lessonType, body.tier, body.lessonsPerMonth ?? null,
       body.lessonsPerWeek ?? null, body.durationMinutes ?? null,
       body.maxStudents ?? null, body.delivery]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/packages/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = packageUpdateSchema.parse(request.body);
    const { tenantId } = request.user;
    await pool.query(
      `UPDATE packages SET
         name = COALESCE($1, name),
         lessons_count = COALESCE($2, lessons_count),
         price = COALESCE($3, price),
         active = COALESCE($4, active),
         lesson_type = COALESCE($5, lesson_type),
         tier = COALESCE($6, tier),
         lessons_per_month = COALESCE($7, lessons_per_month),
         lessons_per_week = COALESCE($8, lessons_per_week),
         duration_minutes = COALESCE($9, duration_minutes),
         max_students = COALESCE($10, max_students),
         delivery = COALESCE($11, delivery)
       WHERE id = $12 AND tenant_id = $13`,
      [body.name ?? null, body.lessonsCount ?? null, body.price ?? null,
       body.active ?? null, body.lessonType ?? null, body.tier ?? null,
       body.lessonsPerMonth ?? null, body.lessonsPerWeek ?? null,
       body.durationMinutes ?? null, body.maxStudents ?? null,
       body.delivery ?? null, id, tenantId]
    );
    return { ok: true };
  });

  app.delete("/packages/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    try {
      await pool.query(`DELETE FROM packages WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    } catch (err) {
      if ((err as { code?: string }).code === "23503") {
        // Package has purchase history — can't hard-delete, hide it instead
        await pool.query(`UPDATE packages SET active = false WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
      } else {
        throw err;
      }
    }
    return { ok: true };
  });

  // ---- Student packages ----

  app.get("/students/:id/packages", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin", "operator", "teacher")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT sp.id, sp.total_lessons AS "totalLessons", sp.used_lessons AS "usedLessons",
              sp.status, sp.purchased_at AS "purchasedAt", sp.expires_at AS "expiresAt",
              p.name AS "packageName", p.price
       FROM student_packages sp
       JOIN packages p ON p.id = sp.package_id
       JOIN students s ON s.id = sp.student_id
       WHERE sp.student_id = $1 AND s.tenant_id = $2
       ORDER BY sp.purchased_at DESC`,
      [id, tenantId]
    );
    return rows;
  });

  app.get("/me/packages", { onRequest: [app.requireRole("student")] }, async (request) => {
    const { sub } = request.user;
    const studentRes = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [sub]);
    if (studentRes.rows.length === 0) return [];
    const studentId = studentRes.rows[0].id;

    const { rows } = await pool.query(
      `SELECT sp.id, sp.total_lessons AS "totalLessons", sp.used_lessons AS "usedLessons",
              sp.status, sp.purchased_at AS "purchasedAt", sp.expires_at AS "expiresAt",
              p.name AS "packageName", p.price
       FROM student_packages sp
       JOIN packages p ON p.id = sp.package_id
       WHERE sp.student_id = $1
       ORDER BY sp.purchased_at DESC`,
      [studentId]
    );
    return rows;
  });

  app.post("/student-packages", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = assignSchema.parse(request.body);
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const pkgRes = await client.query(
        `SELECT lessons_count, price FROM packages WHERE id = $1 AND tenant_id = $2`,
        [body.packageId, tenantId]
      );
      if (pkgRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Package not found" });
      }
      const pkg = pkgRes.rows[0];

      const spRes = await client.query(
        `INSERT INTO student_packages (student_id, package_id, total_lessons, expires_at, purchased_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now())) RETURNING id`,
        [body.studentId, body.packageId, pkg.lessons_count, body.expiresAt ?? null, body.paidAt ?? null]
      );
      const studentPackageId = spRes.rows[0].id;

      const isOnline = body.method === "click" || body.method === "payme";
      const payNow = !body.payLater && !isOnline;

      // 1) MAJBURIYAT — o'quvchi shu paket uchun qancha to'lashi kerak.
      //    To'lov muddati faqat pul hali kelmaganda ma'noli.
      const chargeRes = await client.query(
        `INSERT INTO student_charges (tenant_id, student_id, student_package_id, amount, due_date, created_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now())) RETURNING id`,
        [tenantId, body.studentId, studentPackageId, pkg.price,
         payNow ? null : (body.paymentDueDate ?? null), body.paidAt ?? null]
      );
      const chargeId = chargeRes.rows[0].id;

      // 2) PUL HARAKATI — faqat pul haqiqatan kelgan bo'lsa yoziladi.
      //    "Keyinroq to'laydi" da hech qanday to'lov yozilmaydi: majburiyat
      //    to'lanmagan bo'lib qoladi, qoldiq avtomatik hisoblanadi.
      //    Click/Payme da tasdiqlanishini kutayotgan yozuv qoldiriladi —
      //    provayder webhook'i uni shu id bo'yicha topadi.
      let transactionId: string | null = null;
      if (payNow || isOnline) {
        const txRes = await client.query(
          `INSERT INTO transactions (tenant_id, student_id, student_package_id, charge_id,
                                     amount, method, status, paid_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7,
                   CASE WHEN $7 = 'paid' THEN COALESCE($8::timestamptz, now()) END,
                   COALESCE($8::timestamptz, now()))
           RETURNING id`,
          [tenantId, body.studentId, studentPackageId, chargeId, pkg.price, body.method,
           payNow ? "paid" : "pending", body.paidAt ?? null]
        );
        transactionId = txRes.rows[0].id;
      }

      await client.query("COMMIT");
      return reply.code(201).send({ studentPackageId, chargeId, transactionId });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/student-packages/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateStudentPackageSchema.parse(request.body);
    const { tenantId } = request.user;

    // Ishlatilgan darslar jami darslardan ko'p bo'lib qolmasligi kerak — bu tekshiruv
    // ikkalasi alohida-alohida yuborilgan holatlarda ham (faqat biri o'zgartirilsa ham) ishlashi kerak.
    const currentRes = await pool.query(
      `SELECT sp.used_lessons AS "usedLessons", sp.total_lessons AS "totalLessons"
       FROM student_packages sp JOIN students s ON s.id = sp.student_id
       WHERE sp.id = $1 AND s.tenant_id = $2`,
      [id, tenantId]
    );
    if (currentRes.rows.length === 0) return reply.code(404).send({ error: "Paket topilmadi" });
    const usedLessons = body.usedLessons ?? currentRes.rows[0].usedLessons;
    const totalLessons = body.totalLessons ?? currentRes.rows[0].totalLessons;
    if (totalLessons < usedLessons) {
      return reply.code(400).send({ error: `Jami darslar soni ishlatilgan darslardan (${usedLessons}) kam bo'lishi mumkin emas` });
    }

    const expiresAtProvided = Object.prototype.hasOwnProperty.call(body, "expiresAt");
    const { rows } = await pool.query(
      `UPDATE student_packages sp SET
         total_lessons = COALESCE($1, sp.total_lessons),
         used_lessons  = COALESCE($2, sp.used_lessons),
         status        = COALESCE($3, sp.status),
         expires_at    = CASE WHEN $4 THEN $5::date ELSE sp.expires_at END
       FROM students s
       WHERE sp.id = $6 AND s.id = sp.student_id AND s.tenant_id = $7
       RETURNING sp.id`,
      [
        body.totalLessons ?? null, body.usedLessons ?? null, body.status ?? null,
        expiresAtProvided, body.expiresAt ?? null,
        id, tenantId,
      ]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Paket topilmadi" });
    return { ok: true };
  });

  // ---- Stats ----

  app.get("/payments/stats", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { tenantId } = request.user;

    const receivedRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE tenant_id = $1 AND status = 'paid'`,
      [tenantId]
    );

    const paidThisMonthRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE tenant_id = $1 AND status = 'paid' AND date_trunc('month', created_at) = date_trunc('month', now())`,
      [tenantId]
    );

    // Kutilayotgan va qarzdorlik endi majburiyat QOLDIG'idan olinadi, shuning
    // uchun qisman to'lov ham to'g'ri hisoblanadi va bu ikki ko'rsatkich
    // hech qachon bir-birini qoplamaydi (statuslar o'zaro istisno).
    const pendingRes = await pool.query(
      `SELECT COALESCE(SUM(balance), 0) AS total FROM charge_balance
       WHERE tenant_id = $1 AND status IN ('deferred', 'partial')`,
      [tenantId]
    );

    const debtRes = await pool.query(
      `SELECT COALESCE(SUM(balance), 0) AS total FROM charge_balance
       WHERE tenant_id = $1 AND status = 'overdue'`,
      [tenantId]
    );

    // Obunasi tugagan/tugayotgan, lekin qarzi yo'q o'quvchilar — yangilash uchun eslatma.
    const expiringRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM student_packages sp
       JOIN students s ON s.id = sp.student_id
       WHERE s.tenant_id = $1 AND sp.status = 'active'
         AND sp.expires_at IS NOT NULL AND sp.expires_at <= CURRENT_DATE + 5`,
      [tenantId]
    );

    return {
      totalReceived: Number(receivedRes.rows[0].total),
      totalDebt: Number(debtRes.rows[0].total),
      totalPaidThisPeriod: Number(paidThisMonthRes.rows[0].total),
      totalPending: Number(pendingRes.rows[0].total),
      expiringCount: Number(expiringRes.rows[0].count),
    };
  });

  // ---- Charges (majburiyatlar) + to'lovlar ----
  //
  // Majburiyat = o'quvchi nima uchun qancha to'lashi kerak.
  // Tranzaksiya = shu majburiyatga kelgan pul. Bitta majburiyatga bir nechta
  // to'lov bo'lishi mumkin (qisman to'lov), qarz esa saqlanmaydi — hisoblanadi.

  app.get("/payments", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request) => {
    const { tenantId } = request.user;
    const q = request.query as {
      studentId?: string; status?: string; from?: string; to?: string;
      limit?: string; offset?: string;
    };

    const params: unknown[] = [tenantId];
    let where = "cb.tenant_id = $1";
    if (q.studentId) { params.push(q.studentId); where += ` AND cb.student_id = $${params.length}`; }
    if (q.status)    { params.push(q.status);    where += ` AND cb.status = $${params.length}`; }
    if (q.from)      { params.push(q.from);      where += ` AND cb.created_at >= $${params.length}::date`; }
    if (q.to)        { params.push(q.to);        where += ` AND cb.created_at < $${params.length}::date + 1`; }

    const limit = Math.min(Number(q.limit) || 100, 500);
    const offset = Math.max(Number(q.offset) || 0, 0);

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM charge_balance cb WHERE ${where}`,
      params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT cb.charge_id AS "id", cb.amount, cb.paid, cb.balance, cb.status,
              cb.note, cb.created_at AS "createdAt",
              cb.due_date AS "dueDate",
              (cb.due_date - CURRENT_DATE) AS "paymentDaysLeft",
              sp.expires_at AS "packageExpiresAt",
              (sp.expires_at - CURRENT_DATE) AS "packageDaysLeft",
              sp.id AS "studentPackageId",
              sp.used_lessons AS "usedLessons", sp.total_lessons AS "totalLessons",
              pk.name AS "packageName",
              cb.student_id AS "studentId", u.full_name AS "studentName",
              g.name AS "groupName",
              COALESCE(pmt.payments, '[]'::json) AS payments
       FROM charge_balance cb
       JOIN students s ON s.id = cb.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_packages sp ON sp.id = cb.student_package_id
       LEFT JOIN packages pk ON pk.id = sp.package_id
       LEFT JOIN LATERAL (
         SELECT gr.name FROM group_members gm
         JOIN groups gr ON gr.id = gm.group_id
         WHERE gm.student_id = s.id
         ORDER BY gm.joined_at
         LIMIT 1
       ) g ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
                  'id', t.id, 'amount', t.amount, 'method', t.method,
                  'status', t.status, 'paidAt', t.paid_at, 'createdAt', t.created_at
                ) ORDER BY t.created_at) AS payments
         FROM transactions t WHERE t.charge_id = cb.charge_id
       ) pmt ON true
       WHERE ${where}
       ORDER BY cb.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { items: rows, total: countRes.rows[0].total, limit, offset };
  });

  // Paketsiz majburiyat — masalan eski qarzni rasmiylashtirish yoki
  // ro'yxatdan o'tish to'lovi. Paket bilan bog'lash shart emas.
  app.post("/charges", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const body = chargeCreateSchema.parse(request.body);
    const { tenantId } = request.user;

    const stu = await pool.query(`SELECT 1 FROM students WHERE id = $1 AND tenant_id = $2`, [body.studentId, tenantId]);
    if (stu.rows.length === 0) return reply.code(404).send({ error: "O'quvchi topilmadi" });

    const { rows } = await pool.query(
      `INSERT INTO student_charges (tenant_id, student_id, amount, due_date, note, created_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now())) RETURNING id`,
      [tenantId, body.studentId, body.amount, body.dueDate ?? null, body.note ?? null, body.createdAt ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/charges/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = chargeUpdateSchema.parse(request.body);
    const { tenantId } = request.user;

    const dueProvided = Object.prototype.hasOwnProperty.call(body, "dueDate");
    const { rows } = await pool.query(
      `UPDATE student_charges SET
         amount   = COALESCE($1, amount),
         due_date = CASE WHEN $2 THEN $3::date ELSE due_date END,
         note     = COALESCE($4, note),
         created_at = CASE
                        WHEN $5::date IS NOT NULL AND $5::date <> created_at::date
                          THEN $5::timestamptz
                        ELSE created_at
                      END
       WHERE id = $6 AND tenant_id = $7
       RETURNING id`,
      [body.amount ?? null, dueProvided, body.dueDate ?? null, body.note ?? null, body.createdAt ?? null, id, tenantId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "To'lov topilmadi" });
    return { ok: true };
  });

  app.delete("/charges/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `SELECT c.id, c.student_package_id AS "studentPackageId", sp.used_lessons AS "usedLessons"
         FROM student_charges c
         LEFT JOIN student_packages sp ON sp.id = c.student_package_id
         WHERE c.id = $1 AND c.tenant_id = $2
         FOR UPDATE OF c`,
        [id, tenantId]
      );
      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "To'lov topilmadi" });
      }
      const ch = res.rows[0];

      // Darslari ishlatilgan paketni o'chirish davomat tarixini buzadi
      // (attendance_records.student_package_id NULL bo'lib qoladi).
      if (ch.studentPackageId && Number(ch.usedLessons) > 0) {
        await client.query("ROLLBACK");
        return reply.code(409).send({
          error: `Bu paketdan ${ch.usedLessons} ta dars ishlatilgan — o'chirib bo'lmaydi. Buning o'rniga to'lovni tahrirlang.`,
        });
      }

      // To'lovlar CASCADE bilan o'zi ketadi; paketni ham olib tashlaymiz,
      // aks holda to'lovsiz "osilib qolgan" darslar qoladi.
      await client.query(`DELETE FROM student_charges WHERE id = $1`, [id]);
      if (ch.studentPackageId) {
        await client.query(`DELETE FROM student_packages WHERE id = $1`, [ch.studentPackageId]);
      }
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // Majburiyatga to'lov qo'shish — qisman to'lov shu yerda ishlaydi.
  // Summa berilmasa qolgan qoldiq to'liq yopiladi ("To'landi" tugmasi).
  app.post("/charges/:id/payments", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = paymentCreateSchema.parse(request.body);
    const { tenantId } = request.user;

    const chRes = await pool.query(
      `SELECT charge_id AS "id", student_id AS "studentId",
              student_package_id AS "studentPackageId", balance
       FROM charge_balance WHERE charge_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (chRes.rows.length === 0) return reply.code(404).send({ error: "To'lov topilmadi" });
    const ch = chRes.rows[0];

    const remaining = Number(ch.balance);
    const amount = body.amount ?? remaining;
    if (amount <= 0) return reply.code(400).send({ error: "Bu to'lov allaqachon to'liq yopilgan" });

    const { rows } = await pool.query(
      `INSERT INTO transactions (tenant_id, student_id, student_package_id, charge_id,
                                 amount, method, status, paid_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid',
               COALESCE($7::timestamptz, now()), COALESCE($7::timestamptz, now()))
       RETURNING id`,
      [tenantId, ch.studentId, ch.studentPackageId, id, amount, body.method, body.paidAt ?? null]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  // Bitta to'lovni (pul harakatini) tahrirlash — majburiyatga tegmaydi.
  app.patch("/transactions/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = transactionUpdateSchema.parse(request.body);
    const { tenantId } = request.user;

    const { rows } = await pool.query(
      `UPDATE transactions SET
         amount = COALESCE($1, amount),
         method = COALESCE($2, method),
         status = COALESCE($3, status),
         created_at = CASE
                        WHEN $4::date IS NOT NULL AND $4::date <> created_at::date
                          THEN $4::timestamptz
                        ELSE created_at
                      END,
         paid_at = CASE
                     WHEN $5::text = 'paid'
                       THEN COALESCE(paid_at, COALESCE($4::timestamptz, now()))
                     WHEN $5::text IS NOT NULL THEN NULL
                     ELSE paid_at
                   END
       WHERE id = $6 AND tenant_id = $7
       RETURNING id`,
      [
        body.amount ?? null, body.method ?? null, body.status ?? null,
        body.createdAt ?? null, body.status ?? null,
        id, tenantId,
      ]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "To'lov topilmadi" });
    return { ok: true };
  });

  // Bitta to'lovni o'chirish endi xavfsiz: majburiyat va paket joyida qoladi,
  // faqat to'langan summa kamayadi (qoldiq avtomatik qayta hisoblanadi).
  app.delete("/transactions/:id", { onRequest: [app.requireRole("super_admin", "admin", "assistant_admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `DELETE FROM transactions WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "To'lov topilmadi" });
    return { ok: true };
  });
}

// ---- Payment provider webhooks (no auth — verified via provider signatures) ----

function md5(input: string) {
  return createHash("md5").update(input).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function paymentWebhookRoutes(app: FastifyInstance) {
  app.post("/payments/click/callback", async (request, reply) => {
    const body = request.body as Record<string, string | number>;
    const {
      click_trans_id,
      service_id,
      merchant_trans_id,
      amount,
      action,
      sign_time,
      sign_string,
      merchant_prepare_id,
    } = body;

    const baseParts = [click_trans_id, service_id, env.CLICK_SECRET_KEY, merchant_trans_id];
    if (Number(action) === 1) baseParts.push(merchant_prepare_id as string);
    baseParts.push(amount, action, sign_time);
    const expectedSign = md5(baseParts.map(String).join(""));

    if (!safeEqual(expectedSign, String(sign_string))) {
      return reply.send({ click_trans_id, merchant_trans_id, error: -1, error_note: "SIGN CHECK FAILED" });
    }

    const txRes = await pool.query(`SELECT id, amount, status, student_id AS "studentId" FROM transactions WHERE id = $1`, [merchant_trans_id]);
    if (txRes.rows.length === 0) {
      return reply.send({ click_trans_id, merchant_trans_id, error: -5, error_note: "Transaction not found" });
    }
    const tx = txRes.rows[0];

    if (Number(amount) !== Number(tx.amount)) {
      return reply.send({ click_trans_id, merchant_trans_id, error: -2, error_note: "Incorrect amount" });
    }

    if (Number(action) === 0) {
      return reply.send({
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: tx.id,
        error: 0,
        error_note: "Success",
      });
    }

    await pool.query(
      `UPDATE transactions SET status = 'paid', provider_ref = $1 WHERE id = $2`,
      [String(click_trans_id), tx.id]
    );

    await notifyStudent(
      pool, tx.studentId,
      `To'lovingiz qabul qilindi: ${Number(tx.amount).toLocaleString("uz-UZ")} so'm. Rahmat!`,
      { title: "To'lov qabul qilindi", type: "payment", icon: "wallet" }
    );

    return reply.send({
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: tx.id,
      error: 0,
      error_note: "Success",
    });
  });

  app.post("/payments/payme/callback", async (request, reply) => {
    const auth = request.headers.authorization ?? "";
    const expected = "Basic " + Buffer.from(`Paycom:${env.PAYME_SECRET_KEY}`).toString("base64");
    if (!safeEqual(auth, expected)) {
      return reply.code(200).send({ error: { code: -32504, message: "Insufficient privilege" } });
    }

    const { method, params, id: rpcId } = request.body as {
      method: string;
      params: Record<string, unknown>;
      id: number;
    };

    const account = params?.account as Record<string, string> | undefined;
    const transactionId = account?.transaction_id;

    if (method === "CheckPerformTransaction" || method === "CreateTransaction") {
      if (!transactionId) {
        return reply.send({ error: { code: -31050, message: "Transaction not found" }, id: rpcId });
      }
      const txRes = await pool.query(`SELECT id, amount, status FROM transactions WHERE id = $1`, [transactionId]);
      if (txRes.rows.length === 0) {
        return reply.send({ error: { code: -31050, message: "Transaction not found" }, id: rpcId });
      }
      const tx = txRes.rows[0];
      const expectedAmount = Math.round(Number(tx.amount) * 100);
      if (Number(params.amount) !== expectedAmount) {
        return reply.send({ error: { code: -31001, message: "Incorrect amount" }, id: rpcId });
      }

      if (method === "CheckPerformTransaction") {
        return reply.send({ result: { allow: true }, id: rpcId });
      }

      await pool.query(
        `UPDATE transactions SET provider_ref = $1 WHERE id = $2 AND status = 'pending'`,
        [String(params.id), tx.id]
      );
      return reply.send({
        result: { transaction: tx.id, state: 1, create_time: Date.now() },
        id: rpcId,
      });
    }

    if (method === "PerformTransaction") {
      const txRes = await pool.query(
        `SELECT id, amount, status, student_id AS "studentId", paid_at AS "paidAt" FROM transactions WHERE provider_ref = $1`,
        [String(params.id)]
      );
      if (txRes.rows.length === 0) {
        return reply.send({ error: { code: -31003, message: "Transaction not found" }, id: rpcId });
      }
      const tx = txRes.rows[0];

      // Payme qayta chaqirsa (retry) — allaqachon to'langan bo'lsa, qayta yangilamasdan
      // va bildirishnomani qayta yubormasdan, dastlabki natijani qaytaramiz.
      if (tx.status === "paid" && tx.paidAt) {
        return reply.send({ result: { transaction: tx.id, state: 2, perform_time: new Date(tx.paidAt).getTime() }, id: rpcId });
      }

      const paidAt = new Date();
      await pool.query(`UPDATE transactions SET status = 'paid', paid_at = $2 WHERE id = $1`, [tx.id, paidAt]);
      await notifyStudent(
        pool, tx.studentId,
        `To'lovingiz qabul qilindi: ${Number(tx.amount).toLocaleString("uz-UZ")} so'm. Rahmat!`,
        { title: "To'lov qabul qilindi", type: "payment", icon: "wallet" }
      );
      return reply.send({ result: { transaction: tx.id, state: 2, perform_time: paidAt.getTime() }, id: rpcId });
    }

    if (method === "CancelTransaction") {
      const txRes = await pool.query(`SELECT id FROM transactions WHERE provider_ref = $1`, [String(params.id)]);
      if (txRes.rows.length === 0) {
        return reply.send({ error: { code: -31003, message: "Transaction not found" }, id: rpcId });
      }
      const tx = txRes.rows[0];
      await pool.query(`UPDATE transactions SET status = 'cancelled' WHERE id = $1`, [tx.id]);
      return reply.send({ result: { transaction: tx.id, state: -1, cancel_time: Date.now() }, id: rpcId });
    }

    if (method === "CheckTransaction") {
      const txRes = await pool.query(
        `SELECT id, status, created_at FROM transactions WHERE provider_ref = $1`,
        [String(params.id)]
      );
      if (txRes.rows.length === 0) {
        return reply.send({ error: { code: -31003, message: "Transaction not found" }, id: rpcId });
      }
      const tx = txRes.rows[0];
      const state = tx.status === "paid" ? 2 : tx.status === "cancelled" ? -1 : 1;
      return reply.send({
        result: { transaction: tx.id, state, create_time: new Date(tx.created_at).getTime() },
        id: rpcId,
      });
    }

    return reply.send({ error: { code: -32601, message: "Method not found" }, id: rpcId });
  });
}
