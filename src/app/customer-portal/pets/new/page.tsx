import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PetForm } from '@/components/customer/PetForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pets');
  return {
    title: t('addPet'),
  };
}

export default async function NewPetPage() {
  const t = await getTranslations('pets');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link
          href="/pets"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            transition: 'background var(--transition-fast)',
          }}
          aria-label="Back to pets"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, margin: 0 }}>
          {t('addPet')}
        </h1>
      </div>

      <PetForm mode="create" />
    </div>
  );
}
