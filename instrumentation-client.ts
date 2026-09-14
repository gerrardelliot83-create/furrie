import * as Sentry from "@sentry/nextjs";

// D1: SENTRY_TRACES_SAMPLE_RATE is inlined into the client bundle by the
// `env` block in next.config.ts, so the browser uses the same knob as the
// server. Default matches the previous 25%.
const parsedRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.25");
const tracesSampleRate = Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 1) : 0.25;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // SEC-12
  sendDefaultPii: false,

  tracesSampleRate,

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
