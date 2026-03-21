'use client';

import { useState } from 'react';
import styles from './PackPurchaseFlow.module.css';
import { cn } from '@/lib/utils';
import type { PackSize } from '@/types';
import { PACK_UNIT_PRICE, PACK_PRICING } from '@/types';

interface PackPurchaseFlowProps {
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

const packOptions: { size: PackSize; label: string }[] = [
  { size: 3, label: 'Pack of 3' },
  { size: 5, label: 'Pack of 5' },
  { size: 10, label: 'Pack of 10' },
];

export function PackPurchaseFlow({ onClose, onPurchaseComplete }: PackPurchaseFlowProps) {
  const [selectedSize, setSelectedSize] = useState<PackSize | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!selectedSize) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/packs/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize: selectedSize }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to purchase pack');
        return;
      }

      // In dev mode, pack is created immediately
      if (data.devMode) {
        onPurchaseComplete?.();
        onClose();
        return;
      }

      // In production, redirect to payment gateway
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Buy Consultation Pack</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className={styles.subtitle}>
          Save more with larger packs. Credits can be used for any pet.
        </p>

        <div className={styles.options}>
          {packOptions.map(({ size, label }) => {
            const pricing = PACK_PRICING[size];
            const basePrice = PACK_UNIT_PRICE * size;
            const savings = basePrice - pricing.totalPrice;
            const isSelected = selectedSize === size;

            return (
              <button
                key={size}
                className={cn(styles.option, isSelected && styles.selected)}
                onClick={() => setSelectedSize(size)}
              >
                <div className={styles.optionHeader}>
                  <span className={styles.optionLabel}>{label}</span>
                  <span className={styles.optionDiscount}>{pricing.discount}% off</span>
                </div>
                <div className={styles.optionPrice}>
                  <span className={styles.optionTotal}>
                    {pricing.totalPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </span>
                  <span className={styles.optionBase}>
                    {basePrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className={styles.optionSavings}>
                  Save {savings.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </div>
                <div className={styles.optionPerUnit}>
                  {Math.round(pricing.totalPrice / size).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} per consultation
                </div>
              </button>
            );
          })}
        </div>

        <div className={styles.singleInfo}>
          Single consultation: {PACK_UNIT_PRICE.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={styles.purchaseButton}
            onClick={handlePurchase}
            disabled={!selectedSize || loading}
          >
            {loading ? 'Processing...' : selectedSize ? `Buy Pack of ${selectedSize}` : 'Select a pack'}
          </button>
        </div>
      </div>
    </div>
  );
}
