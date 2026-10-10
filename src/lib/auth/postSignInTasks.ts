import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { sendWelcomeEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FEATURES } from '@/lib/config/features';
import {
  shouldSendWelcomeEmail,
  welcomeEmailAttempt,
  welcomeEmailIdempotencyKey,
  welcomeEmailRecord,
} from './welcomeEmailRule';

/**
 * Side-effects that belong to signing in but that the user is not waiting for.
 *
 * These used to run as two fire-and-forget `fetch` calls from the OTP form, the
 * moment the code was verified — competing with the navigation the user *was*
 * waiting on, and both liable to be lost if the tab closed or the page tore
 * down first. The welcome email in particular hung off a 200ms `setTimeout`.
 *
 * They now run from `after()` on the first authenticated server render, so they
 * execute after the response has been streamed and cost the user nothing. All
 * are idempotent and safe to re-run on every render (the welcome email since
 * CX-1: it is sent once per account).
 */

/**
 * Send the welcome email for an account at most once (CX-1): a Resend
 * idempotency key per account and attempt (stops two renders racing), then a
 * marker in auth app_metadata so later renders don't call Resend at all. A
 * failed send bumps the attempt so the next render retries under a new key.
 * See welcomeEmailRule.ts.
 *
 * `attempt` is the account's failed-send count from app_metadata (0 for a
 * brand-new account).
 */
export async function sendWelcomeEmailOnce(
  userId: string,
  email: string,
  customerName: string,
  attempt = 0
) {
  const result = await sendWelcomeEmail(
    email,
    { customerName },
    { idempotencyKey: welcomeEmailIdempotencyKey(userId, attempt) }
  );
  const record = welcomeEmailRecord(result, attempt);
  if (record) {
    // GoTrue merges app_metadata keys, so this adds one key and keeps the rest.
    // If it fails, the idempotency key still stops a second send in the window.
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: record });
      if (error) console.error('[postSignIn] could not record the welcome email:', error.message);
    } catch (err) {
      console.error('[postSignIn] could not record the welcome email:', err);
    }
  }
  return result;
}

interface WelcomeEmailInput {
  userId: string;
  email: string | null | undefined;
  fullName: string | null | undefined;
  createdAt: string | null | undefined;
  /** The account's auth app_metadata, from getUser() (so it is current). */
  appMetadata: Record<string, unknown> | null | undefined;
}

/**
 * Send the welcome email if this is a freshly created account that hasn't
 * had one yet.
 *
 * The dashboard runs this on every render. It used to check only the
 * account's age, so every dashboard visit in the first 30 minutes sent
 * another welcome email (CX-1). Callers pass fields they have already
 * fetched; the only extra round-trip is the one-time marker write.
 */
export async function maybeSendWelcomeEmail({
  userId,
  email,
  fullName,
  createdAt,
  appMetadata,
}: WelcomeEmailInput): Promise<void> {
  if (!email || !shouldSendWelcomeEmail({ email, createdAt, appMetadata })) return;

  try {
    await sendWelcomeEmailOnce(userId, email, fullName || 'there', welcomeEmailAttempt(appMetadata));
  } catch (err) {
    // Never surface: the page has already been sent to the user.
    console.error('[postSignIn] welcome email failed:', err);
  }
}

/**
 * Redeem the invite code the user carried in from sign-up, if any.
 *
 * The code travels in `user_metadata.invite_code`, set via `signInWithOtp`'s
 * `options.data` when the account is created. That replaces the old
 * `sessionStorage` hand-off, which was invisible to the magic-link path and to
 * the mobile apps — both of which silently dropped the credit.
 *
 * `redeem_invite_code` (migration 021) is atomic and idempotent, so calling it
 * on every render is harmless: once redeemed, it short-circuits.
 */
export async function maybeRedeemInvite(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  if (!FEATURES.ENABLE_INVITES) return;

  const code = user.user_metadata?.invite_code;
  if (typeof code !== 'string' || !code.trim()) return;

  try {
    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_code: code.trim().toUpperCase(),
    });

    if (error) {
      console.error('[postSignIn] invite redemption failed:', error);
      return;
    }

    const result = data as { ok?: boolean; reason?: string } | null;
    if (!result?.ok && result?.reason) {
      // Expected outcomes (self-referral, code already spent). Logged rather
      // than surfaced — the user is already on their dashboard.
      console.info('[postSignIn] invite not redeemed:', result.reason);
    }
  } catch (err) {
    console.error('[postSignIn] invite redemption threw:', err);
  }
}

/** Accounts younger than this get their sign-up credits before the first render. */
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

export function isNewAccount(createdAt: string | null | undefined): boolean {
  return !!createdAt && Date.now() - new Date(createdAt).getTime() <= NEW_ACCOUNT_WINDOW_MS;
}

/**
 * Give a waitlisted customer their founding free consultation (L1): one
 * 60-day credit if their account email is on the founding list and it has
 * not been granted before. The email is read from their profile inside the
 * database function, never taken from the caller. Idempotent; never throws.
 */
export async function maybeClaimFoundingCredit(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('l1_claim_founding_credit', { p_user_id: userId });
    if (error) {
      console.error('[postSignIn] founding credit claim failed:', error.message);
    }
  } catch (err) {
    console.error('[postSignIn] founding credit claim threw:', err);
  }
}

/**
 * For a brand-new account: redeem its invite code and claim a founding credit
 * BEFORE the dashboard reads the balance, so a new invitee sees their free
 * consultation on the first view instead of "0 available" (L1). Both steps
 * are idempotent; the dashboard's after() hook runs both again on every
 * visit, which covers accounts whose first visit comes later.
 */
export async function grantSignupCredits(supabase: SupabaseClient, user: User): Promise<void> {
  if (!isNewAccount(user.created_at)) return;
  await Promise.allSettled([maybeRedeemInvite(supabase, user), maybeClaimFoundingCredit(user.id)]);
}
