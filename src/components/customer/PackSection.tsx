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

  const totalUsed = activePacks.reduce((sum, p) => sum + (p.total_consultations - p.remaining_count), 0);
  const totalPurchased = activePacks.reduce((sum, p) => sum + p.total_consultations, 0);

  return (
    <>
      {/* Usage Summary */}
      {activePacks.length > 0 && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
            </svg>
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLabel}>Credits available</div>
            <div className={styles.summaryValue}>
              <span className={styles.summaryValueHighlight}>{totalCredits}</span> of {totalPurchased} remaining ({totalUsed} used)
            </div>
          </div>
        </div>
      )}

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
          {activePacks.length > 0 ? 'Buy More Credits' : 'Buy a Pack'}
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
