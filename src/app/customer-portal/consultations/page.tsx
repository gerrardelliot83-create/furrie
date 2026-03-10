import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatTime } from '@/lib/utils';
import styles from './Consultations.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: t('consultations'),
  };
}

type TabType = 'upcoming' | 'past' | 'follow-ups';

const PAGE_SIZE = 15;

interface ConsultationsPageProps {
  searchParams: Promise<{ tab?: string; page?: string }>;
}

function formatDuration(startedAt: string | null | undefined, endedAt: string | null | undefined): string {
  if (!startedAt || !endedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} min`;
}

export default async function ConsultationsPage({ searchParams }: ConsultationsPageProps) {
  const t = await getTranslations('consultation');
  const params = await searchParams;

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Determine active tab and page
  const activeTab: TabType = ['upcoming', 'past', 'follow-ups'].includes(params.tab || '')
    ? (params.tab as TabType)
    : 'upcoming';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));

  // Define status filters for each tab
  const statusFilters: Record<TabType, string[]> = {
    upcoming: ['pending', 'scheduled', 'active'],
    past: ['closed'],
    'follow-ups': [],
  };

  // Fetch consultations based on tab
  let consultations: Awaited<ReturnType<typeof mapConsultationWithRelationsFromDB>>[] = [];
  let totalCount = 0;

  if (activeTab !== 'follow-ups') {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id, name, species, breed, photo_urls
        ),
        profiles!consultations_vet_id_fkey (
          id, full_name, avatar_url
        ),
        consultation_ratings (rating, feedback_text),
        prescriptions (id, pdf_url, prescription_number)
      `, { count: 'exact' })
      .in('status', statusFilters[activeTab])
      .order('created_at', { ascending: false })
      .range(from, to);

    consultations = (data || []).map((row) =>
      mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
    );
    totalCount = count || 0;
  } else {
    // For follow-ups tab, fetch active follow-up threads
    const { data } = await supabase
      .from('follow_up_threads')
      .select(`
        consultation_id,
        consultations!follow_up_threads_consultation_id_fkey (
          *,
          pets!consultations_pet_id_fkey (
            id, name, species, breed, photo_urls
          ),
          profiles!consultations_vet_id_fkey (
            id, full_name, avatar_url
          )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      consultations = data
        .filter((thread) => thread.consultations)
        .map((thread) =>
          mapConsultationWithRelationsFromDB(
            thread.consultations as unknown as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
          )
        );
      totalCount = consultations.length;
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'follow-ups', label: 'Follow-ups' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('consultations')}</h1>
        <Link href="/connect">
          <Button variant="primary" size="sm">
            {t('newConsultation')}
          </Button>
        </Link>
      </header>

      {/* Tab Bar */}
      <nav className={styles.tabBar} role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/consultations?tab=${tab.key}`}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            role="tab"
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Consultations */}
      <div className={styles.content}>
        {consultations.length > 0 ? (
          <>
            {/* Desktop Table - hidden on mobile */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeader}>Date & Time</th>
                    <th className={styles.tableHeader}>Pet</th>
                    <th className={styles.tableHeader}>Vet</th>
                    <th className={styles.tableHeader}>Concern</th>
                    <th className={styles.tableHeader}>Status</th>
                    {activeTab === 'past' && (
                      <th className={styles.tableHeader}>Duration</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => {
                    const displayDate = consultation.scheduledAt || consultation.createdAt;
                    const statusVariant = getStatusVariant(
                      consultation.status as ConsultationStatus,
                      consultation.outcome as ConsultationOutcome | null
                    );
                    const statusText = getStatusDisplayText(
                      consultation.status as ConsultationStatus,
                      consultation.outcome as ConsultationOutcome | null
                    );

                    return (
                      <tr key={consultation.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <Link href={`/consultations/${consultation.id}`} className={styles.rowLink}>
                            <div className={styles.dateTime}>
                              <span className={styles.date} suppressHydrationWarning>
                                {formatDate(displayDate)}
                              </span>
                              <span className={styles.time} suppressHydrationWarning>
                                {formatTime(displayDate)}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className={styles.tableCell}>
                          <Link href={`/consultations/${consultation.id}`} className={styles.rowLink}>
                            <div className={styles.petCell}>
                              <div className={styles.petAvatar}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={consultation.pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                                  alt={consultation.pet?.species === 'dog' ? 'Dog' : 'Cat'}
                                  className={styles.petAvatarImg}
                                />
                              </div>
                              <div className={styles.petInfo}>
                                <span className={styles.petName}>
                                  {consultation.pet?.name || 'Unknown'}
                                </span>
                                <span className={styles.petBreed}>
                                  {consultation.pet?.breed || 'Unknown breed'}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className={styles.tableCell}>
                          <Link href={`/consultations/${consultation.id}`} className={styles.rowLink}>
                            {consultation.vet ? `Dr. ${consultation.vet.fullName}` : '-'}
                          </Link>
                        </td>
                        <td className={styles.tableCell}>
                          <Link href={`/consultations/${consultation.id}`} className={styles.rowLink}>
                            <span className={styles.concernText}>
                              {consultation.concernText || '-'}
                            </span>
                          </Link>
                        </td>
                        <td className={styles.tableCell}>
                          <Badge variant={statusVariant} size="sm">
                            {statusText}
                          </Badge>
                        </td>
                        {activeTab === 'past' && (
                          <td className={styles.tableCell}>
                            {formatDuration(consultation.startedAt, consultation.endedAt)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - hidden on desktop */}
            <div className={styles.mobileList}>
              {consultations.map((consultation) => {
                const displayDate = consultation.scheduledAt || consultation.createdAt;
                const statusVariant = getStatusVariant(
                  consultation.status as ConsultationStatus,
                  consultation.outcome as ConsultationOutcome | null
                );
                const statusText = getStatusDisplayText(
                  consultation.status as ConsultationStatus,
                  consultation.outcome as ConsultationOutcome | null
                );

                return (
                  <Link
                    key={consultation.id}
                    href={`/consultations/${consultation.id}`}
                    className={styles.mobileCard}
                  >
                    <div className={styles.mobileCardTop}>
                      <div className={styles.mobilePetCell}>
                        <div className={styles.petAvatar}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={consultation.pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                            alt={consultation.pet?.species === 'dog' ? 'Dog' : 'Cat'}
                            className={styles.petAvatarImg}
                          />
                        </div>
                        <div className={styles.petInfo}>
                          <span className={styles.petName}>
                            {consultation.pet?.name || 'Unknown'}
                          </span>
                          <span className={styles.petBreed}>
                            {consultation.pet?.breed || 'Unknown breed'}
                          </span>
                        </div>
                      </div>
                      <Badge variant={statusVariant} size="sm">
                        {statusText}
                      </Badge>
                    </div>

                    <div className={styles.mobileCardDetails}>
                      <div className={styles.mobileDetailRow}>
                        <span className={styles.mobileLabel}>Date</span>
                        <span className={styles.mobileValue} suppressHydrationWarning>
                          {formatDate(displayDate)}, {formatTime(displayDate)}
                        </span>
                      </div>
                      {consultation.vet && (
                        <div className={styles.mobileDetailRow}>
                          <span className={styles.mobileLabel}>Vet</span>
                          <span className={styles.mobileValue}>
                            Dr. {consultation.vet.fullName}
                          </span>
                        </div>
                      )}
                      {consultation.concernText && (
                        <div className={styles.mobileDetailRow}>
                          <span className={styles.mobileLabel}>Concern</span>
                          <span className={styles.mobileConcern}>
                            {consultation.concernText}
                          </span>
                        </div>
                      )}
                      {activeTab === 'past' && consultation.startedAt && consultation.endedAt && (
                        <div className={styles.mobileDetailRow}>
                          <span className={styles.mobileLabel}>Duration</span>
                          <span className={styles.mobileValue}>
                            {formatDuration(consultation.startedAt, consultation.endedAt)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={styles.mobileChevron}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                {currentPage > 1 && (
                  <Link
                    href={`/consultations?${new URLSearchParams({
                      tab: activeTab,
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
                      tab: activeTab,
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
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'No upcoming consultations'
                : activeTab === 'past'
                  ? 'No past consultations yet'
                  : 'No active follow-up conversations'}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/connect">
                <Button variant="secondary" size="sm">
                  {t('startConsultation')}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
