import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { PetForm } from '@/components/customer/PetForm';

interface EditPetPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPetPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('pets')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: data?.name ? `Edit ${data.name}` : 'Edit Pet',
  };
}

export default async function EditPetPage({ params }: EditPetPageProps) {
  const { id } = await params;
  const t = await getTranslations('pets');
  const supabase = await createClient();

  // Fetch pet
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const pet = mapPetFromDB(data);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link
          href={`/pets/${pet.id}`}
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
          aria-label="Back to pet profile"
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
          {t('editPet')}
        </h1>
      </div>

      <PetForm pet={pet} mode="edit" />
    </div>
  );
}
