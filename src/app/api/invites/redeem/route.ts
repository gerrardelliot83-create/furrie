/**
 * POST /api/invites/redeem
 *
 * Redeem an invite code after the invitee has authenticated (OTP verified).
 * - Marks the invite as redeemed.
 * - Creates a 1-credit consultation_packs row for the invitee (source='invite',
 *   60-day expiry).
 * - Sends emails to both invitee and referrer.
 *
 * Body: { code: string }
 * Auth: Required (the newly signed-up user).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FEATURES } from '@/lib/config/features';

export async function POST(request: Request) {
  try {
    if (!FEATURES.ENABLE_INVITES) {
      return NextResponse.json(
        { error: 'Invites feature is not enabled', code: 'FEATURE_DISABLED' },
        { status: 404 }
      );
    }
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

    const body = await request.json().catch(() => ({}));
    const code = (body.code as string)?.trim()?.toUpperCase();

    if (!code) {
      return NextResponse.json(
        { error: 'code is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Load the invite (use admin client to bypass RLS on invite_codes)
    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (fetchErr || !invite) {
      return NextResponse.json(
        { error: 'Invalid invite code', code: 'INVALID_CODE' },
        { status: 400 }
      );
    }

    if (invite.status !== 'available') {
      return NextResponse.json(
        { error: 'This invite has already been used', code: 'ALREADY_REDEEMED' },
        { status: 409 }
      );
    }

    // Self-referral check
    if (invite.referrer_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot use your own invite code', code: 'SELF_REFERRAL' },
        { status: 400 }
      );
    }

    // Check if this user already redeemed ANY invite code (prevents multi-invite abuse)
    const { data: existingRedemption } = await supabaseAdmin
      .from('invite_codes')
      .select('id')
      .eq('redeemed_by_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingRedemption) {
      return NextResponse.json(
        { error: 'You have already used an invite code', code: 'ALREADY_USED_INVITE' },
        { status: 409 }
      );
    }

    // STEP 1: Mark the invite as redeemed FIRST (optimistic lock on status='available')
    // This prevents a race condition where two concurrent requests both create packs
    const { data: redeemed, error: redeemErr } = await supabaseAdmin
      .from('invite_codes')
      .update({
        status: 'redeemed',
        redeemed_by_id: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
      .eq('status', 'available') // optimistic lock — only succeeds if still 'available'
      .select('id')
      .maybeSingle();

    if (redeemErr || !redeemed) {
      // Another request already redeemed this invite concurrently
      return NextResponse.json(
        { error: 'This invite has already been used', code: 'ALREADY_REDEEMED' },
        { status: 409 }
      );
    }

    // STEP 2: Create a 1-credit pack for the invitee (source='invite', 60-day expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const { data: pack, error: packErr } = await supabaseAdmin
      .from('consultation_packs')
      .insert({
        customer_id: user.id,
        pack_size: 1,
        total_consultations: 1,
        unit_price: 0,
        discount_percent: 100,
        total_price: 0,
        status: 'active',
        source: 'invite',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (packErr || !pack) {
      console.error('Failed to create invite pack:', packErr);
      // Invite was marked redeemed but pack creation failed — revert invite status
      try {
        await supabaseAdmin
          .from('invite_codes')
          .update({ status: 'available', redeemed_by_id: null, redeemed_at: null })
          .eq('id', invite.id);
      } catch (revertErr: unknown) {
        console.error('Failed to revert invite status after pack creation failure:', revertErr);
      }

      return NextResponse.json(
        { error: 'Failed to grant invite credits', code: 'PACK_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      redeemed: true,
      creditsGranted: 1,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('POST /api/invites/redeem error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
