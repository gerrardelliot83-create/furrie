import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PetList } from './PetList';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pets');
  return {
    title: t('myPets'),
  };
}

export default async function PetsPage() {
  const t = await getTranslations('pets');
  const tEmpty = await getTranslations('empty');
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch pets
  let pets: Awaited<ReturnType<typeof mapPetFromDB>>[] = [];
  if (user) {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      pets = data.map(mapPetFromDB);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
          {t('myPets')}
        </h1>
        <Link href="/pets/new">
          <Button variant="primary">{t('addPet')}</Button>
        </Link>
      </div>

      {pets.length === 0 ? (
        <Card>
          <CardContent>
            <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                {tEmpty('noPets')}
              </p>
              <Link href="/pets/new">
                <Button variant="secondary">{t('addFirstPet')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PetList initialPets={pets} />
      )}
    </div>
  );
}
