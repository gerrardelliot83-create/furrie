import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { AuthLayout } from '@/components/layouts/AuthLayout';
import { VetLoginForm } from '@/components/vet/VetLoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: `${t('login')} - Vet Portal`,
  };
}

function VetLoginFormFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px'
    }}>
      <span>Loading...</span>
    </div>
  );
}

export default async function VetLoginPage() {
  return (
    <AuthLayout>
      <div style={{
        marginBottom: 'var(--space-6)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center'
      }}>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          color: 'var(--color-text-secondary)'
        }}>
          Vet Portal
        </span>
      </div>

      <Suspense fallback={<VetLoginFormFallback />}>
        <VetLoginForm />
      </Suspense>
    </AuthLayout>
  );
}
