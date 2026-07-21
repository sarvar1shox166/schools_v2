import path from "node:path";
import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import authPlugin from "./plugins/auth.js";
import { env } from "./env.js";
import { initSentry, captureError } from "./lib/sentry.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { teachersRoutes } from "./modules/teachers/teachers.routes.js";
import { studentsRoutes } from "./modules/students/students.routes.js";
import { groupsRoutes } from "./modules/groups/groups.routes.js";
import { scheduleRoutes } from "./modules/schedule/schedule.routes.js";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { paymentsRoutes, paymentWebhookRoutes } from "./modules/payments/payments.routes.js";
import { payrollRoutes } from "./modules/payroll/payroll.routes.js";
import { gamificationRoutes } from "./modules/gamification/gamification.routes.js";
import { pvpRoutes } from "./modules/pvp/pvp.ws.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { teacherPortalRoutes } from "./modules/teacher-portal/teacher-portal.routes.js";
import { materialsRoutes } from "./modules/materials/materials.routes.js";
import { messagesRoutes } from "./modules/messages/messages.routes.js";
import { videosRoutes } from "./modules/videos/videos.routes.js";
import { lessonsHubRoutes } from "./modules/lessons-hub/lessons-hub.routes.js";
import { applicationsRoutes } from "./modules/applications/applications.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { staffRoutes } from "./modules/staff/staff.routes.js";
import { lessonsRoutes } from "./modules/lessons/lessons.routes.js";
import { homeworkRoutes } from "./modules/homework/homework.routes.js";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

export async function buildApp() {
  initSentry();
  await mkdir(UPLOADS_ROOT, { recursive: true });

  const app = Fastify({ logger: true });

  // Zod validation failures otherwise surface as opaque 500s (Fastify's default
  // handler doesn't know about ZodError) — return a proper 400 with the field-level
  // message instead so the frontend can show something more useful than "server error".
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return reply.code(400).send({
        error: "validation_error",
        message: first ? `${first.path.join(".")}: ${first.message}` : "Invalid request",
      });
    }
    request.log.error(err);
    if (!err.statusCode || err.statusCode >= 500) captureError(err);
    return reply.code(err.statusCode ?? 500).send({ error: "Internal Server Error" });
  });

  // Standart xavfsizlik sarlavhalari (X-Content-Type-Options, X-Frame-Options,
  // HSTS va h.k.). Bu server asosan JSON API bo'lgani uchun CSP faqat /uploads
  // orqali xizmat qilinadigan video/rasm fayllariga ta'sir qilmasligi uchun
  // yengil sozlangan.
  app.register(helmet, {
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        mediaSrc: ["'self'"],
      },
    },
  });

  // The web app is served same-origin via nginx, so no cross-origin allowance is needed by default.
  // Set CORS_ORIGINS (comma-separated) to allow specific external origins (e.g. a future mobile app).
  const allowedOrigins = env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  app.register(cors, { origin: allowedOrigins.length > 0 ? allowedOrigins : false });
  app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });
  // Outer safety net — actual per-endpoint caps are tighter (see lib/storage.ts UPLOAD_LIMITS).
  app.register(multipart, { limits: { fileSize: 4 * 1024 * 1024 * 1024 } }); // 4 GB
  app.register(websocket);
  // Faqat ochiq bo'lishi kerak papkalar (video/rasm — <video>/<img> to'g'ridan-to'g'ri
  // shu URL'larni ishlatadi, Authorization header yubora olmaydi). "materials/" ataylab
  // bu yerga qo'shilmagan — u faqat GET /materials/:id/download orqali (avtorizatsiya bilan)
  // xizmat qilinadi, aks holda "shaxsiy" materiallar hech qanday tekshiruvsiz ochiq bo'lib qolardi.
  await mkdir(path.join(UPLOADS_ROOT, "videos"), { recursive: true });
  await mkdir(path.join(UPLOADS_ROOT, "images"), { recursive: true });
  app.register(staticFiles, { root: path.join(UPLOADS_ROOT, "videos"), prefix: "/uploads/videos/" });
  app.register(staticFiles, { root: path.join(UPLOADS_ROOT, "images"), prefix: "/uploads/images/", decorateReply: false });
  app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(teachersRoutes, { prefix: "/api/v1" });
  app.register(studentsRoutes, { prefix: "/api/v1" });
  app.register(groupsRoutes, { prefix: "/api/v1" });
  app.register(scheduleRoutes, { prefix: "/api/v1" });
  app.register(attendanceRoutes, { prefix: "/api/v1" });
  app.register(paymentsRoutes, { prefix: "/api/v1" });
  app.register(paymentWebhookRoutes, { prefix: "/api/v1" });
  app.register(payrollRoutes, { prefix: "/api/v1" });
  app.register(gamificationRoutes, { prefix: "/api/v1" });
  app.register(pvpRoutes, { prefix: "/api/v1" });
  app.register(notificationsRoutes, { prefix: "/api/v1" });
  app.register(reportsRoutes, { prefix: "/api/v1" });
  app.register(teacherPortalRoutes, { prefix: "/api/v1" });
  app.register(materialsRoutes, { prefix: "/api/v1" });
  app.register(messagesRoutes, { prefix: "/api/v1" });
  app.register(videosRoutes, { prefix: "/api/v1" });
  app.register(lessonsHubRoutes, { prefix: "/api/v1" });
  app.register(applicationsRoutes, { prefix: "/api/v1" });
  app.register(settingsRoutes, { prefix: "/api/v1" });
  app.register(staffRoutes, { prefix: "/api/v1" });
  app.register(lessonsRoutes, { prefix: "/api/v1" });
  app.register(homeworkRoutes, { prefix: "/api/v1" });

  return app;
}
