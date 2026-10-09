import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { FEATURES } from '@/lib/config/features';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { getActiveCreditBalance, EMPTY_CREDIT_BALANCE } from '@/lib/credits/getActiveCreditBalance';
import { loadBuyState } from '@/lib/credits/buyState';
import { PACK_QUOTES } from '@/lib/pricing/packs';
import { PAYMENT_CHECK_PROMISE } from '@/lib/upi/config';
import { BuyCredits } from '@/components/customer/BuyCredits/BuyCredits';
import { BookingConfirmation } from '@/components/consultation/BookingConfirmation';
import { ConnectFlow } from './ConnectFlow';
import styles from './ConnectPage.module.css';

export const metadata: Metadata = {
  title: 'Book a consultation',
  description: 'Book a video consultation with a registered vet.',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ConnectPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Book a consultation</h1>
        {/* One line for every state (CX-1): it used to switch to the
            no-credit text above the confirmation of the last credit. */}
        <p className={styles.pageDescription}>
          A registered vet joins you on video. Each booking uses one consultation credit.
        </p>
      </header>
      {children}
    </div>
  );
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ petId?: string; booked?: string }>;
}) {
  const { petId: preselectedPetId, booked } = await searchParams;
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login?redirectTo=/connect');
  }

  // The booking confirmation has its own address, /connect?booked=<id>
  // (CX-1). ConnectFlow goes there after booking, so the confirmation comes
  // from the server whatever the credit balance is now (booking the last
  // credit used to swap it for the buy screen), and going to /connect again,
  // from the menu or anywhere, starts a new booking.
  if (booked && UUID.test(booked)) {
    const { data: consultation } = await supabase
      .from('consultations')
      .select(
        'id, consultation_number, scheduled_at, status, pets!consultations_pet_id_fkey (name), profiles!consultations_vet_id_fkey (full_name)'
      )
      .eq('id', booked)
      .eq('customer_id', user.id)
      .maybeSingle();

    if (
      consultation?.scheduled_at &&
      ['pending', 'scheduled', 'active'].includes(consultation.status)
    ) {
      const pet = consultation.pets as unknown as { name: string } | null;
      const vet = consultation.profiles as unknown as { full_name: string } | null;
      return (
        <ConnectPageShell>
          <BookingConfirmation
            consultationId={consultation.id}
            consultationNumber={consultation.consultation_number}
            scheduledAt={consultation.scheduled_at}
            petName={pet?.name ?? 'your pet'}
            vetName={vet?.full_name ?? null}
          />
        </ConnectPageShell>
      );
    }
    // Not theirs, cancelled or unknown: carry on to a new booking.
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
      <ConnectPageShell>
        <BuyCredits
          quotes={PACK_QUOTES}
          initialRequest={buyState.initialRequest}
          legacyQuantity={buyState.legacyQuantity}
          promise={PAYMENT_CHECK_PROMISE}
          heading="You need a consultation credit to book"
          intro="Buy one or more consultations by UPI. Once we have checked your payment, come back here and pick a time."
        />
      </ConnectPageShell>
    );
  }

  return (
    <ConnectPageShell>
      {/* A new key on every server render of /connect (CX-1): a click on the
          menu's Connect while already here is a same-address navigation, and
          React would otherwise keep the old flow, half-finished or finished.
          Nothing on this page refreshes it mid-booking. */}
      <ConnectFlow
        key={crypto.randomUUID()}
        initialPets={pets}
        plusPetIds={plusPetIds}
        hasPackCredit={totalCredits > 0}
        packCreditsRemaining={totalCredits}
        preselectedPetId={preselectedPetId || null}
      />
    </ConnectPageShell>
  );
}
