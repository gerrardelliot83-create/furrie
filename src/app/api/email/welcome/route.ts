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
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'No email address found', code: 'NO_EMAIL' },
        { status: 400 }
      );
    }

    await sendWelcomeEmail(email, {
      customerName: profile?.full_name || 'there',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', code: 'EMAIL_ERROR' },
      { status: 500 }
    );
  }
}
