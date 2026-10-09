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
 * Resend sends at most one email per idempotency key within 24 hours, even
 * when two requests with the key arrive at the same moment. The 30-minute
 * window is far inside that, so this is what stops two dashboard renders in
 * parallel from both sending.
 */
export function welcomeEmailIdempotencyKey(userId: string): string {
  return `welcome-email/${userId}`;
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
  return !input.appMetadata?.[WELCOME_EMAIL_SENT_KEY];
}
