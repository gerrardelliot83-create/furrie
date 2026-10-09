/**
 * Does cancelling give the consultation credit back? (Terms §7.3)
 *
 * One rule for the cancel route and the customer's cancel screens (CX-1):
 * the credit comes back when a booked consultation is cancelled more than
 * 5 minutes before it starts. The customer is told which case they are in
 * before they confirm, and what happened afterwards.
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

/** The message after cancelling, from the server's `creditReturned`. */
export function cancelledMessage(input: {
  creditReturned: boolean;
  usesCredit: boolean;
  /** What the rule said when the customer pressed cancel. */
  returnExpected: boolean;
}): string {
  if (input.creditReturned) return 'Consultation cancelled. Your consultation credit is back in your account.';
  if (!input.usesCredit) return 'Consultation cancelled.';
  if (!input.returnExpected) {
    return 'Consultation cancelled. It was less than 5 minutes to the start, so the credit was used.';
  }
  // Early enough, but the credit didn't come back (the release failed, which
  // is reported to Sentry, or found no credit use for this booking). Say so
  // rather than claim it did.
  return 'Consultation cancelled, but we could not return your credit. Please contact us and we will add it back.';
}
