/**
 * POST /api/invites/validate
 *
 * Pre-signup validation of an invite code. Non-auth — anyone can call this.
 * Rate-limited by IP to prevent scraping.
 *
 * Body: { code: string }
 * Returns: { valid: boolean, referrerFirstName?: string, reason?: string }
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FEATURES } from '@/lib/config/features';

export async function POST(request: Request) {
  try {
    if (!FEATURES.ENABLE_INVITES) {
      return NextResponse.json(
        { valid: false, reason: 'Invites are not currently available' },
        { status: 200 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const code = (body.code as string)?.trim()?.toUpperCase();

    if (!code || code.length < 4) {
      return NextResponse.json(
        { valid: false, reason: 'Please enter an invite code' },
        { status: 200 } // 200, not 400 — the client treats this as a validation result
      );
    }

    const { data, error } = await supabaseAdmin.rpc('validate_invite_code', {
      p_code: code,
    });

    if (error) {
      console.error('validate_invite_code RPC error:', error);
      return NextResponse.json(
        { valid: false, reason: 'Could not validate invite code. Try again.' },
        { status: 200 }
      );
    }

    // data is JSONB: { valid: bool, referrerFirstName?: string, reason?: string }
    return NextResponse.json(data as Record<string, unknown>);
  } catch (err) {
    console.error('POST /api/invites/validate error:', err);
    return NextResponse.json(
      { valid: false, reason: 'Internal error' },
      { status: 500 }
    );
  }
}
