import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { VaccinationTasksList } from './VaccinationTasksList';

export const metadata: Metadata = {
  title: 'Tasks - Vet Portal',
};

export default async function VetTasksPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is a vet
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  // Fetch pets with pending vaccination approvals
  const { data: petsWithPendingVaccinations } = await supabase
    .from('pets')
    .select(`
      id,
      name,
      species,
      breed,
      vaccination_history,
      profiles!pets_owner_id_fkey (
        id,
        full_name
      )
    `)
    .not('vaccination_history', 'is', null);

  // Filter to only show pending approvals
  const pendingApprovals: {
    petId: string;
    petName: string;
    petSpecies: 'dog' | 'cat';
    petBreed: string;
    ownerName: string;
    vaccinationName: string;
    vaccinationDate: string;
    nextDueDate: string | null;
    administeredBy: string | null;
    index: number;
  }[] = [];

  (petsWithPendingVaccinations || []).forEach((pet) => {
    const history = pet.vaccination_history as Array<{
      name: string;
      date: string;
      nextDueDate?: string;
      administeredBy?: string;
      status: 'pending_approval' | 'approved' | 'rejected';
    }> | null;

    if (history) {
      history.forEach((record, index) => {
        if (record.status === 'pending_approval') {
          pendingApprovals.push({
            petId: pet.id,
            petName: pet.name,
            petSpecies: pet.species,
            petBreed: pet.breed,
            ownerName: (pet.profiles as unknown as { id: string; full_name: string } | null)?.full_name || 'Unknown',
            vaccinationName: record.name,
            vaccinationDate: record.date,
            nextDueDate: record.nextDueDate || null,
            administeredBy: record.administeredBy || null,
            index,
          });
        }
      });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
          Tasks
        </h1>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-1)'
        }}>
          Review and approve pending vaccination records
        </p>
      </div>

      <VaccinationTasksList initialApprovals={pendingApprovals} />
    </div>
  );
}
