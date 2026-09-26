/**
 * ConsultationBalanceCard — credit indicator on the customer dashboard.
 *
 * States (L1, 2026-09-25):
 *   1. Has credits → count (+ soonest expiry) + "Book a consultation" and "Buy more".
 *   2. No credits, order waiting for payment → "Finish paying" (to /buy).
 *   3. No credits, order marked paid → "We're checking your payment".
 *   4. No credits, request from before online payment → note + "Buy consultations".
 *   5. No credits, nothing open → "Buy consultations".
 *
 * This is a server component that receives pre-fetched data.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CreditBalance } from '@/lib/credits/getActiveCreditBalance';
import { formatInr, packLabel } from '@/lib/pricing/packs';
import styles from './ConsultationBalanceCard.module.css';

interface Props {
  balance: CreditBalance;
  isPlusUser?: boolean;
}

function istDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });
}

export function ConsultationBalanceCard({ balance, isPlusUser }: Props) {
  // Plus users have unlimited consultations — don't show the credit card.
  if (isPlusUser) return null;

  const { totalCredits, soonestExpiry, openRequest } = balance;
  const hasCredits = totalCredits > 0;
  const priced = openRequest && !openRequest.isLegacy ? openRequest : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.creditCount}>{totalCredits}</span>
        <span className={styles.creditLabel}>
          consultation{totalCredits === 1 ? '' : 's'} available
        </span>
      </div>

      {hasCredits && soonestExpiry && (
        <p className={styles.subtitle}>A free credit expires on {istDate(soonestExpiry)}.</p>
      )}

      {priced && priced.claimedAt && (
        <div className={styles.pendingBadge}>
          We&apos;re checking your payment for order {priced.reference}. You&apos;ll get an email when
          your consultations are ready.
        </div>
      )}

      {priced && !priced.claimedAt && (
        <div className={styles.pendingBadge}>
          Order {priced.reference} ({packLabel(priced.packSize ?? priced.quantity)}
          {priced.amount !== null ? `, ${formatInr(priced.amount)}` : ''}) is waiting for your payment.
        </div>
      )}

      {openRequest?.isLegacy && !hasCredits && (
        <p className={styles.subtitle}>
          You asked us earlier for {packLabel(openRequest.quantity)}. You can now buy directly.
        </p>
      )}

      <div className={styles.actions}>
        {hasCredits && (
          <Link href="/connect">
            <Button variant="primary" size="sm">
              Book a consultation
            </Button>
          </Link>
        )}
        {priced && !priced.claimedAt ? (
          <Link href="/buy">
            <Button variant={hasCredits ? 'secondary' : 'primary'} size="sm">
              Finish paying
            </Button>
          </Link>
        ) : !priced ? (
          <Link href="/buy">
            <Button variant={hasCredits ? 'secondary' : 'primary'} size="sm">
              {hasCredits ? 'Buy more' : 'Buy consultations'}
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
