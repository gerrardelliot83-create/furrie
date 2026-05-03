import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // Sample 100% in dev, 25% in production. Per audit F-05.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.25,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Filter noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Failed to fetch",
    "NetworkError",
    "Load failed",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
