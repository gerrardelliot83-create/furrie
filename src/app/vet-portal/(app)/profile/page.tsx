import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VetProfileContent } from './VetProfileContent';

export const metadata: Metadata = {
  title: 'Profile - Vet Portal',
};

export default async function VetProfilePage() {
  const supabase = await createClient();

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
    .select(`
      id, full_name, email, phone, avatar_url, role, created_at,
      vet_profiles (
        qualifications, vci_registration_number, state_council_registration,
        specializations, years_of_experience, degree_certificate_url,
        is_verified, is_available, availability_schedule,
        consultation_count, average_rating
      )
    `)
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
          Profile
        </h1>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-1)'
        }}>
          View and manage your professional profile
        </p>
      </div>

      <VetProfileContent profile={profile as Parameters<typeof VetProfileContent>[0]['profile']} />
    </div>
  );
}
