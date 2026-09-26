import { NextResponse, after } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRoomAttendance, roomNameForConsultation } from '@/lib/daily';
import { formatIstTime } from '@/lib/time/ist';
import { withRoute } from '@/server/handler';
import {
  deliverLateNotes,
  noteIsComplete,
  revalidateConsultationPages,
  runCompletionSideEffects,
} from '@/app/api/vet/_lib/completeConsultation';

// Same cap the web form used: a slot is 30 minutes, so anything longer means
// the start time is stale (e.g. a browser crash left the call "active").
const MAX_DURATION_MINUTES = 60;

function capMinutes(minutes: number): number {
  return Math.min(Math.max(1, Math.ceil(minutes)), MAX_DURATION_MINUTES);
}

/**
 * POST /api/vet/consultations/[id]/complete
 *
 * The vet finishes a consultation (C-02). Replaces the two browser-side
 * writes in SOAPForm and ConsultationDetailTabs.
 *
 * Rules:
 *   - signed in (cookie or bearer), role vet, active account, assigned vet;
 *   - allowed from 'active', or from 'scheduled' once the start time has
 *     passed (e.g. the call happened by phone);
 *   - the saved note must have a chief complaint and a provisional diagnosis;
 *   - the status change is guarded and read back, so only one request can
 *     close it; a repeat returns { alreadyCompleted: true } and sends nothing.
 *   - on a consultation already closed as a success (e.g. by the stale-call
 *     cron before the vet wrote notes), the same call is "Send notes to the
 *     pet parent": if the notes now exist and haven't been sent (no
 *     follow-up thread yet), it sends them once ({ notesSent: true }).
 *
 * Writes use the service role after these checks. Follow-up chat, emails and
 * the invite reward run once, after the response (runCompletionSideEffects).
 */
export const POST = withRoute(async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error: authError } = await getRequestUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const [profileResult, consultationResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle(),
    supabaseAdmin
      .from('consultations')
      .select('id, vet_id, status, outcome, scheduled_at, started_at, duration_minutes, daily_room_name')
      .eq('id', id)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  if (!profile || profile.role !== 'vet' || profile.is_active === false) {
    return NextResponse.json(
      { error: 'Only the assigned vet can finish this consultation', code: 'VET_REQUIRED' },
      { status: 403 }
    );
  }

  if (consultationResult.error) {
    console.error('[complete] failed to load consultation:', consultationResult.error);
    return NextResponse.json(
      { error: 'Failed to load consultation', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }

  const consultation = consultationResult.data;
  if (!consultation || consultation.vet_id !== user.id) {
    return NextResponse.json({ error: 'Consultation not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  if (consultation.status === 'closed') {
    if (consultation.outcome === 'success') {
      // Late notes (CTO review item 1): send them now if they exist and
      // haven't been sent; otherwise this is a harmless repeat.
      const late = await deliverLateNotes(id);
      if (late === 'notes_missing') {
        return NextResponse.json(
          {
            error: 'Add the chief complaint and a provisional diagnosis, save, then send the notes.',
            code: 'NOTES_REQUIRED',
          },
          { status: 422 }
        );
      }
      if (late === 'sent') revalidateConsultationPages(id);
      return NextResponse.json({ completed: true, alreadyCompleted: true, notesSent: late === 'sent' });
    }
    return NextResponse.json(
      {
        error: `This consultation is already closed (${consultation.outcome ?? 'closed'}).`,
        code: 'ALREADY_CLOSED',
        currentStatus: consultation.status,
        currentOutcome: consultation.outcome,
      },
      { status: 409 }
    );
  }

  const now = new Date();

  if (consultation.status === 'scheduled') {
    const startsAt = consultation.scheduled_at ? new Date(consultation.scheduled_at) : null;
    if (!startsAt || now < startsAt) {
      return NextResponse.json(
        {
          error: startsAt
            ? `This consultation hasn't started yet. You can finish it from ${formatIstTime(startsAt)} (India time).`
            : "This consultation hasn't started yet.",
          code: 'NOT_STARTED',
          startsAt: consultation.scheduled_at,
        },
        { status: 409 }
      );
    }
  } else if (consultation.status !== 'active') {
    return NextResponse.json(
      {
        error: `A ${consultation.status} consultation can't be finished.`,
        code: 'INVALID_STATUS',
        currentStatus: consultation.status,
      },
      { status: 409 }
    );
  }

  const { data: note, error: noteError } = await supabaseAdmin
    .from('soap_notes')
    .select('chief_complaint, provisional_diagnosis')
    .eq('consultation_id', id)
    .maybeSingle();

  if (noteError) {
    console.error('[complete] failed to load notes:', noteError);
    return NextResponse.json({ error: 'Failed to load notes', code: 'FETCH_ERROR' }, { status: 500 });
  }

  if (!noteIsComplete(note)) {
    return NextResponse.json(
      {
        error: 'Add the chief complaint and a provisional diagnosis, save, then finish.',
        code: 'NOTES_REQUIRED',
      },
      { status: 422 }
    );
  }

  // The real call length (CTO review item 2; the booking stores the allotted
  // 30): Daily's meeting records for this room when available, otherwise
  // first join to now; both capped at 60. With no join at all (e.g. the call
  // happened by phone) the allotted length is kept.
  let durationMinutes = consultation.duration_minutes;
  const attendance = await getRoomAttendance(consultation.daily_room_name || roomNameForConsultation(id));
  if (attendance && attendance.totalSeconds > 0) {
    durationMinutes = capMinutes(attendance.totalSeconds / 60);
  } else if (consultation.started_at) {
    durationMinutes = capMinutes((now.getTime() - new Date(consultation.started_at).getTime()) / 60000);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('consultations')
    .update({
      status: 'closed',
      outcome: 'success',
      ended_at: now.toISOString(),
      duration_minutes: durationMinutes,
      updated_at: now.toISOString(),
    })
    .eq('id', id)
    .eq('vet_id', user.id)
    .eq('status', consultation.status)
    .select('id, status, outcome, ended_at')
    .maybeSingle();

  if (updateError) {
    console.error('[complete] update failed:', updateError);
    return NextResponse.json(
      { error: 'Failed to complete consultation', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }

  if (!updated) {
    // Someone else changed it between our read and our write (a second click,
    // the cron, a cancellation). Report what it is now.
    const { data: current } = await supabaseAdmin
      .from('consultations')
      .select('status, outcome')
      .eq('id', id)
      .maybeSingle();
    if (current?.status === 'closed' && current.outcome === 'success') {
      return NextResponse.json({ completed: true, alreadyCompleted: true });
    }
    return NextResponse.json(
      {
        error: 'This consultation changed while you were finishing it. Please reload the page.',
        code: 'STATUS_CHANGED',
        currentStatus: current?.status ?? null,
        currentOutcome: current?.outcome ?? null,
      },
      { status: 409 }
    );
  }

  after(() => runCompletionSideEffects(id, 'vet'));
  revalidateConsultationPages(id);

  return NextResponse.json({ completed: true, alreadyCompleted: false, consultation: updated });
});
