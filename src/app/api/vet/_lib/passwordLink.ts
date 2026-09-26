import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendVetSetPasswordEmail } from '@/lib/email';

/** The vet portal origin, derived the same way as /api/admin/password. */
export function vetPortalOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.furrie.in';
  return appUrl.replace('//app.', '//vet.');
}

/**
 * Email a vet a one-time link that signs them in and opens the vet portal's
 * set-password page (C-04). Same pattern as Phase 0's BRK-6 fix:
 * generateLink(recovery) → hashed_token → the portal's /auth/callback, which
 * verifies it server-side (verifyOtp), then redirects to `next`.
 *
 * A token_hash link works in any browser (unlike the PKCE link the browser
 * client's resetPasswordForEmail sends) and doesn't depend on Supabase's
 * redirect allow-list. The password itself is never emailed.
 */
export async function sendVetSetPasswordLink(params: {
  email: string;
  vetName: string;
  reason: 'welcome' | 'reset';
}): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: params.email,
  });

  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    return { success: false, error: error?.message ?? 'no hashed_token returned' };
  }

  const link = `${vetPortalOrigin()}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=/set-password`;

  const sent = await sendVetSetPasswordEmail(params.email, {
    vetName: params.vetName,
    email: params.email,
    link,
    reason: params.reason,
  });

  return sent.success ? { success: true } : { success: false, error: sent.error ?? 'email not sent' };
}
