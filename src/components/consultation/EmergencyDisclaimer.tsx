'use client';

import { cn } from '@/lib/utils';
import styles from './EmergencyDisclaimer.module.css';

interface EmergencyDisclaimerProps {
  petName: string;
  visible: boolean;
  className?: string;
}

export function EmergencyDisclaimer({
  petName,
  visible,
  className,
}: EmergencyDisclaimerProps) {
  if (!visible) return null;

  return (
    <div className={cn(styles.container, className)} role="alert">
      <div className={styles.icon}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div className={styles.content}>
        <p className={styles.title}>Emergency Warning</p>
        <p className={styles.message}>
          If {petName} is experiencing a medical emergency such as severe breathing
          difficulty, collapse, or seizures, please visit the nearest veterinary
          clinic immediately. Teleconsultation may not be appropriate for emergencies.
        </p>
      </div>
    </div>
  );
}
