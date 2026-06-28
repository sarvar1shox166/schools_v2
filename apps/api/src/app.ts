import path from "node:path";
import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import authPlugin from "./plugins/auth.js";
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
  await mkdir(UPLOADS_ROOT, { recursive: true });

  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB
  app.register(websocket);
  app.register(staticFiles, { root: UPLOADS_ROOT, prefix: "/uploads/" });
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
