/**
 * POST /api/invites/redeem
 *
 * Redeem an invite code for the authenticated user: marks the invite redeemed
 * and grants a 1-credit consultation pack (source='invite', 60-day expiry).
 *
 * The work itself lives in the `redeem_invite_code` RPC (migration 021) so both
 * writes share one transaction. This route is the HTTP surface over it; the
 * request and response shapes are unchanged, because the mobile apps call this
 * endpoint directly (see furrie-mobile/web-pr-c/CURRENT_API_CONTRACTS.md).
 *
 * Body: { code: string }
 * Auth: Required — cookie session (web) or Bearer token (mobile).
 */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { FEATURES } from '@/lib/config/features';

/** RPC failure reasons → the HTTP status + message this endpoint has always returned. */
const FAILURE_RESPONSES: Record<string, { error: string; status: number }> = {
  VALIDATION_ERROR: { error: 'code is required', status: 400 },
  INVALID_CODE: { error: 'Invalid invite code', status: 400 },
  SELF_REFERRAL: { error: 'You cannot use your own invite code', status: 400 },
  ALREADY_REDEEMED: { error: 'This invite has already been used', status: 409 },
  ALREADY_USED_INVITE: { error: 'You have already used an invite code', status: 409 },
  AUTH_REQUIRED: { error: 'Unauthorized', status: 401 },
};

interface RedeemResult {
  ok: boolean;
  reason?: string;
  credits_granted?: number;
  expires_at?: string | null;
  already?: boolean;
}

export async function POST(request: Request) {
  try {
    if (!FEATURES.ENABLE_INVITES) {
      return NextResponse.json(
        { error: 'Invites feature is not enabled', code: 'FEATURE_DISABLED' },
        { status: 404 }
      );
    }

    // A user-scoped client, not the admin client: the RPC credits auth.uid(),
    // so identity must come from the caller's own session.
    const { user, error: authError, supabase } = await getRequestUser();

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

    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_code: code,
    });

    if (error) {
      console.error('redeem_invite_code RPC failed:', error);
      return NextResponse.json(
        { error: 'Failed to grant invite credits', code: 'PACK_ERROR' },
        { status: 500 }
      );
    }

    const result = data as RedeemResult;

    if (!result?.ok) {
      const reason = result?.reason ?? 'INVALID_CODE';
      const mapped = FAILURE_RESPONSES[reason] ?? {
        error: 'Failed to grant invite credits',
        status: 500,
      };
      return NextResponse.json(
        { error: mapped.error, code: reason },
        { status: mapped.status }
      );
    }

    return NextResponse.json({
      redeemed: true,
      creditsGranted: result.credits_granted ?? 1,
      expiresAt: result.expires_at ?? null,
    });
  } catch (err) {
    console.error('POST /api/invites/redeem error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
