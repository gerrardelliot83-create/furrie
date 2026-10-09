/**
 * One rule set for how a consultation ends (A-07, VC-1b). Pure: no I/O.
 *
 *   success   — the consultation happened: Daily shows the vet and the
 *               customer in the call together, or the vet says it happened
 *               another way (phone, WhatsApp) when pressing Finish.
 *   missed    — the customer did not come: Daily shows only the vet and the
 *               customer never pressed Join, or the vet says so at Finish when
 *               that evidence backs her (decideFinishOutcome).
 *   failed    — the vet did not come, or it could not go ahead, or we cannot
 *               tell: Daily shows only the customer, or nobody, or both but
 *               never together, or only the vet while the customer pressed
 *               Join and never got in; nobody pressed Join by the end of the
 *               join window (T+45); the vet reports a technical problem; or
 *               Daily was unreachable for 3 hours after the start. Ops is
 *               emailed so an admin can make it right.
 *   cancelled — before the start, by the customer or an admin (not here).
 *
 * The principle (founder, VC-1b): when we can't show the pet parent simply
 * didn't come, it is 'failed' with an ops email, never 'missed'.
 *
 * The vet's Finish (POST /api/vet/consultations/[id]/complete) uses
 * decideFinishOutcome; the stale-call cron uses decideStaleActiveOutcome for
 * an 'active' consultation the vet never finished; mark-missed closes a
 * consultation nobody opened with NEVER_OPENED_OUTCOME.
 */

export type NoShowReason =
  | 'customer_no_show'
  | 'customer_could_not_connect'
  | 'vet_no_show'
  | 'never_together'
  | 'nobody_connected'
  | 'daily_unreachable';

/** Why a consultation was closed as 'failed' (the ops email says which). */
export type FailedReason = Exclude<NoShowReason, 'customer_no_show'> | 'technical_problem';

export type StaleActiveDecision =
  | { action: 'wait'; reason: 'call_ongoing' | 'daily_unreachable' }
  | { action: 'close'; outcome: 'success'; reason: 'seen_together' }
  | { action: 'close'; outcome: 'missed'; reason: 'customer_no_show' }
  | { action: 'close'; outcome: 'failed'; reason: Exclude<NoShowReason, 'customer_no_show'> };

/** How long the cron keeps retrying Daily before recording 'failed'. */
export const DAILY_UNREACHABLE_GIVE_UP_MS = 3 * 60 * 60 * 1000;

/**
 * Time in the call together that counts as the consultation happening on
 * video. A few seconds of overlap (a session Daily hadn't cleared yet, a join
 * that dropped at once) is not a consultation.
 */
export const MIN_SECONDS_TOGETHER = 60;

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
  /**
   * Who Daily saw in the room, and for how long the vet and the customer were
   * in it together (lib/daily/meetings secondsTogether); null when Daily
   * could not be asked.
   */
  attendance: { ongoing: boolean; participantUserIds: readonly string[]; secondsTogether: number } | null;
  vetId: string | null;
  customerId: string;
  /** The pet parent pressed Join (consultations.customer_join_requested_at is set). */
  customerPressedJoin: boolean;
  /** Time since the consultation became active (first join). */
  msSinceStart: number;
}): StaleActiveDecision {
  const { attendance, vetId, customerId, customerPressedJoin, msSinceStart } = input;

  if (attendance === null) {
    return msSinceStart < DAILY_UNREACHABLE_GIVE_UP_MS
      ? { action: 'wait', reason: 'daily_unreachable' }
      : { action: 'close', outcome: 'failed', reason: 'daily_unreachable' };
  }

  if (attendance.ongoing) {
    return { action: 'wait', reason: 'call_ongoing' };
  }

  // VC-1b: "both were in the room at some point" is not a consultation; on
  // 7 Oct the two were each in it, minutes apart.
  if (attendance.secondsTogether >= MIN_SECONDS_TOGETHER) {
    return { action: 'close', outcome: 'success', reason: 'seen_together' };
  }

  const vetJoined = !!vetId && attendance.participantUserIds.includes(vetId);
  const customerJoined = attendance.participantUserIds.includes(customerId);

  if (vetJoined && customerJoined) return { action: 'close', outcome: 'failed', reason: 'never_together' };
  if (vetJoined) {
    // A4: the pet parent pressed Join but never reached the call (camera
    // permission, browser, network): we can't say they didn't come.
    return customerPressedJoin
      ? { action: 'close', outcome: 'failed', reason: 'customer_could_not_connect' }
      : { action: 'close', outcome: 'missed', reason: 'customer_no_show' };
  }
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
 * "The pet parent didn't come" can be recorded from this long after the
 * booked start: before that they may still join (C1).
 */
export const NO_SHOW_AFTER_MINUTES = 15;

/** Why "didn't come" can't be recorded (C1); the first that applies. */
export type NoShowBlock =
  | 'customer_pressed_join' // they tried: A4, consultations.customer_join_requested_at
  | 'daily_unreachable' // we can't check the call
  | 'customer_seen' // Daily shows they were in the call (just never together with the vet)
  | 'vet_not_seen' // the vet wasn't in the call (or nobody pressed Join), so she can't vouch
  | 'too_early'; // before the start + 15 minutes: they may still join

/** What we know when Finish didn't see the call; sent with OUTCOME_NEEDED. */
export interface FinishEvidence {
  customerSeen: boolean;
  vetSeen: boolean;
  dailyReachable: boolean;
  callOpened: boolean;
  customerPressedJoin: boolean;
  /** The answers the vet may give now. */
  allowedOutcomes: FinishChoice[];
  /** Why "didn't come" is not among them, if it isn't. */
  noShowBlockedBy: NoShowBlock | null;
  /** When "didn't come" becomes possible, if only the 15-minute wait stands in the way (ISO). */
  noShowAvailableAt: string | null;
}

export type FinishDecision =
  | { action: 'close'; outcome: 'success'; reason: 'seen_together' | 'happened_elsewhere' }
  | { action: 'close'; outcome: 'missed'; reason: 'customer_no_show' }
  | { action: 'close'; outcome: 'failed'; reason: 'technical_problem' }
  | ({ action: 'ask' } & FinishEvidence)
  | ({ action: 'refuse'; choice: FinishChoice } & FinishEvidence);

/**
 * What the vet's Finish records. Daily showing the two in the call together
 * is a success, exactly as before. Otherwise (not together, Daily unreachable,
 * or nobody pressed Join) nothing is recorded until the vet says what
 * happened; her choice is used only then, and only if the evidence allows it.
 *
 * "It happened another way" and "we couldn't connect" are always allowed.
 * "The pet parent didn't come" (C1) only when the call was opened, Daily was
 * reachable and saw the vet but never the pet parent, the pet parent never
 * pressed Join, and the start was at least 15 minutes ago.
 */
export function decideFinishOutcome(input: {
  /** The consultation is 'active' (someone pressed Join), not still 'scheduled'. */
  callOpened: boolean;
  /** What Daily saw; null when Daily could not be asked. */
  call: { customerSeen: boolean; vetSeen: boolean; secondsTogether: number } | null;
  /** The pet parent pressed Join (consultations.customer_join_requested_at is set). */
  customerPressedJoin: boolean;
  /** The booked start (ms), or null if unknown. */
  startsAtMs: number | null;
  nowMs: number;
  choice: FinishChoice | null;
}): FinishDecision {
  const { callOpened, call, customerPressedJoin, startsAtMs, nowMs, choice } = input;

  if (callOpened && call && call.secondsTogether >= MIN_SECONDS_TOGETHER) {
    return { action: 'close', outcome: 'success', reason: 'seen_together' };
  }

  const noShowFrom = startsAtMs === null ? null : startsAtMs + NO_SHOW_AFTER_MINUTES * 60 * 1000;
  const noShowBlockedBy: NoShowBlock | null = customerPressedJoin
    ? 'customer_pressed_join'
    : call === null
      ? 'daily_unreachable'
      : call.customerSeen
        ? 'customer_seen'
        : !callOpened || !call.vetSeen
          ? 'vet_not_seen'
          : noShowFrom !== null && nowMs < noShowFrom
            ? 'too_early'
            : null;

  const evidence: FinishEvidence = {
    customerSeen: call?.customerSeen ?? false,
    vetSeen: call?.vetSeen ?? false,
    dailyReachable: call !== null,
    callOpened,
    customerPressedJoin,
    allowedOutcomes: FINISH_CHOICES.filter((c) => c !== 'customer_no_show' || noShowBlockedBy === null),
    noShowBlockedBy,
    noShowAvailableAt:
      noShowBlockedBy === 'too_early' && noShowFrom !== null ? new Date(noShowFrom).toISOString() : null,
  };

  if (choice === null) return { action: 'ask', ...evidence };
  if (!evidence.allowedOutcomes.includes(choice)) return { action: 'refuse', choice, ...evidence };

  switch (choice) {
    case 'happened_elsewhere':
      return { action: 'close', outcome: 'success', reason: 'happened_elsewhere' };
    case 'customer_no_show':
      return { action: 'close', outcome: 'missed', reason: 'customer_no_show' };
    case 'technical_problem':
      return { action: 'close', outcome: 'failed', reason: 'technical_problem' };
  }
}
