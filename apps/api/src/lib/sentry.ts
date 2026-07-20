import * as Sentry from "@sentry/node";
import { env } from "../env.js";

let initialized = false;

/** DSN bo'lmasa hech narsa qilmaydi — dev muhitida xavfsiz no-op. */
export function initSentry() {
  if (!env.SENTRY_DSN || initialized) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureError(err: unknown) {
  if (!initialized) return;
  Sentry.captureException(err);
}
