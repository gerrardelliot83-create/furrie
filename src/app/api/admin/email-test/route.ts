import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/admin/email-test
 *
 * Admin-only diagnostic endpoint to verify email configuration.
 * Checks RESEND_API_KEY and attempts to send a test email.
 */
export async function POST() {
  try {
    // Verify admin role
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
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const adminEmail = profile.email || user.email;
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'No email address found for admin', code: 'NO_EMAIL' },
        { status: 400 }
      );
    }

    // Check if RESEND_API_KEY is set
    const apiKey = process.env.RESEND_API_KEY;
    const keyStatus = apiKey
      ? { set: true, prefix: apiKey.substring(0, 10) + '...' }
      : { set: false, prefix: null };

    if (!apiKey) {
      return NextResponse.json({
        keyStatus,
        sendResult: 'SKIPPED',
        fix: 'Add RESEND_API_KEY to Vercel Environment Variables (Project Settings > Environment Variables). Value starts with "re_". After adding, trigger a new deployment.',
      });
    }

    // Attempt to send a test email
    const result = await sendEmail({
      to: adminEmail,
      subject: 'Furrie Email Test - Configuration Verified',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #770002; padding: 24px; text-align: center;">
            <img src="https://app.furrie.in/assets/furrie-logo.png" alt="Furrie" style="height: 40px;" />
          </div>
          <div style="padding: 32px 24px;">
            <h2 style="color: #333; margin: 0 0 16px;">Email Configuration Test</h2>
            <p style="color: #333;">This is a test email from the Furrie admin diagnostic endpoint.</p>
            <p style="color: #333;">If you received this, your <strong>RESEND_API_KEY</strong> is correctly configured.</p>
            <p style="color: #999; font-size: 14px; margin-top: 24px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      // Provide actionable fix based on the error
      let fix = 'Check Vercel function logs for [EMAIL ERROR] details.';
      const errorStr = result.error || '';

      if (errorStr.includes('401') || errorStr.includes('Unauthorized') || errorStr.includes('API key')) {
        fix = 'RESEND_API_KEY is invalid or expired. Generate a new key at resend.com/api-keys and update the Vercel environment variable.';
      } else if (errorStr.includes('403') || errorStr.includes('domain')) {
        fix = 'Domain not verified in Resend. Go to resend.com/domains and verify furrie.in. Until then, you can only send to the Resend account owner email.';
      } else if (errorStr.includes('429') || errorStr.includes('rate')) {
        fix = 'Rate limited by Resend. Wait a few minutes and try again.';
      }

      return NextResponse.json({
        keyStatus,
        sendResult: 'FAILED',
        error: result.error,
        fix,
      });
    }

    return NextResponse.json({
      keyStatus,
      sendResult: 'SUCCESS',
      messageId: result.messageId,
      sentTo: adminEmail,
    });
  } catch (error) {
    console.error('Email test endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
