import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/Card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('vets')}`,
  };
}

export default async function AdminVetsPage() {
  const t = await getTranslations('nav');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
        {t('vets')}
      </h1>

      <Card>
        <CardContent>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Vet management will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
