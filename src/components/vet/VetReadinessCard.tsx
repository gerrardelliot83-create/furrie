'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { VET_AVAILABILITY_CHANGED_EVENT } from '@/components/layouts/VetLayout/vetEvents';
import styles from './VetReadinessCard.module.css';

interface VetReadinessCardProps {
  hasHours: boolean;
  isAvailable: boolean;
}

/**
 * Shown on the vet dashboard until customers can actually book this vet
 * (C-06): weekly hours saved AND Available on. Either one missing means no
 * bookable times.
 */
export function VetReadinessCard({ hasHours, isAvailable: initialAvailable }: VetReadinessCardProps) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);

  useEffect(() => {
    const onAvailability = (event: Event) => {
      const detail = (event as CustomEvent<{ isAvailable: boolean }>).detail;
      if (detail && typeof detail.isAvailable === 'boolean') setIsAvailable(detail.isAvailable);
    };
    window.addEventListener(VET_AVAILABILITY_CHANGED_EVENT, onAvailability);
    return () => window.removeEventListener(VET_AVAILABILITY_CHANGED_EVENT, onAvailability);
  }, []);

  if (hasHours && isAvailable) return null;

  return (
    <Card>
      <CardContent>
        <h2 className={styles.title}>Before customers can book you</h2>
        <p className={styles.subtitle}>Customers see your times only when both steps are done.</p>
        <ul className={styles.list}>
          <li className={hasHours ? styles.done : styles.todo}>
            <span className={styles.mark} aria-hidden="true">{hasHours ? '✓' : '1'}</span>
            <span>
              {hasHours ? (
                'Weekly hours saved'
              ) : (
                <>
                  <Link href="/schedule" className={styles.link}>
                    Set your weekly hours
                  </Link>{' '}
                  (India time)
                </>
              )}
            </span>
          </li>
          <li className={isAvailable ? styles.done : styles.todo}>
            <span className={styles.mark} aria-hidden="true">{isAvailable ? '✓' : '2'}</span>
            <span>{isAvailable ? 'Available is on' : 'Turn on Available with the switch at the top of this page'}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
