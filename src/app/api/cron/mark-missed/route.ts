import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SCHEDULING_CONSTANTS } from '@/lib/scheduling';
import { NEVER_OPENED_OUTCOME } from '@/lib/scheduling/outcomes';
import { withRoute } from '@/server/handler';
import { sendFailedNotices } from '../_lib/consultationNotices';
import { revalidateConsultationPages } from '@/app/api/vet/_lib/completeConsultation';

/**
 * GET /api/cron/mark-missed   (every 5 minutes, vercel.json)
 *
 * A consultation still 'scheduled' when its join window has closed (45 min
 * after the start) was never opened: neither the vet nor the customer pressed
 * Join (since VC-1 it becomes 'active' only then). That is not the customer's
 * fault, so it is closed as 'failed' (nobody_connected), the customer is told
 * our team will be in touch, and ops is emailed (VC-1b; before, it was
 * 'missed' and the customer was told "You didn't join"). Rule set:
 * src/lib/scheduling/outcomes.ts. The job keeps its name for vercel.json.
 *
 * 'active' consultations are no longer touched here — close-stale-active is
 * the only job that closes them (A-07: the two crons used to disagree, one
 * recording success and the other failed).
 */
export const GET = withRoute(async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const windowExpiredBefore = new Date(now.getTime() - SCHEDULING_CONSTANTS.JOIN_WINDOW_AFTER_MS);

  const { data: expiredConsultations, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      consultation_number,
      pets!consultations_pet_id_fkey (name)
    `)
    .eq('status', 'scheduled')
    .lt('scheduled_at', windowExpiredBefore.toISOString());

  if (fetchError) {
    console.error('Failed to fetch expired consultations:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const results: Array<{ consultationId: string; action: 'closed_failed'; reason: string }> = [];

  for (const consultation of expiredConsultations || []) {
    if (!consultation.scheduled_at) continue;

    const { data: closed, error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({ status: 'closed', outcome: NEVER_OPENED_OUTCOME.outcome })
      .eq('id', consultation.id)
      .eq('status', 'scheduled') // Only if nobody joined (or the vet finished it) in the meantime
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error(`Failed to close never-opened consultation ${consultation.id}:`, updateError);
      continue;
    }
    if (!closed) continue;

    // Supabase returns joined data as objects (not arrays) for !fkey syntax
    const petData = consultation.pets as unknown as { name: string } | null;

    await sendFailedNotices(
      {
        id: consultation.id,
        customer_id: consultation.customer_id,
        vet_id: consultation.vet_id,
        scheduled_at: consultation.scheduled_at,
        consultation_number: consultation.consultation_number,
        petName: petData?.name || 'your pet',
      },
      NEVER_OPENED_OUTCOME.reason,
      { detail: 'Nobody pressed Join before the join window closed (45 minutes after the start).' }
    );

    revalidateConsultationPages(consultation.id);
    results.push({ consultationId: consultation.id, action: 'closed_failed', reason: NEVER_OPENED_OUTCOME.reason });
    console.log(`Consultation ${consultation.id} closed as failed (${NEVER_OPENED_OUTCOME.reason}): nobody pressed Join`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
});
