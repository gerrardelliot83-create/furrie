import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/email/welcome
 * Send welcome email to newly signed up customer
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, created_at')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'No email address found', code: 'NO_EMAIL' },
        { status: 400 }
      );
    }

    // Only send welcome email for new users (created within last 30 minutes)
    if (profile?.created_at) {
      const createdAt = new Date(profile.created_at);
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (createdAt < thirtyMinAgo) {
        return NextResponse.json({ success: true, skipped: 'returning_user' });
      }
    }

    const result = await sendWelcomeEmail(email, {
      customerName: profile?.full_name || 'there',
    });

    if (!result.success) {
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
}
