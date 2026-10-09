/**
 * One rule set for how a consultation ends (A-07, VC-1b). Pure: no I/O.
 *
 *   success   — the consultation happened: Daily shows the vet and the
 *               customer in the call together, or the vet says it happened
 *               another way (phone, WhatsApp) when pressing Finish.
 *   missed    — the customer did not come: Daily shows only the vet, or the
 *               vet says so when pressing Finish.
 *   failed    — the vet did not come, or it could not go ahead, or we cannot
 *               tell: Daily shows only the customer, or nobody; nobody pressed
 *               Join by the end of the join window (T+45); the vet reports a
 *               technical problem; or Daily was unreachable for 3 hours after
 *               the start. Ops is emailed so an admin can make it right.
 *   cancelled — before the start, by the customer or an admin (not here).
 *
 * The vet's Finish (POST /api/vet/consultations/[id]/complete) uses
 * decideFinishOutcome; the stale-call cron uses decideStaleActiveOutcome for
 * an 'active' consultation the vet never finished; mark-missed closes a
 * consultation nobody opened with NEVER_OPENED_OUTCOME.
 */

export type NoShowReason = 'customer_no_show' | 'vet_no_show' | 'nobody_connected' | 'daily_unreachable';

/** Why a consultation was closed as 'failed' (the ops email says which). */
export type FailedReason = Exclude<NoShowReason, 'customer_no_show'> | 'technical_problem';

export type StaleActiveDecision =
  | { action: 'wait'; reason: 'call_ongoing' | 'daily_unreachable' }
  | { action: 'close'; outcome: 'success'; reason: 'both_joined' }
  | { action: 'close'; outcome: 'missed'; reason: 'customer_no_show' }
  | { action: 'close'; outcome: 'failed'; reason: Exclude<NoShowReason, 'customer_no_show'> };

/** How long the cron keeps retrying Daily before recording 'failed'. */
export const DAILY_UNREACHABLE_GIVE_UP_MS = 3 * 60 * 60 * 1000;

/**
 * Still 'scheduled' when the join window closed: neither the vet nor the pet
 * parent pressed Join (since VC-1 a consultation becomes 'active' only then).
 * That is not the pet parent's fault, so it is 'failed', not 'missed'
 * (VC-1b): they are told our team will be in touch, and ops is emailed.
 */
export const NEVER_OPENED_OUTCOME = { outcome: 'failed', reason: 'nobody_connected' } as const satisfies {
  outcome: 'failed';
  reason: FailedReason;
};

export function decideStaleActiveOutcome(input: {
  /** Who Daily saw in the room; null when Daily could not be asked. */
  attendance: { ongoing: boolean; participantUserIds: readonly string[] } | null;
  vetId: string | null;
  customerId: string;
  /** Time since the consultation became active (first join). */
  msSinceStart: number;
}): StaleActiveDecision {
  const { attendance, vetId, customerId, msSinceStart } = input;

  if (attendance === null) {
    return msSinceStart < DAILY_UNREACHABLE_GIVE_UP_MS
      ? { action: 'wait', reason: 'daily_unreachable' }
      : { action: 'close', outcome: 'failed', reason: 'daily_unreachable' };
  }

  if (attendance.ongoing) {
    return { action: 'wait', reason: 'call_ongoing' };
  }

  const vetJoined = !!vetId && attendance.participantUserIds.includes(vetId);
  const customerJoined = attendance.participantUserIds.includes(customerId);

  if (vetJoined && customerJoined) return { action: 'close', outcome: 'success', reason: 'both_joined' };
  if (vetJoined) return { action: 'close', outcome: 'missed', reason: 'customer_no_show' };
  if (customerJoined) return { action: 'close', outcome: 'failed', reason: 'vet_no_show' };
  return { action: 'close', outcome: 'failed', reason: 'nobody_connected' };
}

// ── The vet's Finish (VC-1b) ──────────────────────────────────────────

/**
 * What the vet says happened when we did not see the call. On 3 and 7 Oct the
 * vet pressed Finish and the consultation was recorded as a success although
 * the two were never in the video call together (3 Oct happened on WhatsApp).
 */
export const FINISH_CHOICES = ['happened_elsewhere', 'customer_no_show', 'technical_problem'] as const;
export type FinishChoice = (typeof FINISH_CHOICES)[number];

/** The outcome each choice records. */
export const FINISH_CHOICE_OUTCOME: Record<FinishChoice, 'success' | 'missed' | 'failed'> = {
  happened_elsewhere: 'success',
  customer_no_show: 'missed',
  technical_problem: 'failed',
};

export function isFinishChoice(value: unknown): value is FinishChoice {
  return typeof value === 'string' && (FINISH_CHOICES as readonly string[]).includes(value);
}

/**
 * Time in the call together that counts as the consultation happening on
 * video. A few seconds of overlap (a session Daily hadn't cleared yet, a join
 * that dropped at once) is not a consultation; the vet is asked instead.
 */
export const MIN_SECONDS_TOGETHER = 60;

export type FinishDecision =
  | { action: 'close'; outcome: 'success'; reason: 'seen_together' | 'happened_elsewhere' }
  | { action: 'close'; outcome: 'missed'; reason: 'customer_no_show' }
  | { action: 'close'; outcome: 'failed'; reason: 'technical_problem' }
  | { action: 'ask'; customerSeen: boolean; vetSeen: boolean; dailyReachable: boolean; callOpened: boolean };

/**
 * What the vet's Finish records. Daily showing the two in the call together
 * is a success, exactly as before. Otherwise (not together, Daily unreachable,
 * or nobody pressed Join) nothing is recorded until the vet says what
 * happened; her choice is used only then.
 */
export function decideFinishOutcome(input: {
  /** The consultation is 'active' (someone pressed Join), not still 'scheduled'. */
  callOpened: boolean;
  /** What Daily saw; null when Daily could not be asked. */
  call: { customerSeen: boolean; vetSeen: boolean; secondsTogether: number } | null;
  choice: FinishChoice | null;
}): FinishDecision {
  const { callOpened, call, choice } = input;

  if (callOpened && call && call.secondsTogether >= MIN_SECONDS_TOGETHER) {
    return { action: 'close', outcome: 'success', reason: 'seen_together' };
  }

  switch (choice) {
    case 'happened_elsewhere':
      return { action: 'close', outcome: 'success', reason: 'happened_elsewhere' };
    case 'customer_no_show':
      return { action: 'close', outcome: 'missed', reason: 'customer_no_show' };
    case 'technical_problem':
      return { action: 'close', outcome: 'failed', reason: 'technical_problem' };
    default:
      return {
        action: 'ask',
        customerSeen: call?.customerSeen ?? false,
        vetSeen: call?.vetSeen ?? false,
        dailyReachable: call !== null,
        callOpened,
      };
  }
}
