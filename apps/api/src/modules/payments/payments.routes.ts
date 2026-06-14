import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { env } from "../../env.js";
import { notifyStudent } from "../notifications/notify.js";

const packageCreateSchema = z.object({
  name: z.string().min(2),
  lessonsCount: z.number().int().positive(),
  price: z.number().positive(),
});

const packageUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  lessonsCount: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  active: z.boolean().optional(),
});

const assignSchema = z.object({
  studentId: z.string().uuid(),
  packageId: z.string().uuid(),
  method: z.enum(["click", "payme", "naqd", "uzcard"]),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function paymentsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // ---- Packages ----

  app.get("/packages", async (request) => {
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `SELECT id, name, lessons_count AS "lessonsCount", price, active
       FROM packages WHERE tenant_id = $1 ORDER BY price`,
      [tenantId]
    );
    return rows;
  });

  app.post("/packages", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
    const body = packageCreateSchema.parse(request.body);
    const { tenantId } = request.user;
    const { rows } = await pool.query(
      `INSERT INTO packages (tenant_id, name, lessons_count, price)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, body.name, body.lessonsCount, body.price]
    );
    return reply.code(201).send({ id: rows[0].id });
  });

  app.patch("/packages/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = packageUpdateSchema.parse(request.body);
    const { tenantId } = request.user;
    await pool.query(
      `UPDATE packages SET
         name = COALESCE($1, name),
         lessons_count = COALESCE($2, lessons_count),
         price = COALESCE($3, price),
         active = COALESCE($4, active)
       WHERE id = $5 AND tenant_id = $6`,
      [body.name ?? null, body.lessonsCount ?? null, body.price ?? null, body.active ?? null, id, tenantId]
    );
    return { ok: true };
  });

  app.delete("/packages/:id", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user;
    await pool.query(`UPDATE packages SET active = false WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return { ok: true };
  });

  // ---- Student packages ----

  app.get("/students/:id/packages", async (request) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(
      `SELECT sp.id, sp.total_lessons AS "totalLessons", sp.used_lessons AS "usedLessons",
              sp.status, sp.purchased_at AS "purchasedAt", sp.expires_at AS "expiresAt",
              p.name AS "packageName", p.price
       FROM student_packages sp
       JOIN packages p ON p.id = sp.package_id
       WHERE sp.student_id = $1
       ORDER BY sp.purchased_at DESC`,
      [id]
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

  app.post("/student-packages", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request, reply) => {
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
        `INSERT INTO student_packages (student_id, package_id, total_lessons, expires_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [body.studentId, body.packageId, pkg.lessons_count, body.expiresAt ?? null]
      );
      const studentPackageId = spRes.rows[0].id;

      const txStatus = body.method === "click" || body.method === "payme" ? "pending" : "paid";
      const txRes = await client.query(
        `INSERT INTO transactions (tenant_id, student_id, student_package_id, amount, method, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenantId, body.studentId, studentPackageId, pkg.price, body.method, txStatus]
      );

      await client.query("COMMIT");
      return reply.code(201).send({ studentPackageId, transactionId: txRes.rows[0].id });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ---- Stats ----

  app.get("/payments/stats", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
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

    const pendingRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE tenant_id = $1 AND status = 'pending'`,
      [tenantId]
    );

    // Debt: students with active packages whose lessons are fully used but package not yet renewed,
    // approximated as remaining unused lessons valued at per-lesson price for active packages near/at completion.
    const debtRes = await pool.query(
      `SELECT COALESCE(SUM(p.price), 0) AS total
       FROM student_packages sp
       JOIN students s ON s.id = sp.student_id
       JOIN packages p ON p.id = sp.package_id
       WHERE s.tenant_id = $1 AND sp.status = 'active' AND sp.used_lessons >= sp.total_lessons`,
      [tenantId]
    );

    return {
      totalReceived: Number(receivedRes.rows[0].total),
      totalDebt: Number(debtRes.rows[0].total),
      totalPaidThisPeriod: Number(paidThisMonthRes.rows[0].total),
      totalPending: Number(pendingRes.rows[0].total),
    };
  });

  // ---- Transactions ----

  app.get("/transactions", { onRequest: [app.requireRole("super_admin", "admin")] }, async (request) => {
    const { tenantId } = request.user;
    const { studentId } = request.query as { studentId?: string };
    const params: unknown[] = [tenantId];
    let where = "t.tenant_id = $1";
    if (studentId) {
      params.push(studentId);
      where += ` AND t.student_id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT t.id, t.amount, t.method, t.status, t.provider_ref AS "providerRef",
              t.created_at AS "createdAt", u.full_name AS "studentName",
              g.name AS "groupName"
       FROM transactions t
       JOIN students s ON s.id = t.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN LATERAL (
         SELECT gr.name FROM group_members gm
         JOIN groups gr ON gr.id = gm.group_id
         WHERE gm.student_id = s.id
         ORDER BY gm.joined_at
         LIMIT 1
       ) g ON true
       WHERE ${where}
       ORDER BY t.created_at DESC`,
      params
    );
    return rows;
  });
}

// ---- Payment provider webhooks (no auth — verified via provider signatures) ----

function md5(input: string) {
  return createHash("md5").update(input).digest("hex");
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

    if (expectedSign !== sign_string) {
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

    await notifyStudent(pool, tx.studentId, `To'lovingiz qabul qilindi: ${Number(tx.amount).toLocaleString("uz-UZ")} so'm. Rahmat!`);

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
    if (auth !== expected) {
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
      const txRes = await pool.query(`SELECT id, amount, status, student_id AS "studentId" FROM transactions WHERE provider_ref = $1`, [String(params.id)]);
      if (txRes.rows.length === 0) {
        return reply.send({ error: { code: -31003, message: "Transaction not found" }, id: rpcId });
      }
      const tx = txRes.rows[0];
      await pool.query(`UPDATE transactions SET status = 'paid' WHERE id = $1`, [tx.id]);
      await notifyStudent(pool, tx.studentId, `To'lovingiz qabul qilindi: ${Number(tx.amount).toLocaleString("uz-UZ")} so'm. Rahmat!`);
      return reply.send({ result: { transaction: tx.id, state: 2, perform_time: Date.now() }, id: rpcId });
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
