/**
 * When the welcome email may go (CX-1: at most once per account).
 *
 * Kept apart from postSignInTasks.ts (server-only, talks to Supabase and
 * Resend) so the rule can be unit-tested.
 */

/** Only send a welcome email to accounts created in the last half hour. */
export const WELCOME_WINDOW_MS = 30 * 60 * 1000;

/**
 * Set in the account's auth app_metadata once the welcome email has gone.
 * app_metadata can only be written with the service role, so a customer
 * can't clear it, and getUser() returns it fresh on every render.
 */
export const WELCOME_EMAIL_SENT_KEY = 'welcome_email_sent_at';

/**
 * How many sends have failed so far (app_metadata). Part of the idempotency
 * key, so a failed send is retried under a new key on the next render.
 * Resend's docs don't say whether a failed first send is replayed for the
 * 24 hours a key lives; this way a 429 or 5xx can't hold the email back.
 */
export const WELCOME_EMAIL_ATTEMPT_KEY = 'welcome_email_attempt';

/** Give up after this many failed sends (each needs a new dashboard render). */
export const WELCOME_EMAIL_MAX_ATTEMPTS = 5;

/** Failed sends so far, from app_metadata. */
export function welcomeEmailAttempt(appMetadata: Record<string, unknown> | null | undefined): number {
  const value = appMetadata?.[WELCOME_EMAIL_ATTEMPT_KEY];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * Resend sends at most one email per idempotency key within 24 hours, even
 * when two requests with the key arrive at the same moment (the second gets
 * 409 concurrent_idempotent_requests). The 30-minute window is far inside
 * that, so this is what stops two dashboard renders in parallel from both
 * sending. The attempt number changes only after a failed send.
 */
export function welcomeEmailIdempotencyKey(userId: string, attempt: number): string {
  return `welcome-email/${userId}/${attempt}`;
}

/** Whether this render should try the welcome email. */
export function shouldSendWelcomeEmail(input: {
  email: string | null | undefined;
  createdAt: string | null | undefined;
  appMetadata: Record<string, unknown> | null | undefined;
  now?: number;
}): boolean {
  if (!input.email || !input.createdAt) return false;
  const age = (input.now ?? Date.now()) - new Date(input.createdAt).getTime();
  if (!(age <= WELCOME_WINDOW_MS)) return false; // also refuses an unreadable date
  if (input.appMetadata?.[WELCOME_EMAIL_SENT_KEY]) return false;
  return welcomeEmailAttempt(input.appMetadata) < WELCOME_EMAIL_MAX_ATTEMPTS;
}

/**
 * What to record after a send: the sent marker, a bumped attempt number, or
 * nothing.
 * - sent: done.
 * - already used (409 invalid_idempotent_request): an earlier send with this
 *   key went through, so the email has gone; record it as sent.
 * - in progress (409 concurrent_idempotent_requests): another render is
 *   sending it right now; that render records the result.
 * - any other failure: try again next render under a new key.
 */
export function welcomeEmailRecord(
  result: { success: boolean; idempotency?: 'in_progress' | 'already_used' },
  attempt: number,
  now: Date = new Date()
): Record<string, string | number> | null {
  if (result.success || result.idempotency === 'already_used') {
    return { [WELCOME_EMAIL_SENT_KEY]: now.toISOString() };
  }
  if (result.idempotency === 'in_progress') return null;
  return { [WELCOME_EMAIL_ATTEMPT_KEY]: attempt + 1 };
}
