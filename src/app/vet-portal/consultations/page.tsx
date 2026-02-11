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
  searchParams: Promise<{ status?: string }>;
}

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
  const { status: statusFilter } = await searchParams;
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

  // Build query with optional status filter
  let query = supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id,
        name,
        species,
        breed,
        photo_urls
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name
      ),
      consultation_ratings (
        rating
      )
    `)
    .eq('vet_id', user.id)
    .order('created_at', { ascending: false });

  // Apply status filter (using consolidated statuses)
  if (statusFilter === 'in_progress') {
    query = query.eq('status', 'active');
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 'closed').eq('outcome', 'success');
  }
  // 'all' or no filter shows everything

  const { data: consultations, error: consultationsError } = await query;

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
      </div>

      {consultations && consultations.length > 0 ? (
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
                const pet = consultation.pets;
                const customer = consultation.profiles;
                const rating = consultation.consultation_ratings?.[0]?.rating;
                const createdAt = new Date(consultation.created_at);

                return (
                  <tr key={consultation.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <Link
                        href={`/consultations/${consultation.id}`}
                        className={styles.rowLink}
                      >
                        <div className={styles.dateTime}>
                          <span className={styles.date}>
                            {dateFormatter.format(createdAt)}
                          </span>
                          <span className={styles.time}>
                            {timeFormatter.format(createdAt)}
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
