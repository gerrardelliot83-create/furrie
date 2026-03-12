import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getMeetingsByRoom } from '@/lib/daily';
import { checkPlusSubscriptionWithClient, calculateThreadExpiry } from '@/lib/utils/followUpHelpers';

/**
 * GET /api/cron/close-stale-active
 *
 * Vercel Cron job that runs every 10 minutes to recover consultations
 * stuck in 'active' status due to failed Daily.co webhooks.
 *
 * Strategy:
 * 1. Find consultations with status='active' that started >90 min ago
 * 2. For each, query Daily.co meetings API for actual room status/duration
 * 3. Close with actual duration from Daily.co (or capped calculated duration as fallback)
 * 4. Apply Plus subscription check for follow-up expiry
 *
 * Cron schedule: Every 10 minutes (see vercel.json)
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  // 90-minute threshold: max consultation is 30 min, this provides a wide safety margin
  const staleCutoff = new Date(now.getTime() - 90 * 60 * 1000);

  // Find stale active consultations
  const { data: staleConsultations, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select('id, customer_id, pet_id, vet_id, started_at, scheduled_at, room_name')
    .eq('status', 'active')
    .lt('started_at', staleCutoff.toISOString());

  if (fetchError) {
    console.error('[close-stale-active] Failed to fetch stale consultations:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!staleConsultations || staleConsultations.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  console.log(`[close-stale-active] Found ${staleConsultations.length} stale active consultation(s)`);

  const results: Array<{
    consultationId: string;
    action: string;
    durationMinutes: number | null;
    source: string;
    followUpExpiry: string | null;
  }> = [];

  for (const consultation of staleConsultations) {
    let durationMinutes: number | null = null;
    let durationSource = 'unknown';

    // Try to get actual duration from Daily.co
    const roomName = consultation.room_name || `furrie-${consultation.id}`;
    try {
      const meetingData = await getMeetingsByRoom(roomName);
      if (meetingData && meetingData.ended) {
        // Daily.co returns duration in seconds
        durationMinutes = Math.ceil(meetingData.duration / 60);
        durationSource = 'daily_api';
        console.log(`[close-stale-active] ${consultation.id}: Daily.co reports ${durationMinutes} min`);
      } else if (meetingData && meetingData.ongoing) {
        // Meeting is actually still ongoing — skip this consultation
        console.log(`[close-stale-active] ${consultation.id}: Meeting still ongoing, skipping`);
        continue;
      }
    } catch (dailyError) {
      console.error(`[close-stale-active] Daily.co API failed for ${consultation.id}:`, dailyError);
    }

    // Fallback: calculate from timestamps, cap at 60 min
    if (durationMinutes === null && consultation.started_at) {
      const calculatedMinutes = Math.ceil(
        (now.getTime() - new Date(consultation.started_at).getTime()) / 60000
      );
      durationMinutes = Math.min(calculatedMinutes, 60);
      durationSource = 'calculated_capped';
      console.log(`[close-stale-active] ${consultation.id}: Using capped duration ${durationMinutes} min`);
    }

    // Cap Daily.co duration at 60 min too (safety measure)
    if (durationMinutes !== null && durationMinutes > 60) {
      durationMinutes = 60;
      durationSource += '_capped';
    }

    // Close the consultation
    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'closed',
        outcome: 'success',
        ended_at: now.toISOString(),
        duration_minutes: durationMinutes,
        updated_at: now.toISOString(),
      })
      .eq('id', consultation.id)
      .eq('status', 'active'); // Only if still active (prevent race conditions)

    if (updateError) {
      console.error(`[close-stale-active] Failed to close ${consultation.id}:`, updateError);
      continue;
    }

    // Check Plus subscription for follow-up expiry
    let followUpExpiry: string | null = null;
    if (consultation.customer_id && consultation.pet_id) {
      try {
        const isPlusUser = await checkPlusSubscriptionWithClient(
          supabaseAdmin,
          consultation.customer_id,
          consultation.pet_id
        );
        followUpExpiry = calculateThreadExpiry(isPlusUser);
      } catch (subErr) {
        console.error(`[close-stale-active] Plus check failed for ${consultation.id}:`, subErr);
        // Default to 7-day expiry on error
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 7);
        followUpExpiry = defaultExpiry.toISOString();
      }
    } else {
      // No customer/pet info — default to 7 days
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7);
      followUpExpiry = defaultExpiry.toISOString();
    }

    await supabaseAdmin
      .from('consultations')
      .update({ follow_up_expires_at: followUpExpiry })
      .eq('id', consultation.id);

    results.push({
      consultationId: consultation.id,
      action: 'closed',
      durationMinutes,
      source: durationSource,
      followUpExpiry,
    });

    console.log(`[close-stale-active] ${consultation.id} closed: ${durationMinutes} min (${durationSource}), follow-up: ${followUpExpiry ?? 'indefinite'}`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
