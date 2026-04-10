/**
 * ConsultationBalanceCard — compact credit indicator shown on the
 * customer dashboard unconditionally (not gated by ENABLE_PAYMENTS).
 *
 * Three states:
 *   1. Has credits → show count + "Book a consultation" CTA.
 *   2. Zero credits, no pending request → show 0 + "Request more" CTA.
 *   3. Zero credits, pending request → show "Request submitted" badge.
 *
 * This is a server component that receives pre-fetched data.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CreditBalance } from '@/lib/credits/getActiveCreditBalance';
import styles from './ConsultationBalanceCard.module.css';

interface Props {
  balance: CreditBalance;
  isPlusUser?: boolean;
}

export function ConsultationBalanceCard({ balance, isPlusUser }: Props) {
  // Plus users have unlimited consultations — don't show the credit card.
  if (isPlusUser) return null;

  const { totalCredits, activePacks, hasPendingRequest, pendingRequestQuantity } = balance;
  const hasCredits = totalCredits > 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.creditCount}>{totalCredits}</span>
        <span className={styles.creditLabel}>
          consultation{totalCredits === 1 ? '' : 's'} available
        </span>
      </div>

      {hasCredits && activePacks > 0 && (
        <p className={styles.subtitle}>
          from {activePacks} active pack{activePacks === 1 ? '' : 's'}
        </p>
      )}

      {!hasCredits && hasPendingRequest && (
        <div className={styles.pendingBadge}>
          Request submitted for {pendingRequestQuantity} consultation
          {pendingRequestQuantity === 1 ? '' : 's'} — our team will reach out shortly
        </div>
      )}

      <div className={styles.actions}>
        {hasCredits ? (
          <Link href="/connect">
            <Button variant="primary" size="sm">
              Book a consultation
            </Button>
          </Link>
        ) : !hasPendingRequest ? (
          <Link href="/connect?requestCredits=true">
            <Button variant="primary" size="sm">
              Request more consultations
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
