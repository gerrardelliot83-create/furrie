import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { FEATURES } from '@/lib/config/features';
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

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ petId?: string; requestCredits?: string }>;
}) {
  const { petId: preselectedPetId, requestCredits } = await searchParams;
  const t = await getTranslations('consultation');
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login?redirectTo=/connect');
  }

  // Fire all independent queries in parallel. Per audit F-14.
  // Each await previously cost a separate Mumbai round-trip; Promise.all
  // collapses them into a single round-trip duration.
  const subscriptionsQuery = FEATURES.ENABLE_SUBSCRIPTIONS
    ? supabase
        .from('subscriptions')
        .select('pet_id, plan_type, status, expires_at')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .eq('plan_type', 'plus')
    : Promise.resolve({ data: [] as Array<{ pet_id: string; plan_type: string; status: string; expires_at: string | null }> });

  const [petsResult, subscriptionsResult, activePackResult, pendingConsultationResult] = await Promise.all([
    supabase.from('pets').select('*').order('created_at', { ascending: false }),
    subscriptionsQuery,
    supabase
      .from('consultation_packs')
      .select('id, remaining_count')
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .gt('remaining_count', 0)
      .order('purchased_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('consultations')
      .select('id, consultation_number, pet_id, scheduled_at, status')
      .eq('customer_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (petsResult.error) {
    console.error('Error fetching pets:', petsResult.error);
  }

  const pets = (petsResult.data || []).map(mapPetFromDB);

  const now = new Date();
  const plusPetIds = (subscriptionsResult.data || [])
    .filter((sub) => {
      if (!sub.expires_at) return true; // NULL = indefinite
      return new Date(sub.expires_at) > now;
    })
    .map((sub) => sub.pet_id as string);

  const activePack = activePackResult.data;
  const hasPackCredit = !!activePack && activePack.remaining_count > 0;
  const packCreditsRemaining = activePack?.remaining_count ?? 0;

  const pendingConsultation = pendingConsultationResult.data;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('directConnect')}</h1>
        <p className={styles.pageDescription}>
          Get instant video consultation with a licensed veterinarian
        </p>
      </header>

      <ConnectFlow
        initialPets={pets}
        plusPetIds={plusPetIds}
        hasPackCredit={hasPackCredit}
        packCreditsRemaining={packCreditsRemaining}
        preselectedPetId={preselectedPetId || null}
        openCreditRequestModal={requestCredits === 'true'}
        pendingConsultation={pendingConsultation ? {
          id: pendingConsultation.id,
          consultationNumber: pendingConsultation.consultation_number,
          petId: pendingConsultation.pet_id,
          scheduledAt: pendingConsultation.scheduled_at,
        } : undefined}
      />
    </div>
  );
}
