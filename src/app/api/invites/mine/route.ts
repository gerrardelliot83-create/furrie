/**
 * GET /api/invites/mine
 *
 * Returns the authenticated customer's invite code(s) and their status.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    const { data: invites, error } = await supabase
      .from('invite_codes')
      .select('id, code, status, redeemed_at, referrer_rewarded_at, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch invites error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invites', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invites: invites ?? [] });
  } catch (err) {
    console.error('GET /api/invites/mine error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
