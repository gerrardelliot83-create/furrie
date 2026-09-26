/**
 * India time (Asia/Kolkata, UTC+05:30, no daylight saving) for everything a
 * person reads.
 *
 * Server code runs in UTC on Vercel, and a browser runs in whatever zone its
 * machine is set to, so nothing here relies on the local zone: every helper
 * pins Asia/Kolkata explicitly. Day and week boundaries are returned as UTC
 * instants so they can go straight into `.gte()/.lt()` filters.
 */
import { formatDate, formatTime, formatScheduledTimeShort } from '@/lib/utils';

export { formatDate, formatTime, formatScheduledTimeShort };

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET = '+05:30';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const shortDayFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/**
 * Parse a timestamp, or a date-only string ("2026-10-03") as that calendar
 * day in India. `new Date('2026-10-03')` would be UTC midnight, which is the
 * right day in India but the previous day anywhere west of UTC.
 */
export function toIstDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return DATE_ONLY.test(value) ? new Date(`${value}T12:00:00${IST_OFFSET}`) : new Date(value);
}

/** "2026-10-03" — the calendar date in India at that instant. */
export function istDateKey(value: Date | string = new Date()): string {
  return dateKeyFormatter.format(toIstDate(value));
}

/** The India calendar day containing `value`, as UTC instants [start, end). */
export function istDayRange(value: Date | string = new Date()): { start: Date; end: Date } {
  const start = new Date(`${istDateKey(value)}T00:00:00${IST_OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/**
 * The India week (Sunday to Saturday, as the dashboards always counted)
 * containing `value`, as UTC instants [start, end).
 */
export function istWeekRange(value: Date | string = new Date()): { start: Date; end: Date } {
  const key = istDateKey(value);
  // Noon UTC on that calendar date has the same weekday as the India date.
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  const dayStart = new Date(`${key}T00:00:00${IST_OFFSET}`);
  const start = new Date(dayStart.getTime() - weekday * DAY_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
}

/** "4:00 pm" */
export function formatIstTime(value: Date | string): string {
  return timeFormatter.format(toIstDate(value));
}

/** "Sat, 3 Oct, 11:00 am" */
export function formatIstDateTime(value: Date | string): string {
  return dateTimeFormatter.format(toIstDate(value));
}

/** "3 Oct 2026" by default; accepts date-only strings. */
export function formatIstDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return formatDate(toIstDate(value), options);
}

/** "Today" / "Tomorrow" / "Sat, 3 Oct" for an India date key such as "2026-10-03". */
export function istDayLabel(dateKey: string, now: Date = new Date()): string {
  if (dateKey === istDateKey(now)) return 'Today';
  if (dateKey === istDateKey(new Date(now.getTime() + DAY_MS))) return 'Tomorrow';
  return shortDayFormatter.format(toIstDate(dateKey));
}
