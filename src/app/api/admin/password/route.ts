import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';
import { sendEmail } from '@/lib/email';
import { passwordResetEmail } from '@/lib/email/templates';

/**
 * The portal whose /auth/callback should receive the recovery token. Every
 * portal mounts the same handler (src/lib/auth/handleAuthCallback.ts), which
 * accepts ?token_hash= and creates the session server-side.
 */
function portalFor(role: string | null): { origin: string; name: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.furrie.in';
  if (role === 'vet') return { origin: appUrl.replace('//app.', '//vet.'), name: 'vet portal' };
  if (role === 'admin') return { origin: appUrl.replace('//app.', '//admin.'), name: 'admin portal' };
  return { origin: appUrl, name: 'Furrie' };
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
 */
export async function POST(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = await request.json();

    if (body.action === 'reset') {
      return handlePasswordReset(result.user.id, body);
    } else if (body.action === 'change') {
      return handlePasswordChange(result.user.id, body);
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
}

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
  const link = `${portal.origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=/dashboard`;
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

/**
 * Change the admin's own password.
 * Uses service role to update the auth user's password.
 */
async function handlePasswordChange(
  adminId: string,
  body: { newPassword?: string }
) {
  if (!body.newPassword) {
    return NextResponse.json(
      { error: 'newPassword is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  if (body.newPassword.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters', code: 'VALIDATION_ERROR' },
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
