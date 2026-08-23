import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../db/pool.js";

const leadSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(5).max(30),
  age: z.number().int().positive().max(120).optional(),
  level: z.string().max(100).optional(),
});

// Bu ochiq, autentifikatsiyasiz endpoint — login formadagidek IP bo'yicha
// qattiqroq limit qo'yiladi, aks holda spam bilan Arizalar bo'limi to'lib ketishi mumkin.
const publicLeadRateLimit = {
  config: {
    rateLimit: { max: 5, timeWindow: "1 minute" },
  },
};

/** Hozircha bitta standart maktab (tenant) bor — landing sahifa shu bitta
 *  maktabga tegishli, shuning uchun tenant qattiq (birinchi yaratilgan
 *  tenant) belgilanadi. Bir nechta maktab uchun landing kerak bo'lsa, bu
 *  yerga slug/domen orqali tenant aniqlash qo'shiladi. */
async function getDefaultTenantId(): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`);
  return rows[0]?.id ?? null;
}

/** Landing sahifadagi "Bepul dars olish" formasi shu yerga yozadi — so'rov
 *  beruvchi hali tizimda hisobga ega emas, shuning uchun autentifikatsiya
 *  talab qilinmaydi. Natija admin panelning "Lidlar" bo'limida ko'rinadi —
 *  Arizalar (CRM)dan ataylab ajratilgan, chalkashlik bo'lmasligi uchun. */
export async function publicLeadsRoutes(app: FastifyInstance) {
  app.post("/public/leads", publicLeadRateLimit, async (request, reply) => {
    const body = leadSchema.parse(request.body);
    const tenantId = await getDefaultTenantId();
    if (!tenantId) return reply.code(500).send({ error: "Tenant not configured" });

    await pool.query(
      `INSERT INTO leads (tenant_id, full_name, phone, age, level)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, body.fullName, body.phone, body.age ?? null, body.level ?? null]
    );

    return reply.code(201).send({ ok: true });
  });
}
