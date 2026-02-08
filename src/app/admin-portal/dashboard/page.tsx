import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KPICard } from '@/components/admin/KPICard';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { getDashboardStats, formatCurrency } from '@/lib/admin/stats';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('dashboard')}`,
  };
}

export default async function AdminDashboard() {
  const t = await getTranslations('nav');
  const stats = await getDashboardStats();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin {t('dashboard')}</h1>

      <div className={styles.kpiGrid}>
        <KPICard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon="users"
        />
        <KPICard
          label="Active Vets"
          value={stats.activeVets.toLocaleString()}
          icon="vets"
        />
        <KPICard
          label="Today's Consultations"
          value={stats.todayConsultations.toLocaleString()}
          icon="consultations"
        />
        <KPICard
          label="Revenue (This Month)"
          value={formatCurrency(stats.monthRevenue)}
          icon="revenue"
        />
      </div>

      <div className={styles.panels}>
        <Card className={styles.activityCard}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={stats.recentActivity} />
          </CardContent>
        </Card>

        <Card className={styles.quickActions}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.actionList}>
              <a href="/users" className={styles.actionLink}>
                <span className={styles.actionIcon}>
                  <UsersIcon />
                </span>
                <span>Manage Users</span>
              </a>
              <a href="/vets" className={styles.actionLink}>
                <span className={styles.actionIcon}>
                  <VetsIcon />
                </span>
                <span>Manage Vets</span>
              </a>
              <a href="/consultations" className={styles.actionLink}>
                <span className={styles.actionIcon}>
                  <ConsultationsIcon />
                </span>
                <span>View Consultations</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function VetsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function ConsultationsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
