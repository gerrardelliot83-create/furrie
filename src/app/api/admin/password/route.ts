import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';

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
 * Uses Supabase's built-in magic link / password reset flow.
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
    .select('id, email, full_name')
    .eq('id', body.userId)
    .single();

  if (fetchError || !profile || !profile.email) {
    return NextResponse.json(
      { error: 'User not found or has no email', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Use Supabase auth to generate a password reset link
  const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
  });

  if (resetError) {
    console.error('Error generating password reset link:', resetError);
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
