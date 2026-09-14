import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

/**
 * Verify the requesting user is an admin.
 * Returns the admin user, or a NextResponse error to return early.
 */
export async function verifyAdmin(): Promise<
  { user: User; error?: never } | { error: NextResponse; user?: never }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Log an admin action to the audit_logs table.
 * Uses supabaseAdmin (service role) to bypass RLS.
 * Never throws, but a failed write is reported to Sentry: BRK-4 found that
 * audit_logs was absent from production and this function had discarded
 * every insert error since March, so no admin action was ever recorded.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
    });
    if (error) {
      // supabase-js returns errors, it does not throw them.
      console.error('Failed to write audit log:', error.code, error.message);
      Sentry.captureException(new Error(`audit_logs insert failed: ${error.message}`), {
        tags: { area: 'admin-audit', action: params.action, pg_code: error.code },
        extra: { targetType: params.targetType, targetId: params.targetId },
      });
    }
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('Failed to write audit log:', err);
    Sentry.captureException(err, { tags: { area: 'admin-audit', action: params.action } });
  }
}
