import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { VetDashboardContent } from './VetDashboardContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Vet ${t('dashboard')}`,
  };
}

export default async function VetDashboard() {
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
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  // Get vet profile
  const { data: vetProfile } = await supabase
    .from('vet_profiles')
    .select('is_available, consultation_count, average_rating')
    .eq('id', user.id)
    .single();

  // Get date ranges
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // Fetch today's consultations count (active + successfully closed)
  const { count: todayActiveCount } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('vet_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .eq('status', 'active');

  const { count: todayCompletedCount } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('vet_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .eq('status', 'closed')
    .eq('outcome', 'success');

  const todayCount = (todayActiveCount || 0) + (todayCompletedCount || 0);

  // Fetch this week's consultations count (active + successfully closed)
  const { count: weekActiveCount } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('vet_id', user.id)
    .gte('created_at', weekStart.toISOString())
    .eq('status', 'active');

  const { count: weekCompletedCount } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('vet_id', user.id)
    .gte('created_at', weekStart.toISOString())
    .eq('status', 'closed')
    .eq('outcome', 'success');

  const weekCount = (weekActiveCount || 0) + (weekCompletedCount || 0);

  // Fetch recent consultations
  const { data: recentConsultations } = await supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id,
        name,
        species,
        breed
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name
      )
    `)
    .eq('vet_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Map consultations
  const mappedConsultations = (recentConsultations || []).map((row) => ({
    id: row.id,
    consultationNumber: row.consultation_number,
    customerId: row.customer_id,
    vetId: row.vet_id,
    petId: row.pet_id,
    type: row.type as 'direct_connect' | 'scheduled' | 'follow_up',
    status: row.status,
    outcome: row.outcome,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    wasExtended: row.was_extended,
    concernText: row.concern_text,
    symptomCategories: row.symptom_categories || [],
    isFollowUp: row.is_follow_up,
    parentConsultationId: row.parent_consultation_id,
    followUpExpiresAt: row.follow_up_expires_at,
    dailyRoomName: row.daily_room_name,
    dailyRoomUrl: row.daily_room_url,
    recordingId: row.recording_id,
    recordingUrl: row.recording_url,
    paymentId: row.payment_id,
    amountPaid: row.amount_paid,
    isPriority: row.is_priority,
    isFree: row.is_free,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pet: row.pets,
    customer: row.profiles ? {
      id: row.profiles.id,
      fullName: row.profiles.full_name
    } : undefined
  }));

  const stats = {
    todayConsultations: todayCount || 0,
    weekConsultations: weekCount || 0,
    totalConsultations: vetProfile?.consultation_count || 0,
    averageRating: vetProfile?.average_rating || 0,
  };

  return (
    <VetDashboardContent
      vetId={user.id}
      vetName={profile.full_name || 'Doctor'}
      isAvailable={vetProfile?.is_available || false}
      stats={stats}
      recentConsultations={mappedConsultations}
    />
  );
}
