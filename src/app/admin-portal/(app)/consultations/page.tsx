import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { formatIstDateTime } from '@/lib/time/ist';
import {
  DATE_OPTIONS,
  FREE_SOURCES,
  PAGE_SIZE,
  PAID_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  appointmentRange,
  consultationNumberTerm,
  escapeLike,
  filtersToQuery,
  paidWithLabel,
  parseConsultationFilters,
  statusCondition,
} from '@/lib/admin/consultationFilters';
import styles from './page.module.css';

export const maxDuration = 15;

// How many matching customers / pets a search looks at (A1). Enough for any
// name or email; keeps the follow-up query short.
const SEARCH_MATCH_CAP = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: `Admin ${t('consultations')}`,
  };
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'scheduled':
      return styles.badgeScheduled;
    case 'active':
    case 'in_progress':
      return styles.badgeActive;
    case 'closed':
      return styles.badgeClosed;
    case 'pending':
    case 'matched':
      return styles.badgePending;
    default:
      return styles.badgeClosed;
  }
}

function getStatusLabel(status: string, outcome: string | null): string {
  if (status === 'closed' && outcome) {
    switch (outcome) {
      case 'success':
        return 'Completed';
      case 'missed':
        return 'Missed';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      default:
        return 'Closed';
    }
  }
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'active':
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Being confirmed';
    case 'matched':
      return 'Matched';
    default:
      return status;
  }
}

function getOutcomeBadgeClass(outcome: string | null): string {
  switch (outcome) {
    case 'missed':
    case 'failed':
      return styles.badgeMissed;
    case 'cancelled':
      return styles.badgePending;
    default:
      return styles.badgeClosed;
  }
}

type One<T> = T | T[] | null;

function one<T>(value: One<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

interface ConsultationRow {
  id: string;
  consultation_number: string | null;
  status: string;
  outcome: string | null;
  scheduled_at: string | null;
  created_at: string;
  customer: One<{ full_name: string | null; email: string | null; phone: string | null }>;
  vet: One<{ full_name: string | null }>;
  pet: One<{ name: string; species: string }>;
  consultation_pack_uses: One<{ consultation_packs: One<{ source: string }> }>;
}

function uniqueIds(...lists: ({ id: string }[] | null)[]): string[] {
  return [...new Set(lists.flatMap((list) => (list ?? []).map((row) => row.id)))];
}

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('consultation');
  const supabase = await createClient();
  const filters = parseConsultationFilters(await searchParams);

  // Vets for the filter (a handful; read with the admin's session like the rest).
  const { data: vets } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'vet')
    .order('full_name');

  // Search: find matching customers and pets first, each with its own escaped
  // ilike filter, then keep consultations that belong to them or whose
  // number matches. The text never goes into an or() string itself.
  let searchFilter: string | null = null;
  let searchFailed = false;
  let noSearchMatches = false;
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const customerQuery = (column: 'full_name' | 'email' | 'phone') =>
      supabase.from('profiles').select('id').eq('role', 'customer').ilike(column, pattern).limit(SEARCH_MATCH_CAP);
    const [byName, byEmail, byPhone, byPet] = await Promise.all([
      customerQuery('full_name'),
      customerQuery('email'),
      customerQuery('phone'),
      supabase.from('pets').select('id').ilike('name', pattern).limit(SEARCH_MATCH_CAP),
    ]);
    searchFailed = [byName, byEmail, byPhone, byPet].some((r) => r.error);

    const customerIds = uniqueIds(byName.data, byEmail.data, byPhone.data);
    const petIds = uniqueIds(byPet.data);
    const numberTerm = consultationNumberTerm(filters.q);

    const parts: string[] = [];
    if (customerIds.length) parts.push(`customer_id.in.(${customerIds.join(',')})`);
    if (petIds.length) parts.push(`pet_id.in.(${petIds.join(',')})`);
    if (numberTerm) parts.push(`consultation_number.ilike.*${numberTerm}*`);
    if (parts.length) searchFilter = parts.join(',');
    else noSearchMatches = true;
  }

  // "Paid with" needs the credit's source: an inner join to narrow to paid or
  // free credits, an anti-join (no pack use) for "No credit".
  const packJoin =
    filters.paid === 'paid' || filters.paid === 'free'
      ? 'consultation_pack_uses!inner(consultation_packs!inner(source))'
      : 'consultation_pack_uses(consultation_packs(source))';

  let rows: ConsultationRow[] = [];
  let total = 0;
  let loadError: string | null = null;

  if (!noSearchMatches && !searchFailed) {
    let query = supabase
      .from('consultations')
      .select(
        `
        id,
        consultation_number,
        status,
        outcome,
        scheduled_at,
        created_at,
        customer:profiles!consultations_customer_id_fkey (full_name, email, phone),
        vet:profiles!consultations_vet_id_fkey (full_name),
        pet:pets!consultations_pet_id_fkey (name, species),
        ${packJoin}
      `,
        { count: 'exact' }
      );

    const { statuses, outcome } = statusCondition(filters.status);
    if (statuses) query = query.in('status', statuses);
    if (outcome) query = query.eq('outcome', outcome);

    const range = appointmentRange(filters);
    if (range?.start) query = query.gte('scheduled_at', range.start.toISOString());
    if (range?.end) query = query.lt('scheduled_at', range.end.toISOString());

    if (filters.vet) query = query.eq('vet_id', filters.vet);

    if (filters.paid === 'paid') {
      query = query.eq('consultation_pack_uses.consultation_packs.source', 'purchase');
    } else if (filters.paid === 'free') {
      query = query.in('consultation_pack_uses.consultation_packs.source', [...FREE_SOURCES]);
    } else if (filters.paid === 'none') {
      query = query.is('consultation_pack_uses', null);
    }

    if (searchFilter) query = query.or(searchFilter);

    query =
      filters.sort === 'booked'
        ? query.order('created_at', { ascending: false })
        : query.order('scheduled_at', { ascending: filters.sort === 'soonest', nullsFirst: false });

    const offset = (filters.page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) loadError = error.message;
    rows = (data ?? []) as unknown as ConsultationRow[];
    total = count ?? 0;
  }
  if (searchFailed) loadError = 'The search could not run. Please try again.';

  const firstShown = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(filters.page * PAGE_SIZE, total);
  const hasPrevious = filters.page > 1;
  const hasNext = lastShown < total;
  const filtered = filtersToQuery(filters, { page: 1 }) !== '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t('consultations')}{' '}
          <span className={styles.count}>
            {total === 0 ? '(0)' : `(showing ${firstShown}–${lastShown} of ${total})`}
          </span>
        </h1>
      </div>

      {/* A plain GET form: every choice becomes part of the address. */}
      <form method="get" className={styles.filters} role="search">
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, email, phone, pet or consultation number"
          aria-label="Search consultations"
          className={`${styles.control} ${styles.search}`}
        />
        <select name="status" defaultValue={filters.status} aria-label="Status" className={styles.control}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select name="date" defaultValue={filters.date} aria-label="Appointment date" className={styles.control}>
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className={styles.dateLabel}>
          From
          <input type="date" name="from" defaultValue={filters.from ?? ''} className={styles.control} />
        </label>
        <label className={styles.dateLabel}>
          To
          <input type="date" name="to" defaultValue={filters.to ?? ''} className={styles.control} />
        </label>
        <select name="vet" defaultValue={filters.vet ?? ''} aria-label="Vet" className={styles.control}>
          <option value="">All vets</option>
          {(vets ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.full_name || 'Unnamed vet'}</option>
          ))}
        </select>
        <select name="paid" defaultValue={filters.paid} aria-label="Paid with" className={styles.control}>
          {PAID_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort" className={styles.control}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="submit" className={styles.applyBtn}>Apply</button>
        {filtered && (
          <Link href="/consultations" className={styles.clearLink}>Clear filters</Link>
        )}
      </form>
      <p className={styles.hint}>Times are India time (IST). The From/To dates apply to the appointment date.</p>

      {loadError ? (
        <p className={styles.errorText}>Failed to load consultations: {loadError}</p>
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{filtered ? 'No consultations match these filters.' : 'No upcoming consultations.'}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Appointment</th>
                <th>Customer</th>
                <th>Pet</th>
                <th>Vet</th>
                <th>Status</th>
                <th>Paid with</th>
                <th>Booked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const customer = one(row.customer);
                const vet = one(row.vet);
                const pet = one(row.pet);
                const source = one(one(row.consultation_pack_uses)?.consultation_packs)?.source ?? null;
                const statusLabel = getStatusLabel(row.status, row.outcome);
                const badgeClass =
                  row.status === 'closed' && row.outcome && row.outcome !== 'success'
                    ? getOutcomeBadgeClass(row.outcome)
                    : getStatusBadgeClass(row.status);

                return (
                  <tr key={row.id}>
                    <td>
                      <span className={styles.consultationNumber}>{row.consultation_number || '-'}</span>
                    </td>
                    <td className={styles.nowrap}>
                      {row.scheduled_at ? formatIstDateTime(row.scheduled_at) : '-'}
                    </td>
                    <td>
                      <div>
                        {customer?.email ? (
                          <Link
                            href={`/users?q=${encodeURIComponent(customer.email)}`}
                            className={styles.customerLink}
                            title="Open in Users (give credits, turn off)"
                          >
                            {customer.full_name || 'Unknown'}
                          </Link>
                        ) : (
                          customer?.full_name || 'Unknown'
                        )}
                      </div>
                      {customer?.email && (
                        <a href={`mailto:${customer.email}`} className={styles.subLine}>
                          {customer.email}
                        </a>
                      )}
                      {customer?.phone && <div className={styles.subLine}>{customer.phone}</div>}
                    </td>
                    <td>{pet ? `${pet.name} (${pet.species})` : '-'}</td>
                    <td>{vet?.full_name ? `Dr. ${vet.full_name}` : 'Unassigned'}</td>
                    <td>
                      <span className={`${styles.badge} ${badgeClass}`}>{statusLabel}</span>
                    </td>
                    <td>{paidWithLabel(source)}</td>
                    <td className={styles.nowrap}>{formatIstDateTime(row.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(hasPrevious || hasNext) && (
        <nav className={styles.pagination} aria-label="Pages">
          {hasPrevious ? (
            <Link href={`/consultations${filtersToQuery(filters, { page: filters.page - 1 })}`} className={styles.pageLink}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className={styles.count}>Page {filters.page}</span>
          {hasNext ? (
            <Link href={`/consultations${filtersToQuery(filters, { page: filters.page + 1 })}`} className={styles.pageLink}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
