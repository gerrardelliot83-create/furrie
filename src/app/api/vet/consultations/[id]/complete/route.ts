import { NextResponse, after } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRoomAttendance, roomNameForConsultation, secondsTogether } from '@/lib/daily';
import {
  decideFinishOutcome,
  FINISH_CHOICE_OUTCOME,
  isFinishChoice,
  NO_SHOW_AFTER_MINUTES,
  type FinishChoice,
  type NoShowBlock,
} from '@/lib/scheduling/outcomes';
import { formatIstTime } from '@/lib/time/ist';
import { withRoute } from '@/server/handler';
import {
  deliverLateNotes,
  noteIsComplete,
  revalidateConsultationPages,
  runCompletionSideEffects,
} from '@/app/api/vet/_lib/completeConsultation';
import {
  sendFailedNotices,
  sendMissedNotices,
  type ClosedConsultation,
} from '@/app/api/cron/_lib/consultationNotices';

// Same cap the web form used: a slot is 30 minutes, so anything longer means
// the start time is stale (e.g. a browser crash left the call "active").
const MAX_DURATION_MINUTES = 60;

function capMinutes(minutes: number): number {
  return Math.min(Math.max(1, Math.ceil(minutes)), MAX_DURATION_MINUTES);
}

// The booked length: a slot (the book route stores 30) and the extension
// (POST /api/consultations/[id]/extend adds 15).
const BOOKED_MINUTES = 30;
const EXTENSION_MINUTES = 15;

/** Why "The pet parent didn't come" can't be recorded, in plain words (C1). */
function noShowRefusal(block: NoShowBlock | null, availableAt: string | null): string {
  switch (block) {
    case 'customer_pressed_join':
      return "The pet parent pressed Join, so we can't record that they didn't come. If you couldn't connect, choose \"We couldn't connect (technical problem)\".";
    case 'customer_seen':
      return "The video call shows the pet parent joined (just not at the same time as you), so we can't record that they didn't come. Choose \"We couldn't connect\" or \"It happened another way\".";
    case 'daily_unreachable':
      return "We couldn't check the video call just now, so we can't record that the pet parent didn't come. Try again in a minute, or choose another answer.";
    case 'vet_not_seen':
      return "We didn't see you on the video call, so we can't record that the pet parent didn't come. Join the call and wait for them, or choose another answer.";
    case 'too_early':
      return availableAt
        ? `The pet parent may still join. You can record that they didn't come from ${formatIstTime(availableAt)} (India time), ${NO_SHOW_AFTER_MINUTES} minutes after the start.`
        : 'The pet parent may still join. Please wait a few minutes.';
    default:
      return "That answer isn't available for this consultation. Please reload the page.";
  }
}

/** The vet's answer from the "we didn't see the call" dialog, if the body has one (VC-1b). */
async function readChoice(request: Request): Promise<FinishChoice | null | 'invalid'> {
  const text = await request.text().catch(() => '');
  if (!text.trim()) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return 'invalid';
  }
  const outcome = (body as { outcome?: unknown } | null)?.outcome;
  if (outcome === undefined || outcome === null) return null;
  return isFinishChoice(outcome) ? outcome : 'invalid';
}

/**
 * POST /api/vet/consultations/[id]/complete
 * Body (optional): { outcome: 'happened_elsewhere' | 'customer_no_show' | 'technical_problem' }
 *
 * The vet finishes a consultation (C-02). Replaces the two browser-side
 * writes in SOAPForm and ConsultationDetailTabs.
 *
 * Rules:
 *   - signed in (cookie or bearer), role vet, active account, assigned vet;
 *   - allowed from 'active', or from 'scheduled' once the start time has
 *     passed (e.g. the call happened by phone);
 *   - VC-1b: success only when Daily shows the vet and the pet parent in the
 *     call together (src/lib/scheduling/outcomes.ts decideFinishOutcome).
 *     Otherwise (not together, Daily unreachable, or nobody pressed Join)
 *     nothing is recorded and the answer is 409 OUTCOME_NEEDED with what we
 *     know, the answers allowed and whether the notes are complete; the vet's
 *     page asks her what happened and sends it again with `outcome`:
 *     happened_elsewhere → success, customer_no_show → missed,
 *     technical_problem → failed (+ ops email). On 3 and 7 Oct Finish
 *     recorded a success although the two were never in the call together;
 *   - C1: customer_no_show only when the evidence backs it (Daily saw the
 *     vet and never the pet parent, the pet parent never pressed Join, and
 *     the start was 15+ minutes ago); otherwise 409 OUTCOME_NOT_ALLOWED;
 *   - a success needs the saved note's chief complaint and provisional
 *     diagnosis; missed and failed don't (there was no consultation);
 *   - the status change is guarded and read back, so only one request (or
 *     cron) can close it; a repeat returns { alreadyCompleted: true } and
 *     sends nothing.
 *   - on a consultation already closed as a success (e.g. by the stale-call
 *     cron before the vet wrote notes), the same call is "Send notes to the
 *     pet parent": if the notes now exist and haven't been sent (no
 *     follow-up thread yet), it sends them once ({ notesSent: true }).
 *
 * Writes use the service role after these checks. Follow-up chat, emails and
 * the invite reward (success), or the missed / failed notices, run once,
 * after the response.
 */
export const POST = withRoute(async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error: authError } = await getRequestUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const choice = await readChoice(request);
  if (choice === 'invalid') {
    return NextResponse.json(
      { error: 'Unknown answer. Please reload the page and try again.', code: 'INVALID_OUTCOME' },
      { status: 400 }
    );
  }

  const [profileResult, consultationResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle(),
    supabaseAdmin
      .from('consultations')
      .select(
        'id, vet_id, customer_id, pet_id, consultation_number, status, outcome, scheduled_at, started_at, duration_minutes, was_extended, daily_room_name, customer_join_requested_at'
      )
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
    const wanted = choice ? FINISH_CHOICE_OUTCOME[choice] : 'success';
    if (consultation.outcome === 'success' && wanted === 'success') {
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
      return NextResponse.json({ completed: true, alreadyCompleted: true, notesSent: late === 'sent', outcome: 'success' });
    }
    if (choice && consultation.outcome === wanted) {
      // The same answer twice (a double click): already recorded, nothing more to send.
      return NextResponse.json({ completed: true, alreadyCompleted: true, notesSent: false, outcome: wanted });
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

  // Who Daily saw in the room, and the saved note, side by side. The Daily
  // request has a 5 s timeout and returns null rather than throwing.
  const [attendance, noteResult] = await Promise.all([
    getRoomAttendance(consultation.daily_room_name || roomNameForConsultation(id), {
      scheduledAt: consultation.scheduled_at ?? consultation.started_at,
    }),
    supabaseAdmin
      .from('soap_notes')
      .select('chief_complaint, provisional_diagnosis')
      .eq('consultation_id', id)
      .maybeSingle(),
  ]);
  if (noteResult.error) console.error('[complete] failed to load notes:', noteResult.error);
  const notesComplete = !noteResult.error && noteIsComplete(noteResult.data);

  const together = attendance ? secondsTogether(attendance.records, user.id, consultation.customer_id) : 0;
  const startsAt = consultation.scheduled_at ?? consultation.started_at;
  const decision = decideFinishOutcome({
    callOpened: consultation.status === 'active',
    call: attendance
      ? {
          customerSeen: attendance.participantUserIds.includes(consultation.customer_id),
          vetSeen: attendance.participantUserIds.includes(user.id),
          secondsTogether: together,
        }
      : null,
    customerPressedJoin: !!consultation.customer_join_requested_at,
    startsAtMs: startsAt ? new Date(startsAt).getTime() : null,
    nowMs: now.getTime(),
    choice,
  });

  if (decision.action === 'ask' || decision.action === 'refuse') {
    // Nothing is recorded (VC-1b). 'ask': the vet's page asks what happened,
    // offering only the answers the evidence allows. 'refuse': she sent
    // "didn't come" when the evidence doesn't back it (C1).
    const evidence = {
      customerSeen: decision.customerSeen,
      vetSeen: decision.vetSeen,
      dailyReachable: decision.dailyReachable,
      callOpened: decision.callOpened,
      customerPressedJoin: decision.customerPressedJoin,
      allowedOutcomes: decision.allowedOutcomes,
      noShowAvailableAt: decision.noShowAvailableAt,
      notesComplete,
    };
    console.log(
      `[complete] consultation=${id} ${decision.action === 'ask' ? 'outcome_needed' : `outcome_not_allowed choice=${decision.choice}`} status=${consultation.status} daily=${decision.dailyReachable ? 'ok' : 'unreachable'} customer_seen=${decision.customerSeen} vet_seen=${decision.vetSeen} customer_pressed_join=${decision.customerPressedJoin} together=${together}s no_show_blocked_by=${decision.noShowBlockedBy ?? 'none'}`
    );
    if (decision.action === 'refuse') {
      return NextResponse.json(
        {
          error: noShowRefusal(decision.noShowBlockedBy, decision.noShowAvailableAt),
          code: 'OUTCOME_NOT_ALLOWED',
          ...evidence,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: decision.customerSeen
          ? "You and the pet parent weren't on the video call at the same time. Please tell us what happened."
          : "We didn't see the pet parent on the video call. Please tell us what happened.",
        code: 'OUTCOME_NEEDED',
        ...evidence,
      },
      { status: 409 }
    );
  }

  if (decision.outcome === 'success') {
    if (noteResult.error) {
      return NextResponse.json({ error: 'Failed to load notes', code: 'FETCH_ERROR' }, { status: 500 });
    }
    if (!notesComplete) {
      return NextResponse.json(
        {
          error: 'Add the chief complaint and a provisional diagnosis, save, then finish.',
          code: 'NOTES_REQUIRED',
        },
        { status: 422 }
      );
    }
  }

  // The call length (CTO review item 2; the booking stores the allotted 30):
  //   - seen together: Daily's meeting records for this room, otherwise first
  //     join to now; both capped at 60;
  //   - happened another way (C7): the booked length, not the room time. The
  //     Daily webhook may already have overwritten duration_minutes with the
  //     room time, so it is the slot (plus the extension, if any);
  //   - missed or failed: only the time Daily saw, as the stale-call cron does.
  let durationMinutes = consultation.duration_minutes;
  if (decision.reason === 'happened_elsewhere') {
    durationMinutes = BOOKED_MINUTES + (consultation.was_extended ? EXTENSION_MINUTES : 0);
  } else if (attendance && attendance.totalSeconds > 0) {
    durationMinutes = capMinutes(attendance.totalSeconds / 60);
  } else if (decision.outcome !== 'success') {
    durationMinutes = 0;
  } else if (consultation.started_at) {
    durationMinutes = capMinutes((now.getTime() - new Date(consultation.started_at).getTime()) / 60000);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('consultations')
    .update({
      status: 'closed',
      outcome: decision.outcome,
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
    if (current?.status === 'closed' && current.outcome === decision.outcome) {
      return NextResponse.json({ completed: true, alreadyCompleted: true, notesSent: false, outcome: decision.outcome });
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

  console.log(
    `[complete] consultation=${id} closed outcome=${decision.outcome} reason=${decision.reason} together=${together}s`
  );

  if (decision.outcome === 'success') {
    after(() => runCompletionSideEffects(id, 'vet'));
  } else {
    // The same notices the stale-call cron sends: missed (the pet parent
    // didn't come) or failed (+ ops email, so an admin can make it right).
    const outcome = decision.outcome;
    const closedAt = now.toISOString();
    after(async () => {
      const { data: pet } = await supabaseAdmin.from('pets').select('name').eq('id', consultation.pet_id).maybeSingle();
      const closed: ClosedConsultation = {
        id,
        customer_id: consultation.customer_id,
        vet_id: consultation.vet_id,
        scheduled_at: consultation.scheduled_at ?? consultation.started_at ?? closedAt,
        consultation_number: consultation.consultation_number,
        petName: pet?.name || 'your pet',
      };
      // The vet chose this herself: no notice to her (C4); the pet parent's
      // notice and the ops email still go.
      if (outcome === 'missed') await sendMissedNotices(closed, { notifyVet: false });
      else await sendFailedNotices(closed, 'technical_problem', { notifyVet: false });
    });
  }
  revalidateConsultationPages(id);

  return NextResponse.json({
    completed: true,
    alreadyCompleted: false,
    notesSent: false,
    outcome: decision.outcome,
    consultation: updated,
  });
});
