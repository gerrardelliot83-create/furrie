import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('dashboard')}`,
  };
}

export default async function AdminDashboard() {
  const t = await getTranslations('nav');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
        Admin {t('dashboard')}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <Card>
          <CardContent>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Total Users
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
              0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Active Vets
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
              0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Today&apos;s Consultations
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
              0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Revenue (This Month)
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginTop: 'var(--space-2)' }}>
              0
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No recent activity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
