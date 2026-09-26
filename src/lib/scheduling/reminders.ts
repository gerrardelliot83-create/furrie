/**
 * Which reminder a scheduled consultation is due for (item 6). Pure.
 *
 * - 1 hour:  45 < minutes-until <= 65. The 1-hour texts say "in about an
 *   hour", so they are only sent when that is true. The cron runs every
 *   5 minutes, so every booking made at least 65 minutes ahead gets one.
 * - 15 min:  0 < minutes-until <= 20. Also catches late bookings: customers
 *   can book 15 minutes ahead, so a booking made 15-20 minutes ahead gets it
 *   on the next run.
 * - Both due at once (booked 15-20 minutes ahead with no 1-hour reminder):
 *   send only the 15-minute one and mark the 1-hour one as done too.
 */

export type ReminderDecision =
  | { send: 'none' }
  | { send: '1h' }
  | { send: '15m'; alsoMarkOneHour: boolean };

export const ONE_HOUR_REMINDER_WINDOW = { afterMinutes: 45, upToMinutes: 65 } as const;
export const FIFTEEN_MIN_REMINDER_WINDOW = { afterMinutes: 0, upToMinutes: 20 } as const;

export function reminderDue(
  minutesUntil: number,
  sent: { oneHour: boolean; fifteenMin: boolean }
): ReminderDecision {
  if (
    !sent.fifteenMin &&
    minutesUntil > FIFTEEN_MIN_REMINDER_WINDOW.afterMinutes &&
    minutesUntil <= FIFTEEN_MIN_REMINDER_WINDOW.upToMinutes
  ) {
    return { send: '15m', alsoMarkOneHour: !sent.oneHour };
  }

  if (
    !sent.oneHour &&
    minutesUntil > ONE_HOUR_REMINDER_WINDOW.afterMinutes &&
    minutesUntil <= ONE_HOUR_REMINDER_WINDOW.upToMinutes
  ) {
    return { send: '1h' };
  }

  return { send: 'none' };
}
