import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

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
 * Fire-and-forget — never blocks the response.
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('Failed to write audit log:', err);
  }
}
