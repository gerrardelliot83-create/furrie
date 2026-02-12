'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import styles from './VetQuickStats.module.css';

interface VetQuickStatsProps {
  vetId: string;
  initialStats: {
    todayConsultations: number;
    weekConsultations: number;
    totalConsultations: number;
    averageRating: number;
  };
}

export interface VetQuickStatsRef {
  refresh: () => Promise<void>;
}

export const VetQuickStats = forwardRef<VetQuickStatsRef, VetQuickStatsProps>(
  function VetQuickStats({ vetId, initialStats }, ref) {
    const [stats, setStats] = useState(initialStats);

    const refresh = useCallback(async () => {
      const supabase = createClient();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const [
        todayActiveResult,
        todayCompletedResult,
        weekActiveResult,
        weekCompletedResult,
        vetProfileResult,
      ] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('vet_id', vetId)
          .gte('created_at', todayStart.toISOString())
          .eq('status', 'active'),
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('vet_id', vetId)
          .gte('created_at', todayStart.toISOString())
          .eq('status', 'closed')
          .eq('outcome', 'success'),
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('vet_id', vetId)
          .gte('created_at', weekStart.toISOString())
          .eq('status', 'active'),
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('vet_id', vetId)
          .gte('created_at', weekStart.toISOString())
          .eq('status', 'closed')
          .eq('outcome', 'success'),
        supabase
          .from('vet_profiles')
          .select('consultation_count, average_rating')
          .eq('id', vetId)
          .single(),
      ]);

      const todayCount = (todayActiveResult.count || 0) + (todayCompletedResult.count || 0);
      const weekCount = (weekActiveResult.count || 0) + (weekCompletedResult.count || 0);

      setStats({
        todayConsultations: todayCount,
        weekConsultations: weekCount,
        totalConsultations: vetProfileResult.data?.consultation_count || stats.totalConsultations,
        averageRating: vetProfileResult.data?.average_rating || stats.averageRating,
      });
    }, [vetId, stats.totalConsultations, stats.averageRating]);

    useImperativeHandle(ref, () => ({ refresh }));

    const formatRating = (rating: number) => {
      if (rating === 0) return '--';
      return rating.toFixed(1);
    };

    return (
      <div className={styles.grid}>
        <Card>
          <CardContent>
            <p className={styles.label}>Today&apos;s Consultations</p>
            <p className={styles.value}>{stats.todayConsultations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className={styles.label}>This Week</p>
            <p className={styles.value}>{stats.weekConsultations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className={styles.label}>Total Consultations</p>
            <p className={styles.value}>{stats.totalConsultations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className={styles.label}>Average Rating</p>
            <div className={styles.ratingContainer}>
              <p className={styles.value}>{formatRating(stats.averageRating)}</p>
              {stats.averageRating > 0 && <span className={styles.ratingIcon}>/ 5</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);
