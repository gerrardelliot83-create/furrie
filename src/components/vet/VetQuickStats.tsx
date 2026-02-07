'use client';

import { Card, CardContent } from '@/components/ui/Card';
import styles from './VetQuickStats.module.css';

interface VetQuickStatsProps {
  todayConsultations: number;
  weekConsultations: number;
  totalConsultations: number;
  averageRating: number;
}

export function VetQuickStats({
  todayConsultations,
  weekConsultations,
  totalConsultations,
  averageRating,
}: VetQuickStatsProps) {
  const formatRating = (rating: number) => {
    if (rating === 0) return '--';
    return rating.toFixed(1);
  };

  return (
    <div className={styles.grid}>
      <Card>
        <CardContent>
          <p className={styles.label}>Today&apos;s Consultations</p>
          <p className={styles.value}>{todayConsultations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className={styles.label}>This Week</p>
          <p className={styles.value}>{weekConsultations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className={styles.label}>Total Consultations</p>
          <p className={styles.value}>{totalConsultations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className={styles.label}>Average Rating</p>
          <div className={styles.ratingContainer}>
            <p className={styles.value}>{formatRating(averageRating)}</p>
            {averageRating > 0 && <span className={styles.ratingIcon}>/ 5</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
