import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // Sample 100% in dev, 25% in production. Per audit F-05.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.25,

  // Include local variables in stack traces for better debugging
  includeLocalVariables: true,
});
