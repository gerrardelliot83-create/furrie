import * as Sentry from '@sentry/nextjs';

/**
 * Sends a video-call problem to Sentry (VC-1). Before VC-1 every join failure
 * stayed in the browser console, so a week of failed calls raised no alert.
 * Ids and Daily's error type only: no names, emails or call content.
 */
export function reportCallProblem(
  kind: string,
  context: {
    consultationId: string;
    role: 'customer' | 'vet';
    /** Fatal problems stop the call; warnings (camera, reconnecting) don't. */
    level?: 'error' | 'warning';
    detail?: string | null;
  }
): void {
  try {
    Sentry.captureMessage(`video-call: ${kind}`, {
      level: context.level ?? 'error',
      tags: { area: 'video-call', 'call.kind': kind, 'call.role': context.role },
      extra: { consultationId: context.consultationId, detail: context.detail ?? null },
    });
  } catch {
    // Reporting must never break the call screen.
  }
}
