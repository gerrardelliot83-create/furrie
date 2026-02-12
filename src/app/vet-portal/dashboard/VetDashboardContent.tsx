'use client';

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { VetStatusToggle } from '@/components/vet/VetStatusToggle';
import { VetQuickStats, type VetQuickStatsRef } from '@/components/vet/VetQuickStats';
import { TodaySchedulePanel } from '@/components/vet/TodaySchedulePanel';
import { RecentConsultationsList, type RecentConsultationsListRef } from '@/components/vet/RecentConsultationsList';
import { useVetDashboardRealtime } from '@/hooks/useVetDashboardRealtime';
import type { Consultation } from '@/types';
import styles from './VetDashboard.module.css';

interface ConsultationWithRelations extends Consultation {
  pet?: {
    id: string;
    name: string;
    species: 'dog' | 'cat';
    breed: string;
  };
  customer?: {
    id: string;
    fullName: string;
  };
}

interface VetDashboardContentProps {
  vetId: string;
  vetName: string;
  isAvailable: boolean;
  stats: {
    todayConsultations: number;
    weekConsultations: number;
    totalConsultations: number;
    averageRating: number;
  };
  recentConsultations: ConsultationWithRelations[];
}

export function VetDashboardContent({
  vetId,
  vetName,
  isAvailable,
  stats,
  recentConsultations,
}: VetDashboardContentProps) {
  const t = useTranslations('nav');
  const statsRef = useRef<VetQuickStatsRef>(null);
  const listRef = useRef<RecentConsultationsListRef>(null);

  const handleConsultationChange = useCallback(() => {
    statsRef.current?.refresh();
    listRef.current?.refresh();
  }, []);

  useVetDashboardRealtime({
    vetId,
    onConsultationChange: handleConsultationChange,
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t('dashboard')}</h1>
          <p className={styles.welcome}>Welcome back, Dr. {vetName}</p>
        </div>
        <div className={styles.headerRight}>
          <VetStatusToggle vetId={vetId} initialStatus={isAvailable} />
        </div>
      </header>

      <section className={styles.statsSection}>
        <VetQuickStats
          ref={statsRef}
          vetId={vetId}
          initialStats={stats}
        />
      </section>

      <div className={styles.mainContent}>
        <section className={styles.scheduleSection}>
          <TodaySchedulePanel vetId={vetId} />
        </section>

        <section className={styles.consultationsSection}>
          <RecentConsultationsList
            ref={listRef}
            vetId={vetId}
            initialConsultations={recentConsultations}
          />
        </section>
      </div>
    </div>
  );
}
