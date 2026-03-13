'use client';

import { useState } from 'react';
import { PackCard } from './PackCard';
import { PackPurchaseFlow } from './PackPurchaseFlow';
import type { PackStatus } from '@/types';
import styles from './PackSection.module.css';

interface PackData {
  id: string;
  pack_size: number;
  remaining_count: number;
  total_consultations: number;
  total_price: number;
  discount_percent: number;
  status: PackStatus;
  purchased_at: string;
  expires_at: string | null;
}

interface PackSectionProps {
  packs: PackData[];
}

export function PackSection({ packs }: PackSectionProps) {
  const [showPurchase, setShowPurchase] = useState(false);

  const activePacks = packs.filter((p) => p.status === 'active');
  const totalCredits = activePacks.reduce((sum, p) => sum + p.remaining_count, 0);

  return (
    <>
      {activePacks.length > 0 ? (
        <div className={styles.packsList}>
          {activePacks.map((pack) => (
            <PackCard
              key={pack.id}
              id={pack.id}
              packSize={pack.pack_size}
              remainingCount={pack.remaining_count}
              totalConsultations={pack.total_consultations}
              totalPrice={pack.total_price}
              discountPercent={pack.discount_percent}
              status={pack.status}
              purchasedAt={pack.purchased_at}
              expiresAt={pack.expires_at}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No active packs. Buy a consultation pack to save on future visits.</p>
        </div>
      )}

      <div className={styles.actions}>
        {totalCredits > 0 && (
          <span className={styles.creditSummary}>
            {totalCredits} credit{totalCredits !== 1 ? 's' : ''} available
          </span>
        )}
        <button
          className={styles.buyButton}
          onClick={() => setShowPurchase(true)}
        >
          Buy a Pack
        </button>
      </div>

      {showPurchase && (
        <PackPurchaseFlow
          onClose={() => setShowPurchase(false)}
          onPurchaseComplete={() => {
            setShowPurchase(false);
            // Refresh the page to show updated packs
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
