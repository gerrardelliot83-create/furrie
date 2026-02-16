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

  // Fetch active Plus subscriptions for the user's pets
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('pet_id, plan_type, status, expires_at')
    .eq('customer_id', user.id)
    .eq('status', 'active')
    .eq('plan_type', 'plus');

  const now = new Date();
  const plusPetIds = (subscriptions || [])
    .filter((sub) => {
      if (!sub.expires_at) return true; // NULL = indefinite
      return new Date(sub.expires_at) > now;
    })
    .map((sub) => sub.pet_id as string);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('directConnect')}</h1>
        <p className={styles.pageDescription}>
          Get instant video consultation with a licensed veterinarian
        </p>
      </header>

      <ConnectFlow initialPets={pets} plusPetIds={plusPetIds} />
    </div>
  );
}
