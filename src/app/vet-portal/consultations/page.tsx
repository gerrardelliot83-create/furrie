import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/Card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: `Vet ${t('consultations')}`,
  };
}

export default async function VetConsultationsPage() {
  const t = await getTranslations('consultation');
  const tEmpty = await getTranslations('empty');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
        {t('consultations')}
      </h1>

      <Card>
        <CardContent>
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {tEmpty('noConsultations')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
