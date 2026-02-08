import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthLayout } from '@/components/layouts/AuthLayout';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { Skeleton } from '@/components/ui/Skeleton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: `${t('login')} - ${t('adminLoginTitle')}`,
  };
}

function AdminLoginFormFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Skeleton variant="rect" height={48} width="100%" />
      <Skeleton variant="text" height={28} width="60%" />
      <Skeleton variant="text" height={16} width="80%" />
      <Skeleton variant="rect" height={48} width="100%" />
      <Skeleton variant="rect" height={48} width="100%" />
      <Skeleton variant="rect" height={48} width="100%" />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AdminLoginFormFallback />}>
        <AdminLoginForm />
      </Suspense>
    </AuthLayout>
  );
}
