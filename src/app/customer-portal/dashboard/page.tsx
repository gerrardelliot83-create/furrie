import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { Button } from '@/components/ui/Button';
import { ConsultationCard } from '@/components/consultation';
import styles from './Dashboard.module.css';

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

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name || 'there';
  const greeting = getGreeting();

  // Fetch user's pets (limit 4 for dashboard)
  const { data: petsData } = await supabase
    .from('pets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4);

  const pets = (petsData || []).map(mapPetFromDB);

  // Fetch upcoming consultations (pending, matching, matched, scheduled)
  const { data: upcomingData } = await supabase
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
    .in('status', ['pending', 'matching', 'matched', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(3);

  const upcomingConsultations = (upcomingData || []).map((row) =>
    mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
  );

  // Fetch recent completed consultations
  const { data: recentData } = await supabase
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
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(3);

  const recentConsultations = (recentData || []).map((row) =>
    mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
  );

  return (
    <div className={styles.container}>
      {/* Greeting */}
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {greeting}, {userName.split(' ')[0]}!
        </h1>
      </header>

      {/* Quick Connect CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Connect with a Vet Now</h2>
            <p className={styles.ctaDescription}>
              Get instant video consultation with a licensed veterinarian
            </p>
          </div>
          <Link href="/connect">
            <Button variant="accent" size="lg">
              {tConsultation('startConsultation')}
            </Button>
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
            </Link>
          )}
        </div>

        {pets.length > 0 ? (
          <div className={styles.petsScroll}>
            {pets.map((pet) => (
              <Link key={pet.id} href={`/pets/${pet.id}`} className={styles.petCard}>
                <div className={styles.petAvatar}>
                  {pet.photoUrls?.[0] ? (
                    <Image
                      src={pet.photoUrls[0]}
                      alt={pet.name}
                      width={64}
                      height={64}
                      className={styles.petImage}
                    />
                  ) : (
                    <div className={styles.petFallback}>
                      {pet.species === 'dog' ? (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
                          <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
                        </svg>
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z" />
                        </svg>
                      )}
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
          </div>
          <div className={styles.consultationsList}>
            {upcomingConsultations.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
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
