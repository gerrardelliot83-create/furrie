import { NextResponse, after } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rate-limit';
import { withRoute } from '@/server/handler';
import { sendVetSetPasswordLink } from '@/app/api/vet/_lib/passwordLink';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same answer for every email, so this route can't be used to find accounts.
const GENERIC_ANSWER = {
  message: "If this email belongs to a Furrie vet account, we've sent it a link to set a new password.",
};

/**
 * POST /api/vet/password-link   { email }
 *
 * "Forgot your password?" on the vet login (C-04; CTO approval Q2). Signed
 * out by design. Sends a set-password link only to active vet accounts,
 * answers the same for every email, and is rate-limited per IP and per
 * email. The email is sent after the response so the reply time doesn't
 * reveal whether the account exists.
 */
export const POST = withRoute(async function POST(request: Request) {
  const ipCheck = checkRateLimit(`vet-password-link:ip:${getClientIp(request)}`, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipCheck.success) return rateLimitResponse(ipCheck.resetAt);

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const emailCheck = checkRateLimit(`vet-password-link:email:${email}`, {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!emailCheck.success) return rateLimitResponse(emailCheck.resetAt);

  after(async () => {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('email', email)
        .eq('role', 'vet')
        .maybeSingle();
      if (!profile || profile.is_active === false) return;

      const result = await sendVetSetPasswordLink({
        email,
        vetName: profile.full_name || '',
        reason: 'reset',
      });
      if (!result.success) {
        Sentry.captureMessage('[vet-password-link] link not sent', {
          level: 'error',
          extra: { error: result.error },
        });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'vet_password_link' } });
    }
  });

  return NextResponse.json(GENERIC_ANSWER);
});
