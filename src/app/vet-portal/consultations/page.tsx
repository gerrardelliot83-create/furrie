import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: `${t('consultations')} - Vet Portal`,
  };
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}

const PAGE_SIZE = 20;

import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} min`;
}

export default async function VetConsultationsPage({ searchParams }: PageProps) {
  const { status: statusFilter, page: pageParam, search: searchQuery } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10));
  const t = await getTranslations('consultation');
  const tEmpty = await getTranslations('empty');

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is a vet
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  // Build query with optional status filter, search, and pagination
  let query = supabase
    .from('consultations')
    .select(`
      id, status, outcome, scheduled_at, created_at, started_at, ended_at,
      concern_text, symptom_categories,
      pets!consultations_pet_id_fkey (
        id, name, species, breed
      ),
      profiles!consultations_customer_id_fkey (
        id, full_name
      ),
      consultation_ratings (
        rating
      )
    `, { count: 'exact' })
    .eq('vet_id', user.id)
    .order('created_at', { ascending: false });

  // Apply status filter (using consolidated statuses)
  if (statusFilter === 'in_progress') {
    query = query.eq('status', 'active');
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 'closed').eq('outcome', 'success');
  }

  // Apply search filter — match pet name or customer name via concern_text (full text)
  if (searchQuery) {
    query = query.or(
      `concern_text.ilike.%${searchQuery}%,pets.name.ilike.%${searchQuery}%`
    );
  }

  // Apply pagination
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: consultations, count: totalCount, error: consultationsError } = await query;
  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  if (consultationsError) {
    console.error('Error fetching consultations:', consultationsError);
  }

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('consultations')}</h1>

        <div className={styles.filters}>
          <Link
            href="/consultations"
            className={!statusFilter ? styles.filterTabActive : styles.filterTab}
          >
            All
          </Link>
          <Link
            href="/consultations?status=in_progress"
            className={statusFilter === 'in_progress' ? styles.filterTabActive : styles.filterTab}
          >
            In Progress
          </Link>
          <Link
            href="/consultations?status=completed"
            className={statusFilter === 'completed' ? styles.filterTabActive : styles.filterTab}
          >
            Completed
          </Link>
        </div>

        {/* Search bar */}
        <form action="/consultations" method="get" className={styles.searchForm}>
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="text"
            name="search"
            placeholder="Search by pet name or concern..."
            defaultValue={searchQuery || ''}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {searchQuery && (
            <Link
              href={`/consultations${statusFilter ? `?status=${statusFilter}` : ''}`}
              className={styles.clearSearch}
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {consultations && consultations.length > 0 ? (
        <>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Date & Time</th>
                <th className={styles.tableHeader}>Pet</th>
                <th className={styles.tableHeader}>Customer</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Duration</th>
                <th className={styles.tableHeader}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((consultation) => {
                const pet = Array.isArray(consultation.pets) ? consultation.pets[0] : consultation.pets;
                const customer = Array.isArray(consultation.profiles) ? consultation.profiles[0] : consultation.profiles;
                const rating = consultation.consultation_ratings?.[0]?.rating;
                // Use scheduled_at for scheduled consultations, fall back to created_at
                const displayDate = consultation.scheduled_at
                  ? new Date(consultation.scheduled_at)
                  : new Date(consultation.created_at);

                return (
                  <tr key={consultation.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <Link
                        href={`/consultations/${consultation.id}`}
                        className={styles.rowLink}
                      >
                        <div className={styles.dateTime}>
                          <span className={styles.date} suppressHydrationWarning>
                            {dateFormatter.format(displayDate)}
                          </span>
                          <span className={styles.time} suppressHydrationWarning>
                            {timeFormatter.format(displayDate)}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className={styles.tableCell}>
                      <Link
                        href={`/consultations/${consultation.id}`}
                        className={styles.rowLink}
                      >
                        <div className={styles.petCell}>
                          <div className={styles.petAvatar}>
                            {pet?.species === 'dog' ? 'D' : 'C'}
                          </div>
                          <div className={styles.petInfo}>
                            <span className={styles.petName}>
                              {pet?.name || 'Unknown'}
                            </span>
                            <span className={styles.petBreed}>
                              {pet?.breed || 'Unknown breed'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className={styles.tableCell}>
                      <Link
                        href={`/consultations/${consultation.id}`}
                        className={styles.rowLink}
                      >
                        {customer?.full_name || 'Unknown'}
                      </Link>
                    </td>
                    <td className={styles.tableCell}>
                      <Badge variant={getStatusVariant(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}>
                        {getStatusDisplayText(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      {formatDuration(consultation.started_at, consultation.ended_at)}
                    </td>
                    <td className={styles.tableCell}>
                      {rating ? (
                        <div className={styles.rating}>
                          <span>★</span>
                          <span className={styles.ratingValue}>{rating}</span>
                        </div>
                      ) : (
                        <span className={styles.noRating}>Not rated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            {currentPage > 1 && (
              <Link
                href={`/consultations?${new URLSearchParams({
                  ...(statusFilter ? { status: statusFilter } : {}),
                  ...(searchQuery ? { search: searchQuery } : {}),
                  page: String(currentPage - 1),
                }).toString()}`}
                className={styles.paginationButton}
              >
                Previous
              </Link>
            )}
            <span className={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/consultations?${new URLSearchParams({
                  ...(statusFilter ? { status: statusFilter } : {}),
                  ...(searchQuery ? { search: searchQuery } : {}),
                  page: String(currentPage + 1),
                }).toString()}`}
                className={styles.paginationButton}
              >
                Next
              </Link>
            )}
          </div>
        )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>—</div>
          <h2 className={styles.emptyTitle}>{tEmpty('noConsultations')}</h2>
          <p className={styles.emptyText}>
            {statusFilter
              ? 'No consultations match this filter.'
              : 'You have no consultations yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
