/**
 * One rule set for how a consultation ends (A-07). Pure: no I/O.
 *
 *   success   — the consultation happened: the vet pressed Finish, or Daily
 *               shows both the vet and the customer in the room.
 *   missed    — the customer did not come: still 'scheduled' when the join
 *               window closed (T+45), or Daily shows only the vet.
 *   failed    — the vet did not come, or we cannot tell: Daily shows only the
 *               customer, or nobody, or Daily was unreachable for 3 hours after
 *               the start. Ops is emailed so an admin can make it right.
 *   cancelled — before the start, by the customer or an admin (not here).
 *
 * The vet's Finish is handled by POST /api/vet/consultations/[id]/complete;
 * this module decides what the stale-call cron does with an 'active'
 * consultation the vet never finished.
 */

export type NoShowReason = 'customer_no_show' | 'vet_no_show' | 'nobody_connected' | 'daily_unreachable';

export type StaleActiveDecision =
  | { action: 'wait'; reason: 'call_ongoing' | 'daily_unreachable' }
  | { action: 'close'; outcome: 'success'; reason: 'both_joined' }
  | { action: 'close'; outcome: 'missed'; reason: 'customer_no_show' }
  | { action: 'close'; outcome: 'failed'; reason: Exclude<NoShowReason, 'customer_no_show'> };

/** How long the cron keeps retrying Daily before recording 'failed'. */
export const DAILY_UNREACHABLE_GIVE_UP_MS = 3 * 60 * 60 * 1000;

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
