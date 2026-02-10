import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { Button } from '@/components/ui/Button';
import { ConsultationCard } from '@/components/consultation';
import styles from './Consultations.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: t('consultations'),
  };
}

type TabType = 'upcoming' | 'past' | 'follow-ups';

interface ConsultationsPageProps {
  searchParams: Promise<{ tab?: string }>;
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
    redirect('/customer-portal/login');
  }

  // Determine active tab
  const activeTab: TabType = ['upcoming', 'past', 'follow-ups'].includes(params.tab || '')
    ? (params.tab as TabType)
    : 'upcoming';

  // Define status filters for each tab
  const statusFilters: Record<TabType, string[]> = {
    upcoming: ['pending', 'matching', 'matched', 'in_progress', 'scheduled'],
    past: ['completed', 'missed', 'cancelled', 'no_vet_available'],
    'follow-ups': [], // Follow-ups handled separately via follow_up_threads
  };

  // Fetch consultations based on tab
  let consultations: Awaited<ReturnType<typeof mapConsultationWithRelationsFromDB>>[] = [];

  if (activeTab !== 'follow-ups') {
    const { data } = await supabase
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
      `)
      .in('status', statusFilters[activeTab])
      .order('created_at', { ascending: false });

    consultations = (data || []).map((row) =>
      mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
    );
  } else {
    // For follow-ups tab, fetch active follow-up threads
    // Phase 6 will implement this fully
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

    // Extract consultations from threads
    if (data) {
      consultations = data
        .filter((thread) => thread.consultations)
        .map((thread) =>
          mapConsultationWithRelationsFromDB(
            thread.consultations as unknown as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
          )
        );
    }
  }

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

      {/* Consultations List */}
      <div className={styles.content}>
        {consultations.length > 0 ? (
          <div className={styles.list}>
            {consultations.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
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
