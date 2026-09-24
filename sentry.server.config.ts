import * as Sentry from "@sentry/nextjs";

// D1: one knob for the remediation work. Gerard sets SENTRY_TRACES_SAMPLE_RATE=1
// in Vercel while the phases run; default matches the previous 25%.
const parsedRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.25");
const tracesSampleRate = Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 1) : 0.25;

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // SEC-12: never attach request headers / IP / user identifiers by default.
  sendDefaultPii: false,

  tracesSampleRate,
});
