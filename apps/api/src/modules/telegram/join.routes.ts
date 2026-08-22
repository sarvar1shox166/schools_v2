import type { FastifyInstance } from "fastify";
import { pool } from "../../db/pool.js";
import { env } from "../../env.js";
import { checkStudentCanJoin } from "../attendance/join-check.js";
import { verifyJoinToken } from "./join-link.js";
import { todayStr } from "../../lib/schedule-dates.js";

/** Telegramdagi "Darsga kirish" tugmasi shu yerga tushadi — HECH QANDAY
 *  autentifikatsiya talab qilinmaydi (havola imzolangan token orqali kim
 *  ekanini isbotlaydi), lekin ochilganda serverda xuddi veb-ilovadagi kabi
 *  tekshiruv (o'qituvchi kirdimi, paket muddati) qayta bajariladi — token
 *  faqat "kim, qaysi dars" ekanini bildiradi, kirish huquqini kafolatlamaydi. */
export async function telegramJoinRoutes(app: FastifyInstance) {
  app.get("/telegram/join", async (request, reply) => {
    const { t } = request.query as { t?: string };
    const fallback = env.APP_URL ? `${env.APP_URL}/student` : "/student";

    const payload = t ? verifyJoinToken(t) : null;
    if (!payload) return reply.redirect(fallback);

    const studentRes = await pool.query(
      `SELECT tenant_id AS "tenantId" FROM students WHERE id = $1`,
      [payload.studentId]
    );
    const tenantId = studentRes.rows[0]?.tenantId;
    if (!tenantId) return reply.redirect(fallback);

    // Token bir necha kun oldin yuborilgan bo'lishi mumkin edi (masalan
    // qayta ishga tushirish paytida kechikkan xabar) — faqat o'sha aniq
    // sana uchun amal qiladi, boshqa kunga ko'chirib ishlatib bo'lmaydi.
    const result = await checkStudentCanJoin(payload.studentId, payload.scheduleSlotId, tenantId, payload.date);
    if (!result.ok || payload.date !== todayStr()) return reply.redirect(fallback);

    const urlRes = await pool.query(
      `SELECT sl.meeting_url AS "meetingUrl", COALESCE(t2.default_meeting_url, t.default_meeting_url) AS "teacherDefaultMeetingUrl"
       FROM schedule_slots sl
       LEFT JOIN groups g ON g.id = sl.group_id
       LEFT JOIN teachers t ON t.id = g.teacher_id
       LEFT JOIN teachers t2 ON t2.id = sl.teacher_id
       WHERE sl.id = $1`,
      [payload.scheduleSlotId]
    );
    const effectiveUrl = urlRes.rows[0]?.meetingUrl || urlRes.rows[0]?.teacherDefaultMeetingUrl;
    if (!effectiveUrl) return reply.redirect(fallback);

    return reply.redirect(effectiveUrl);
  });
}
