import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/rate-limit';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';
import { sendEmail } from '@/lib/email';
import { passwordResetEmail } from '@/lib/email/templates';
import { withRoute } from '@/server/handler';
import { sendVetSetPasswordLink } from '@/app/api/vet/_lib/passwordLink';

/**
 * The portal whose /auth/callback should receive the recovery token. Every
 * portal mounts the same handler (src/lib/auth/handleAuthCallback.ts), which
 * accepts ?token_hash= and creates the session server-side.
 */
function portalFor(role: string | null): { origin: string; name: string; next: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.furrie.in';
  // An admin's link opens the admin set-password page: a recovery session
  // sets a new password there without knowing the old one (A-12). Settings'
  // "change password" needs the current password.
  if (role === 'admin') return { origin: appUrl.replace('//app.', '//admin.'), name: 'admin portal', next: '/set-password' };
  return { origin: appUrl, name: 'Furrie', next: '/dashboard' };
}

/**
 * POST /api/admin/password
 *
 * Two actions controlled by `action` field:
 *
 * 1. action: 'reset' — Send password reset email to a user (admin-triggered)
 *    Body: { action: 'reset', userId: string }
 *
 * 2. action: 'change' — Change the admin's own password
 *    Body: { action: 'change', currentPassword: string, newPassword: string }
 *    The current password is checked and the new one needs 8+ characters
 *    (A-12). Forgot it? Another admin sends a set-password link (action
 *    'reset'), which lands on the admin portal's /set-password page.
 */
export const POST = withRoute(async function POST(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = await request.json();

    if (body.action === 'reset') {
      return handlePasswordReset(result.user.id, body);
    } else if (body.action === 'change') {
      return handlePasswordChange(result.user.id, result.user.email ?? null, body);
    } else {
      return NextResponse.json(
        { error: 'action must be "reset" or "change"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/password:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

/**
 * Send a password reset email to a user.
 *
 * BRK-6: this used to call generateLink() and then report success without
 * sending anything. Supabase's own resetPasswordForEmail() is not used here
 * because a server-initiated link would come back implicit-flow (tokens in
 * the URL fragment) which the server-side callback cannot read. Instead we
 * take the hashed_token, point it at the user's portal callback (verifyOtp
 * path) and deliver it ourselves through Resend.
 */
async function handlePasswordReset(
  adminId: string,
  body: { userId?: string }
) {
  if (!body.userId) {
    return NextResponse.json(
      { error: 'userId is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // Look up the user's email
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', body.userId)
    .single();

  if (fetchError || !profile || !profile.email) {
    return NextResponse.json(
      { error: 'User not found or has no email', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Vets: a set-password link that lands on /set-password (C-04).
  if (profile.role === 'vet') {
    const result = await sendVetSetPasswordLink({
      email: profile.email,
      vetName: profile.full_name || '',
      reason: 'reset',
    });
    if (!result.success) {
      console.error('Error sending vet set-password link:', result.error);
      return NextResponse.json(
        { error: 'Failed to send the set-password email', code: 'RESET_ERROR' },
        { status: 500 }
      );
    }
    await logAdminAction({
      adminId,
      action: 'reset_password',
      targetType: 'user',
      targetId: body.userId,
      details: { email: profile.email },
    });
    return NextResponse.json({ message: `Set-password link sent to ${profile.email}` });
  }

  const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (resetError || !hashedToken) {
    console.error('Error generating password reset link:', resetError?.message ?? 'no hashed_token');
    return NextResponse.json(
      { error: 'Failed to send password reset email', code: 'RESET_ERROR' },
      { status: 500 }
    );
  }

  const portal = portalFor(profile.role);
  const link = `${portal.origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${portal.next}`;
  const email = passwordResetEmail({
    name: profile.full_name || 'there',
    link,
    portalName: portal.name,
  });
  const sent = await sendEmail({ to: profile.email, subject: email.subject, html: email.html });

  if (!sent.success) {
    return NextResponse.json(
      { error: 'Failed to send password reset email', code: 'RESET_ERROR' },
      { status: 500 }
    );
  }

  await logAdminAction({
    adminId,
    action: 'reset_password',
    targetType: 'user',
    targetId: body.userId,
    details: { email: profile.email },
  });

  return NextResponse.json({
    message: `Password reset email sent to ${profile.email}`,
  });
}

const MIN_PASSWORD_LENGTH = 8;

/**
 * Check a password against Supabase Auth without touching the caller's
 * session: a throwaway client signs in, then signs that new session out.
 */
async function passwordIsCorrect(email: string, password: string): Promise<boolean> {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return true;
}

/**
 * Change the admin's own password (A-12): the current password must be
 * right and the new one at least 8 characters. Uses the service role to
 * update the auth user's password.
 */
async function handlePasswordChange(
  adminId: string,
  adminEmail: string | null,
  body: { currentPassword?: string; newPassword?: string }
) {
  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: 'Current and new password are required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (body.newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  // Slow down guessing the current password (per server instance; S-31).
  const attempts = checkRateLimit(`admin-password-change:${adminId}`, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!attempts.success) return rateLimitResponse(attempts.resetAt);

  if (!adminEmail || !(await passwordIsCorrect(adminEmail, body.currentPassword))) {
    return NextResponse.json(
      { error: 'Your current password is not correct', code: 'INVALID_CURRENT_PASSWORD' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
    password: body.newPassword,
  });

  if (updateError) {
    console.error('Error changing admin password:', updateError);
    return NextResponse.json(
      { error: 'Failed to change password', code: 'PASSWORD_CHANGE_ERROR' },
      { status: 500 }
    );
  }

  await logAdminAction({
    adminId,
    action: 'change_own_password',
    targetType: 'admin',
    targetId: adminId,
  });

  return NextResponse.json({
    message: 'Password changed successfully',
  });
}
