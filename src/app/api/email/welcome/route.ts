import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { sendWelcomeEmailOnce } from '@/lib/auth/postSignInTasks';
import { shouldSendWelcomeEmail } from '@/lib/auth/welcomeEmailRule';
import { withRoute } from '@/server/handler';

/**
 * POST /api/email/welcome
 * Send welcome email to newly signed up customer
 */
export const POST = withRoute(async function POST() {
  try {
    // getRequestUser() also loads the caller's profile (and refuses a
    // deactivated account).
    const { user, error: authError, profile } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const email = profile?.email || user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'No email address found', code: 'NO_EMAIL' },
        { status: 400 }
      );
    }

    // Only for new users (created within the last 30 minutes), and only once
    // per account: the dashboard sends it too (CX-1).
    if (
      !shouldSendWelcomeEmail({
        email,
        createdAt: profile?.created_at ?? user.created_at,
        appMetadata: user.app_metadata,
      })
    ) {
      return NextResponse.json({ success: true, skipped: 'returning_user' });
    }

    const result = await sendWelcomeEmailOnce(user.id, email, profile?.full_name || 'there');

    if (!result.success) {
      if ('duplicate' in result && result.duplicate) {
        return NextResponse.json({ success: true, skipped: 'already_sent' });
      }
      return NextResponse.json(
        { error: result.error, code: 'EMAIL_SEND_FAILED' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', code: 'EMAIL_ERROR' },
      { status: 500 }
    );
  }
});
