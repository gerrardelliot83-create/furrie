/**
 * POST /api/invites/check-referrer-reward
 *
 * Called non-blocking after a consultation is closed. Checks if the
 * customer was an invitee completing their first consultation, and if so,
 * grants the referrer a 1-credit reward pack.
 *
 * Body: { consultationId: string }
 * Returns: { checked: true, rewarded?: boolean }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { grantReferrerRewardIfEligible } from '@/lib/invites/grantReferrerReward';

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const consultationId = body.consultationId;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Look up the consultation to get customer_id
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('customer_id')
      .eq('id', consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json({ checked: true, rewarded: false });
    }

    await grantReferrerRewardIfEligible(consultation.customer_id);

    return NextResponse.json({ checked: true });
  } catch (err) {
    console.error('POST /api/invites/check-referrer-reward error:', err);
    return NextResponse.json({ checked: true, rewarded: false });
  }
}
