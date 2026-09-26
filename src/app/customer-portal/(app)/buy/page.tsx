import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { FEATURES } from '@/lib/config/features';
import { PACK_QUOTES, packLabel } from '@/lib/pricing/packs';
import { PAYMENT_CHECK_PROMISE } from '@/lib/upi/config';
import { getActiveCreditBalance, EMPTY_CREDIT_BALANCE } from '@/lib/credits/getActiveCreditBalance';
import { loadBuyState } from '@/lib/credits/buyState';
import { BuyCredits } from '@/components/customer/BuyCredits/BuyCredits';
import styles from '../connect/ConnectPage.module.css';

export const metadata: Metadata = {
  title: 'Buy consultations',
  description: 'Buy Furrie consultations by UPI.',
};

export default async function BuyPage() {
  if (!FEATURES.ENABLE_PACK_REQUESTS) {
    notFound();
  }

  const { user, error: authError, supabase } = await getCurrentUser();
  if (authError || !user) {
    redirect('/login?redirectTo=/buy');
  }

  const [{ data: profile }, balance] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    getActiveCreditBalance(supabase, user.id).catch(() => EMPTY_CREDIT_BALANCE),
  ]);

  const buyState = await loadBuyState(supabase, user.id, {
    name: profile?.full_name,
    email: profile?.email ?? user.email,
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Buy consultations</h1>
        <p className={styles.pageDescription}>
          {balance.totalCredits > 0
            ? `You have ${packLabel(balance.totalCredits)} available.`
            : 'Each consultation is a video call with a registered vet.'}
        </p>
      </header>
      <BuyCredits
        quotes={PACK_QUOTES}
        initialRequest={buyState.initialRequest}
        legacyQuantity={buyState.legacyQuantity}
        promise={PAYMENT_CHECK_PROMISE}
      />
    </div>
  );
}
