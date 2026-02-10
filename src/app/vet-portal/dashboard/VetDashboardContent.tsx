'use client';

import { useTranslations } from 'next-intl';
import { VetStatusToggle } from '@/components/vet/VetStatusToggle';
import { VetQuickStats } from '@/components/vet/VetQuickStats';
import { TodaySchedulePanel } from '@/components/vet/TodaySchedulePanel';
import { RecentConsultationsList } from '@/components/vet/RecentConsultationsList';
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
          todayConsultations={stats.todayConsultations}
          weekConsultations={stats.weekConsultations}
          totalConsultations={stats.totalConsultations}
          averageRating={stats.averageRating}
        />
      </section>

      <div className={styles.mainContent}>
        <section className={styles.scheduleSection}>
          <TodaySchedulePanel vetId={vetId} />
        </section>

        <section className={styles.consultationsSection}>
          <RecentConsultationsList consultations={recentConsultations} />
        </section>
      </div>
    </div>
  );
}
