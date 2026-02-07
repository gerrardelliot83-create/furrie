import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { ConnectFlow } from './ConnectFlow';
import styles from './ConnectPage.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: t('directConnect'),
    description: 'Connect with a licensed veterinarian for an instant video consultation',
  };
}

export default async function ConnectPage() {
  const t = await getTranslations('consultation');
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirectTo=/connect');
  }

  // Fetch user's pets
  const { data: petsData, error: petsError } = await supabase
    .from('pets')
    .select('*')
    .order('created_at', { ascending: false });

  if (petsError) {
    console.error('Error fetching pets:', petsError);
  }

  const pets = (petsData || []).map(mapPetFromDB);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('directConnect')}</h1>
        <p className={styles.pageDescription}>
          Get instant video consultation with a licensed veterinarian
        </p>
      </header>

      <ConnectFlow initialPets={pets} />
    </div>
  );
}
