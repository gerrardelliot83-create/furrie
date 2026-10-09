import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRoomAttendance, roomNameForConsultation, type RoomAttendance } from '@/lib/daily';
import { decideStaleActiveOutcome } from '@/lib/scheduling/outcomes';
import type { Database } from '@/lib/database.types';
import { withRoute } from '@/server/handler';
import { revalidateConsultationPages, runCompletionSideEffects } from '@/app/api/vet/_lib/completeConsultation';
import { sendFailedNotices, sendMissedNotices, type ClosedConsultation } from '../_lib/consultationNotices';

type ConsultationRow = Database['public']['Tables']['consultations']['Row'];

// Column list checked against the generated schema types at compile time.
// BRK-1: this cron selected a non-existent `room_name` column and returned
// 500 on every run for months; a typo here is now a type error.
const STALE_COLUMNS = [
  'id',
  'customer_id',
  'pet_id',
  'vet_id',
  'started_at',
  'scheduled_at',
  'daily_room_name',
  'consultation_number',
] as const satisfies readonly (keyof ConsultationRow)[];

type StaleConsultation = Pick<ConsultationRow, (typeof STALE_COLUMNS)[number]>;

// A slot is 30 minutes; 90 minutes after the first join the call is over
// unless Daily says someone is still in the room.
const STALE_AFTER_MS = 90 * 60 * 1000;
const MAX_DURATION_MINUTES = 60;

function callMinutes(attendance: RoomAttendance | null): number {
  if (!attendance || attendance.totalSeconds <= 0) return 0;
  return Math.min(Math.max(1, Math.ceil(attendance.totalSeconds / 60)), MAX_DURATION_MINUTES);
}

/**
 * GET /api/cron/close-stale-active   (every 10 minutes, vercel.json)
 *
 * Closes 'active' consultations the vet never finished, by the V rule set
 * (src/lib/scheduling/outcomes.ts, A-07). Who was in the call comes from
 * Daily's Meetings API (participants' user ids = our user ids):
 *   - still in the room          → leave it
 *   - vet and customer           → success (+ follow-up, emails, invite reward)
 *   - vet only                   → missed (the customer didn't come)
 *   - customer only / nobody     → failed (+ ops email)
 *   - Daily unreachable          → retry; failed (+ ops email) after 3 hours
 *
 * This is the only job that closes 'active' consultations; mark-missed only
 * handles 'scheduled' ones. The vet's Finish can close it too; both updates
 * are guarded on status, so only one of them does. Writes use the service role.
 */
export const GET = withRoute(async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const cutoffIso = new Date(now.getTime() - STALE_AFTER_MS).toISOString();

  const { data: staleConsultations, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select(STALE_COLUMNS.join(', '))
    .eq('status', 'active')
    .or(`started_at.lt.${cutoffIso},and(started_at.is.null,scheduled_at.lt.${cutoffIso})`)
    .returns<StaleConsultation[]>();

  if (fetchError) {
    console.error('[close-stale-active] Failed to fetch stale consultations:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!staleConsultations || staleConsultations.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const petIds = [...new Set(staleConsultations.map((c) => c.pet_id))];
  const { data: pets } = await supabaseAdmin.from('pets').select('id, name').in('id', petIds);
  const petNames = new Map((pets ?? []).map((p) => [p.id, p.name]));

  const results: Array<{
    consultationId: string;
    action: 'closed' | 'waiting' | 'skipped';
    outcome?: string;
    reason: string;
    durationMinutes?: number;
  }> = [];

  for (const consultation of staleConsultations) {
    const startedAt = consultation.started_at ?? consultation.scheduled_at;
    const msSinceStart = startedAt ? now.getTime() - new Date(startedAt).getTime() : STALE_AFTER_MS;

    const attendance = await getRoomAttendance(
      consultation.daily_room_name || roomNameForConsultation(consultation.id)
    );

    const decision = decideStaleActiveOutcome({
      attendance,
      vetId: consultation.vet_id,
      customerId: consultation.customer_id,
      msSinceStart,
    });

    if (decision.action === 'wait') {
      results.push({ consultationId: consultation.id, action: 'waiting', reason: decision.reason });
      continue;
    }

    const durationMinutes = callMinutes(attendance);

    const { data: closed, error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'closed',
        outcome: decision.outcome,
        ended_at: now.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', consultation.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error(`[close-stale-active] Failed to close ${consultation.id}:`, updateError);
      continue;
    }
    if (!closed) {
      // Finished by the vet (or changed otherwise) since we read it.
      results.push({ consultationId: consultation.id, action: 'skipped', reason: 'no_longer_active' });
      continue;
    }

    const closedConsultation: ClosedConsultation = {
      id: consultation.id,
      customer_id: consultation.customer_id,
      vet_id: consultation.vet_id,
      scheduled_at: consultation.scheduled_at ?? startedAt ?? now.toISOString(),
      consultation_number: consultation.consultation_number,
      petName: petNames.get(consultation.pet_id) || 'your pet',
    };

    if (decision.outcome === 'success') {
      await runCompletionSideEffects(consultation.id, 'system');
    } else if (decision.outcome === 'missed') {
      await sendMissedNotices(closedConsultation);
    } else {
      await sendFailedNotices(
        closedConsultation,
        decision.reason,
        decision.reason === 'nobody_connected' ? 'Join was pressed, but Daily shows nobody in the room.' : undefined
      );
    }
    revalidateConsultationPages(consultation.id);

    results.push({
      consultationId: consultation.id,
      action: 'closed',
      outcome: decision.outcome,
      reason: decision.reason,
      durationMinutes,
    });
    console.log(
      `[close-stale-active] ${consultation.id} closed as ${decision.outcome} (${decision.reason}), ${durationMinutes} min`
    );
  }

  return NextResponse.json({
    processed: results.filter((r) => r.action === 'closed').length,
    results,
  });
});
