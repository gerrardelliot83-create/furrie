/**
 * Admin → Consultations: the search, filters, sort and page, read from the
 * page address (A1, 2026-09-27).
 *
 * Everything the admin can choose lives in the URL (`?q=…&status=…`), so a
 * filtered view can be bookmarked or sent, and Back works. Every value is
 * allow-listed here; anything unknown falls back to the default. Search text
 * only ever reaches the database through escaped `ilike` values, never through
 * a hand-built PostgREST `or()` string.
 */
import { istDateKey, istDayRange, istMonthRange, IST_OFFSET } from '@/lib/time/ist';

export const PAGE_SIZE = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
  { value: 'all', label: 'All statuses' },
] as const;

export const DATE_OPTIONS = [
  { value: 'all', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'past7', label: 'Past 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'From – to' },
] as const;

export const PAID_OPTIONS = [
  { value: 'all', label: 'Any payment' },
  { value: 'paid', label: 'Paid credit' },
  { value: 'free', label: 'Free credit' },
  { value: 'none', label: 'No credit' },
] as const;

export const SORT_OPTIONS = [
  { value: 'soonest', label: 'Appointment: soonest first' },
  { value: 'latest', label: 'Appointment: latest first' },
  { value: 'booked', label: 'Recently booked' },
] as const;

export type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
export type DateFilter = (typeof DATE_OPTIONS)[number]['value'];
export type PaidFilter = (typeof PAID_OPTIONS)[number]['value'];
export type SortOrder = (typeof SORT_OPTIONS)[number]['value'];

export interface ConsultationFilters {
  q: string;
  status: StatusFilter;
  date: DateFilter;
  /** India date keys ("2026-10-03"), only with date = 'custom'. */
  from: string | null;
  to: string | null;
  vet: string | null;
  paid: PaidFilter;
  sort: SortOrder;
  page: number;
}

/** The working view: what's coming up, soonest first. */
export const DEFAULT_FILTERS: ConsultationFilters = {
  q: '',
  status: 'upcoming',
  date: 'all',
  from: null,
  to: null,
  vet: null,
  paid: 'all',
  sort: 'soonest',
  page: 1,
};

/** Credit sources that cost the customer nothing (consultation_packs.source). */
export const FREE_SOURCES = ['admin_grant', 'promo', 'invite', 'invite_reward', 'refund'] as const;

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function pick<T extends string>(options: readonly { value: T }[], raw: string, fallback: T): T {
  return options.some((o) => o.value === raw) ? (raw as T) : fallback;
}

function validDateKey(raw: string): string | null {
  if (!DATE_ONLY.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00${IST_OFFSET}`);
  return Number.isNaN(date.getTime()) || istDateKey(date) !== raw ? null : raw;
}

export function parseConsultationFilters(params: Params): ConsultationFilters {
  const q = first(params.q).replace(/\s+/g, ' ').slice(0, 100);
  let from = validDateKey(first(params.from));
  let to = validDateKey(first(params.to));
  if (from && to && from > to) [from, to] = [to, from];

  // A chosen preset (Today, Next 7 days…) wins over leftover From/To boxes;
  // From/To count when the range is "From – to" or no range was chosen.
  let date = pick(DATE_OPTIONS, first(params.date), DEFAULT_FILTERS.date);
  if (date === 'all' && (from || to)) date = 'custom';
  if (date !== 'custom') {
    from = null;
    to = null;
  }

  const vetRaw = first(params.vet);
  const page = Number.parseInt(first(params.page), 10);

  return {
    q,
    status: pick(STATUS_OPTIONS, first(params.status), DEFAULT_FILTERS.status),
    date,
    from,
    to,
    vet: UUID.test(vetRaw) ? vetRaw.toLowerCase() : null,
    paid: pick(PAID_OPTIONS, first(params.paid), DEFAULT_FILTERS.paid),
    sort: pick(SORT_OPTIONS, first(params.sort), DEFAULT_FILTERS.sort),
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1,
  };
}

/** Appointment-time window for the date filter, as UTC instants [start, end). */
export function appointmentRange(
  filters: Pick<ConsultationFilters, 'date' | 'from' | 'to'>,
  now: Date = new Date()
): { start: Date | null; end: Date | null } | null {
  const today = istDayRange(now);
  switch (filters.date) {
    case 'today':
      return today;
    case 'tomorrow':
      return istDayRange(new Date(today.start.getTime() + DAY_MS));
    case 'next7':
      return { start: today.start, end: new Date(today.start.getTime() + 7 * DAY_MS) };
    case 'past7':
      return { start: new Date(today.start.getTime() - 7 * DAY_MS), end: today.end };
    case 'month':
      return istMonthRange(now);
    case 'custom': {
      if (!filters.from && !filters.to) return null;
      return {
        start: filters.from ? new Date(`${filters.from}T00:00:00${IST_OFFSET}`) : null,
        end: filters.to ? new Date(new Date(`${filters.to}T00:00:00${IST_OFFSET}`).getTime() + DAY_MS) : null,
      };
    }
    default:
      return null;
  }
}

/** Statuses (and outcome) a status filter matches. */
export function statusCondition(status: StatusFilter): { statuses: string[] | null; outcome: string | null } {
  switch (status) {
    case 'upcoming':
      return { statuses: ['pending', 'scheduled'], outcome: null };
    case 'active':
      return { statuses: ['active'], outcome: null };
    case 'completed':
      return { statuses: ['closed'], outcome: 'success' };
    case 'missed':
    case 'cancelled':
    case 'failed':
      return { statuses: ['closed'], outcome: status };
    default:
      return { statuses: null, outcome: null };
  }
}

/** Text for a Postgres LIKE/ILIKE pattern: `%`, `_` and `\` match themselves. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** The search text, if it could be (part of) a consultation number. Letters, digits and dashes only. */
export function consultationNumberTerm(q: string): string | null {
  return /^[A-Za-z0-9-]{2,40}$/.test(q) ? q : null;
}

/** The address for these filters with some values changed; defaults are left out. */
export function filtersToQuery(filters: ConsultationFilters, changes: Partial<ConsultationFilters> = {}): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== DEFAULT_FILTERS.status) params.set('status', next.status);
  if (next.date !== DEFAULT_FILTERS.date) params.set('date', next.date);
  if (next.date === 'custom' && next.from) params.set('from', next.from);
  if (next.date === 'custom' && next.to) params.set('to', next.to);
  if (next.vet) params.set('vet', next.vet);
  if (next.paid !== DEFAULT_FILTERS.paid) params.set('paid', next.paid);
  if (next.sort !== DEFAULT_FILTERS.sort) params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** "Paid credit", "Invite credit", … for a consultation's credit source; "No credit" when none was used. */
export function paidWithLabel(source: string | null | undefined): string {
  switch (source) {
    case 'purchase':
      return 'Paid credit';
    case 'admin_grant':
      return 'Gift credit';
    case 'invite':
    case 'invite_reward':
      return 'Invite credit';
    case 'promo':
      return 'Promo credit';
    case 'refund':
      return 'Refund credit';
    default:
      return 'No credit';
  }
}
