import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/components/layouts/AuthLayout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: `${t('login')} - Admin Portal`,
  };
}

export default async function AdminLoginPage() {
  const t = await getTranslations('auth');

  return (
    <AuthLayout>
      <div>
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
            Admin Portal
          </span>
        </div>

        <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          {t('login')}
        </h1>

        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            name="email"
            type="email"
            label={t('email')}
            placeholder="admin@furrie.in"
            autoComplete="email"
          />

          <Input
            name="password"
            type="password"
            label={t('password')}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary">
            {t('login')}
          </Button>
        </form>

        <div style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)'
          }}>
            Admin accounts are internally provisioned.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
