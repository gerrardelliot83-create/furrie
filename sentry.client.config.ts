import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance Monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session Replay — sample 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop',
    // Network errors users can't control
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // Next.js hydration (common, usually harmless)
    'Hydration failed',
    'Text content does not match',
  ],

  integrations: [
    Sentry.replayIntegration(),
  ],
});
