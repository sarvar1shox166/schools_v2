import * as Sentry from "@sentry/react";

let initialized = false;

/** DSN bo'lmasa hech narsa qilmaydi — dev muhitida xavfsiz no-op. */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || initialized) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureError(err: unknown) {
  if (!initialized) return;
  Sentry.captureException(err);
}
