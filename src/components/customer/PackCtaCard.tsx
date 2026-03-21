'use client';

import { useState } from 'react';
import { PackPurchaseFlow } from './PackPurchaseFlow';
import type { PackStatus } from '@/types';
import { PACK_PRICING } from '@/types';
import styles from './PackCtaCard.module.css';

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

interface PackCtaCardProps {
  packs: PackData[];
}

export function PackCtaCard({ packs }: PackCtaCardProps) {
  const [showPurchase, setShowPurchase] = useState(false);

  const activePacks = packs.filter((p) => p.status === 'active');
  const totalCredits = activePacks.reduce((sum, p) => sum + p.remaining_count, 0);
  const hasActivePacks = activePacks.length > 0;

  const lowestPerUnit = Math.round(PACK_PRICING[3].totalPrice / 3);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
            </svg>
          </div>

          {hasActivePacks ? (
            <>
              <h2 className={styles.title}>Your Consultation Packs</h2>
              <div className={styles.creditBadge}>
                <span className={styles.creditNumber}>{totalCredits}</span>
                <span>credit{totalCredits !== 1 ? 's' : ''} remaining</span>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.title}>Consultation Packs</h2>
              <p className={styles.description}>
                Save up to 50% on consultations with multi-visit packs
              </p>
              <p className={styles.savings}>
                Starting from {lowestPerUnit.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}/consultation
              </p>
            </>
          )}
        </div>

        <button
          className={styles.button}
          onClick={() => setShowPurchase(true)}
        >
          {hasActivePacks ? 'Buy More Credits' : 'View Packs'}
        </button>
      </div>

      {showPurchase && (
        <PackPurchaseFlow
          onClose={() => setShowPurchase(false)}
          onPurchaseComplete={() => {
            setShowPurchase(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
