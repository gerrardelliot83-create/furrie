import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { sendWelcomeEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FEATURES } from '@/lib/config/features';

/**
 * Side-effects that belong to signing in but that the user is not waiting for.
 *
 * These used to run as two fire-and-forget `fetch` calls from the OTP form, the
 * moment the code was verified — competing with the navigation the user *was*
 * waiting on, and both liable to be lost if the tab closed or the page tore
 * down first. The welcome email in particular hung off a 200ms `setTimeout`.
 *
 * They now run from `after()` on the first authenticated server render, so they
 * execute after the response has been streamed and cost the user nothing. Both
 * are idempotent and safe to re-run on every render.
 */

/** Only send a welcome email to accounts created in the last half hour. */
const WELCOME_WINDOW_MS = 30 * 60 * 1000;

interface WelcomeEmailInput {
  email: string | null | undefined;
  fullName: string | null | undefined;
  createdAt: string | null | undefined;
}

/**
 * Send the welcome email if this looks like a freshly created account.
 *
 * Same 30-minute guard the /api/email/welcome route uses, so a returning user
 * never gets one. Callers pass profile fields they have already fetched — this
 * adds no round-trip of its own.
 */
export async function maybeSendWelcomeEmail({
  email,
  fullName,
  createdAt,
}: WelcomeEmailInput): Promise<void> {
  if (!email || !createdAt) return;

  if (Date.now() - new Date(createdAt).getTime() > WELCOME_WINDOW_MS) return;

  try {
    await sendWelcomeEmail(email, { customerName: fullName || 'there' });
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
 * are idempotent; the dashboard's after() hook still covers older accounts.
 */
export async function grantSignupCredits(supabase: SupabaseClient, user: User): Promise<void> {
  if (!isNewAccount(user.created_at)) return;
  await Promise.allSettled([maybeRedeemInvite(supabase, user), maybeClaimFoundingCredit(user.id)]);
}
