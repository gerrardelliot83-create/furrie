/**
 * Does cancelling give the consultation credit back? (Terms §7.3)
 *
 * One rule for the cancel route and the customer's cancel screens (CX-1):
 * the credit comes back when a booked consultation is cancelled more than
 * 5 minutes before it starts. The customer is told which case they are in
 * before they confirm (from the phone's clock), and afterwards what the
 * server actually did (creditOutcome).
 *
 * No server-only imports: the customer portal's cancel buttons use this too.
 */

/** Cancelling earlier than this before the start gives the credit back. */
export const CREDIT_BACK_MIN_NOTICE_MS = 5 * 60 * 1000;

/** True when cancelling at `now` is early enough to get the credit back. */
export function cancelReturnsCredit(scheduledAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt).getTime();
  return Number.isFinite(start) && start - now > CREDIT_BACK_MIN_NOTICE_MS;
}

/**
 * Whether this booking took a credit: a confirmed ('scheduled') booking that
 * isn't Furrie Plus. A 'pending' booking never got as far as taking one.
 */
export function bookingUsesCredit(status: string, isPriority: boolean | null | undefined): boolean {
  return status === 'scheduled' && !isPriority;
}

/** The line shown in the confirm dialog, or null when no credit is involved. */
export function cancelCreditNotice(input: {
  usesCredit: boolean;
  scheduledAt: string | null | undefined;
  now?: number;
}): string | null {
  if (!input.usesCredit) return null;
  return cancelReturnsCredit(input.scheduledAt, input.now)
    ? 'Cancelling now returns your consultation credit, so you can use it for another booking.'
    : "It's less than 5 minutes to the start, so cancelling now uses your credit.";
}

/**
 * What happened to the credit, decided by the cancel route (the phone's clock
 * is only used for the hint before confirming):
 * - returned: cancelled in time; the credit is back
 * - too_late: 5 minutes or less before the start; the credit is used
 * - no_credit_used: the booking never took a credit (Plus, free, or pending)
 * - release_failed: in time, but giving the credit back failed (reported)
 */
export type CancelCreditOutcome = 'returned' | 'too_late' | 'no_credit_used' | 'release_failed';

const OUTCOMES: readonly CancelCreditOutcome[] = ['returned', 'too_late', 'no_credit_used', 'release_failed'];

/** The outcome from a cancel response; older responses only had creditReturned. */
export function readCancelCreditOutcome(body: unknown): CancelCreditOutcome | null {
  const data = (body ?? {}) as { creditOutcome?: unknown; creditReturned?: unknown };
  if (typeof data.creditOutcome === 'string' && (OUTCOMES as readonly string[]).includes(data.creditOutcome)) {
    return data.creditOutcome as CancelCreditOutcome;
  }
  return data.creditReturned === true ? 'returned' : null;
}

/** The message after cancelling. */
export function cancelledMessage(outcome: CancelCreditOutcome | null): string {
  switch (outcome) {
    case 'returned':
      return 'Consultation cancelled. Your consultation credit is back in your account.';
    case 'too_late':
      return 'Consultation cancelled. It was less than 5 minutes to the start, so the credit was used.';
    case 'release_failed':
      return 'Consultation cancelled, but we could not return your credit. Please contact us and we will add it back.';
    default:
      return 'Consultation cancelled.';
  }
}

/** A warning only when the credit should have come back and didn't. */
export function cancelledToastType(outcome: CancelCreditOutcome | null): 'success' | 'warning' {
  return outcome === 'release_failed' ? 'warning' : 'success';
}
