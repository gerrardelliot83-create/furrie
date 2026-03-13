'use client';

import styles from './PackCard.module.css';
import { cn } from '@/lib/utils';
import type { PackStatus } from '@/types';

interface PackCardProps {
  id: string;
  packSize: number;
  remainingCount: number;
  totalConsultations: number;
  totalPrice: number;
  discountPercent: number;
  status: PackStatus;
  purchasedAt: string;
  expiresAt: string | null;
  className?: string;
  onClick?: () => void;
}

const statusLabels: Record<PackStatus, string> = {
  active: 'Active',
  exhausted: 'Used Up',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export function PackCard({
  packSize,
  remainingCount,
  totalConsultations,
  totalPrice,
  discountPercent,
  status,
  purchasedAt,
  expiresAt,
  className,
  onClick,
}: PackCardProps) {
  const isActive = status === 'active';

  return (
    <div
      className={cn(styles.card, !isActive && styles.inactive, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.header}>
        <div className={styles.packLabel}>Pack of {packSize}</div>
        <div className={cn(styles.status, styles[`status_${status}`])}>
          {statusLabels[status]}
        </div>
      </div>

      <div className={styles.credits}>
        <span className={styles.remaining}>{remainingCount}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.total}>{totalConsultations}</span>
        <span className={styles.label}>credits remaining</span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((totalConsultations - remainingCount) / totalConsultations) * 100}%` }}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.price}>
          {totalPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
          {discountPercent > 0 && (
            <span className={styles.discount}>{discountPercent}% off</span>
          )}
        </div>
        <div className={styles.date}>
          {new Date(purchasedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {expiresAt && (
            <span className={styles.expiry}>
              {' '}· Expires {new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
