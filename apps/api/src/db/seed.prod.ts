import { pool } from "./pool.js";
import { hashPassword } from "../modules/auth/auth.service.js";

async function seedProd() {
  const SCHOOL_NAME  = process.env.SEED_SCHOOL_NAME  ?? "Shaxmat Maktabi";
  const SCHOOL_SLUG  = process.env.SEED_SCHOOL_SLUG  ?? "main";
  const ADMIN_PHONE  = process.env.SEED_ADMIN_PHONE  ?? "+998900000000";
  const ADMIN_NAME   = process.env.SEED_ADMIN_NAME   ?? "Admin";
  const ADMIN_PASS   = process.env.SEED_ADMIN_PASS;

  if (!ADMIN_PASS) {
    console.error("Xato: SEED_ADMIN_PASS muhit o'zgaruvchisi bo'sh!");
    console.error("  SEED_ADMIN_PASS=<parol> node dist/db/seed.prod.js");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [SCHOOL_NAME, SCHOOL_SLUG]
    );
    const tenantId = tenantRes.rows[0].id as string;

    const hash = await hashPassword(ADMIN_PASS);

    const existing = await client.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role = 'admin' AND login = $2`,
      [tenantId, ADMIN_PHONE]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET password_hash = $1, full_name = $2 WHERE id = $3`,
        [hash, ADMIN_NAME, existing.rows[0].id]
      );
      console.log(`\n✅  Admin yangilandi (id: ${existing.rows[0].id})`);
    } else {
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, role, full_name, phone, login, password_hash)
         VALUES ($1, 'admin', $2, $3, $3, $4) RETURNING id`,
        [tenantId, ADMIN_NAME, ADMIN_PHONE, hash]
      );
      console.log(`\n✅  Admin yaratildi (id: ${userRes.rows[0].id})`);
    }

    await client.query("COMMIT");

    console.log("─────────────────────────────────────────");
    console.log(`   Maktab : ${SCHOOL_NAME}  (slug: ${SCHOOL_SLUG})`);
    console.log(`   Login  : ${ADMIN_PHONE}`);
    console.log(`   Parol  : ${ADMIN_PASS}`);
    console.log("─────────────────────────────────────────\n");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProd().catch((err) => {
  console.error(err);
  process.exit(1);
});
