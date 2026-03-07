import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { withTimeout } from '@/lib/utils/queryTimeout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConsultationCard } from '@/components/consultation';
import styles from './Dashboard.module.css';

export const maxDuration = 30;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: t('home'),
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function CustomerDashboard() {
  const t = await getTranslations('nav');
  const tConsultation = await getTranslations('consultation');
  const tPets = await getTranslations('pets');
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

  const greeting = getGreeting();

  // Run ALL queries in parallel with timeout protection
  // Profile, pets, consultations, and care plans all fire together
  const QUERY_TIMEOUT = 8000;

  const allQueries = Promise.all([
    // [0] Profile
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    // [1] Pets
    supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4),
    // [2] Upcoming consultations
    supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id, name, species, breed, photo_urls
        ),
        profiles!consultations_vet_id_fkey (
          id, full_name, avatar_url
        )
      `)
      .in('status', ['pending', 'scheduled', 'active'])
      .order('created_at', { ascending: false })
      .limit(3),
    // [3] Recent consultations
    supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id, name, species, breed, photo_urls
        ),
        profiles!consultations_vet_id_fkey (
          id, full_name, avatar_url
        ),
        consultation_ratings (rating, feedback_text)
      `)
      .eq('status', 'closed')
      .eq('outcome', 'success')
      .order('ended_at', { ascending: false })
      .limit(3),
    // [4] Active care plans
    supabase
      .from('care_plans')
      .select('*, care_plan_steps (id, status), pets!care_plans_pet_id_fkey (id, name), vet:profiles!care_plans_vet_id_fkey (full_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  type QueryResult = Awaited<typeof allQueries>;
  const fallback = [
    { data: null, error: null, count: null, status: 0, statusText: '' },
    { data: null, error: null, count: null, status: 0, statusText: '' },
    { data: null, error: null, count: null, status: 0, statusText: '' },
    { data: null, error: null, count: null, status: 0, statusText: '' },
    { data: null, error: null, count: null, status: 0, statusText: '' },
  ] as unknown as QueryResult;

  const [
    { data: profile },
    { data: petsData },
    { data: upcomingData },
    { data: recentData },
    { data: carePlansData },
  ] = await withTimeout(allQueries, QUERY_TIMEOUT, fallback);

  const userName = profile?.full_name || 'there';

  const pets = (petsData || []).map(mapPetFromDB);

  const upcomingConsultations = (upcomingData || []).map((row) =>
    mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
  );

  const recentConsultations = (recentData || []).map((row) =>
    mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
  );

  const activeCarePlans = (carePlansData || []).map((plan) => {
    const steps = plan.care_plan_steps || [];
    return {
      ...plan,
      totalSteps: steps.length,
      completedSteps: steps.filter((s: { status: string }) => s.status === 'completed').length,
    };
  });

  // If all critical queries failed or timed out, show a connection error
  const allQueriesFailed = !petsData && !upcomingData && !recentData;
  if (allQueriesFailed) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.greeting}>
            {greeting}, {userName.split(' ')[0]}!
          </h1>
        </header>
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#666',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.5rem' }}>
            Having trouble connecting
          </h2>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
            We could not load your dashboard data. Please check your connection and try again.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">
              Reload page
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Greeting - visible on mobile only (desktop shows in topbar) */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {greeting}, {userName.split(' ')[0]}!
        </h1>
        <p className={styles.subtitle}>
          Here&apos;s what&apos;s happening with your pets today.
        </p>
      </header>

      {/* Quick Connect CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <div className={styles.ctaIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h2 className={styles.ctaTitle}>Connect with a Vet Now</h2>
            <p className={styles.ctaDescription}>
              Get instant video consultation with a licensed veterinarian
            </p>
          </div>
          <Link href="/connect" className={styles.ctaButton}>
            {tConsultation('startConsultation')}
          </Link>
        </div>
      </section>

      {/* Your Pets */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('myPets')}</h2>
          {pets.length > 0 && (
            <Link href="/pets" className={styles.viewAllLink}>
              View All
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>

        {pets.length > 0 ? (
          <div className={styles.petsScroll}>
            {pets.map((pet) => (
              <Link key={pet.id} href={`/pets/${pet.id}`} className={styles.petCard}>
                <div className={`${styles.petAvatar} ${pet.species === 'dog' ? styles.petAvatarDog : styles.petAvatarCat}`}>
                  {pet.photoUrls?.[0] ? (
                    <Image
                      src={pet.photoUrls[0]}
                      alt={pet.name}
                      width={56}
                      height={56}
                      className={styles.petImage}
                    />
                  ) : (
                    <div className={styles.petFallback}>
                      {pet.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petBreed}>{pet.breed}</span>
              </Link>
            ))}
            <Link href="/pets/new" className={styles.addPetCard}>
              <div className={styles.addPetIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={styles.addPetText}>{tPets('addPet')}</span>
            </Link>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{tEmpty('noPets')}</p>
            <Link href="/pets/new">
              <Button variant="secondary" size="sm">
                {tPets('addFirstPet')}
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Upcoming Consultations */}
      {upcomingConsultations.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Consultations</h2>
            <Link href="/consultations" className={styles.viewAllLink}>
              View All
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
          <div className={styles.consultationsList}>
            {upcomingConsultations.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        </section>
      )}

      {/* Active Care Plans */}
      {activeCarePlans.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Care Plans</h2>
          </div>
          <div className={styles.carePlansList}>
            {activeCarePlans.map((plan) => {
              const progress = plan.totalSteps > 0
                ? Math.round((plan.completedSteps / plan.totalSteps) * 100)
                : 0;
              return (
                <Link
                  key={plan.id}
                  href={`/pets/${plan.pets?.id}/care-plans/${plan.id}`}
                  className={styles.carePlanCard}
                >
                  <div className={styles.carePlanCardHeader}>
                    <span className={styles.carePlanTitle}>{plan.title}</span>
                    <Badge variant="info" size="sm">Active</Badge>
                  </div>
                  <p className={styles.carePlanPet}>
                    {plan.pets?.name} &middot; Dr. {plan.vet?.full_name || 'Unknown'}
                  </p>
                  {plan.totalSteps > 0 && (
                    <div className={styles.carePlanProgress}>
                      <div className={styles.carePlanProgressBar}>
                        <div
                          className={styles.carePlanProgressFill}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className={styles.carePlanProgressText}>
                        {plan.completedSteps}/{plan.totalSteps}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Consultations */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Consultations</h2>
          {recentConsultations.length > 0 && (
            <Link href="/consultations" className={styles.viewAllLink}>
              View All
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>

        {recentConsultations.length > 0 ? (
          <div className={styles.consultationsList}>
            {recentConsultations.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{tEmpty('noConsultations')}</p>
            <Link href="/connect">
              <Button variant="secondary" size="sm">
                {tConsultation('startConsultation')}
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
