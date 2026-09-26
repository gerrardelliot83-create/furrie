import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { FEATURES } from '@/lib/config/features';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { getActiveCreditBalance, EMPTY_CREDIT_BALANCE } from '@/lib/credits/getActiveCreditBalance';
import { loadBuyState } from '@/lib/credits/buyState';
import { PACK_QUOTES } from '@/lib/pricing/packs';
import { PAYMENT_CHECK_PROMISE } from '@/lib/upi/config';
import { BuyCredits } from '@/components/customer/BuyCredits/BuyCredits';
import { ConnectFlow } from './ConnectFlow';
import styles from './ConnectPage.module.css';

export const metadata: Metadata = {
  title: 'Book a consultation',
  description: 'Book a video consultation with a registered vet.',
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ petId?: string }>;
}) {
  const { petId: preselectedPetId } = await searchParams;
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login?redirectTo=/connect');
  }

  // Fire all independent queries in parallel. Per audit F-14.
  const subscriptionsQuery = FEATURES.ENABLE_SUBSCRIPTIONS
    ? supabase
        .from('subscriptions')
        .select('pet_id, plan_type, status, expires_at')
        .eq('customer_id', user.id)
        .eq('status', 'active')
        .eq('plan_type', 'plus')
    : Promise.resolve({ data: [] as Array<{ pet_id: string; plan_type: string; status: string; expires_at: string | null }> });

  const [petsResult, subscriptionsResult, balance] = await Promise.all([
    supabase.from('pets').select('*').order('created_at', { ascending: false }),
    subscriptionsQuery,
    getActiveCreditBalance(supabase, user.id).catch(() => EMPTY_CREDIT_BALANCE),
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

  const totalCredits = balance.totalCredits;

  // No credit (and no Plus): offer to buy instead of walking through a booking
  // the server would refuse (L1).
  if (totalCredits === 0 && plusPetIds.length === 0 && FEATURES.ENABLE_PACK_REQUESTS) {
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
    const buyState = await loadBuyState(supabase, user.id, {
      name: profile?.full_name,
      email: profile?.email ?? user.email,
    });
    return (
      <div className={styles.pageContainer}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Book a consultation</h1>
          <p className={styles.pageDescription}>
            Each booking uses one consultation credit.
          </p>
        </header>
        <BuyCredits
          quotes={PACK_QUOTES}
          initialRequest={buyState.initialRequest}
          legacyQuantity={buyState.legacyQuantity}
          promise={PAYMENT_CHECK_PROMISE}
          heading="You need a consultation credit to book"
          intro="Buy one or more consultations by UPI. Once we have checked your payment, come back here and pick a time."
        />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Book a consultation</h1>
        <p className={styles.pageDescription}>
          Pick a time. A registered vet joins you on video.
        </p>
      </header>

      <ConnectFlow
        initialPets={pets}
        plusPetIds={plusPetIds}
        hasPackCredit={totalCredits > 0}
        packCreditsRemaining={totalCredits}
        preselectedPetId={preselectedPetId || null}
      />
    </div>
  );
}
