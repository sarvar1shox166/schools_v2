import { buildApp } from "./app.js";
import { env } from "./env.js";
import { startTeacherAbsenceSweep } from "./modules/attendance/teacher-absence-sweep.js";
import { startLessonAutoEndSweep } from "./modules/attendance/lesson-auto-end-sweep.js";
import { startTelegramReminderSweep } from "./modules/telegram/reminder-sweep.js";

buildApp().then((app) =>
  app
    .listen({ port: env.PORT, host: "0.0.0.0" })
    .then((address) => {
      app.log.info(`API listening on ${address}`);
      startTeacherAbsenceSweep();
      startLessonAutoEndSweep();
      startTelegramReminderSweep();
    })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    })
).catch((err) => {
  console.error(err);
  process.exit(1);
});
