import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { WeeklyScheduleEditor } from '@/components/vet/WeeklyScheduleEditor';
import type { AvailabilitySchedule } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `${t('schedule')} - Vet Portal`,
  };
}

export default async function VetSchedulePage() {
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

  // Get vet profile with schedule
  const { data: vetProfile } = await supabase
    .from('vet_profiles')
    .select('availability_schedule')
    .eq('id', user.id)
    .single();

  const schedule: AvailabilitySchedule = (vetProfile?.availability_schedule as AvailabilitySchedule) || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
          Schedule
        </h1>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-1)'
        }}>
          Manage your weekly availability for consultations
        </p>
      </div>

      <Card>
        <CardContent>
          <WeeklyScheduleEditor vetId={user.id} initialSchedule={schedule} />
        </CardContent>
      </Card>
    </div>
  );
}
