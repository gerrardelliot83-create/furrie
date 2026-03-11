import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { Button } from '@/components/ui/Button';
import { ConsultationList } from './ConsultationList';
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

      {/* Consultations — client component handles rendering + detail panel */}
      <div className={styles.content}>
        <ConsultationList
          consultations={consultations}
          activeTab={activeTab}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
