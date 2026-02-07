import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/vet/stats - Get vet dashboard statistics
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Verify user is a vet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'vet') {
      return NextResponse.json(
        { error: 'Unauthorized - Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Get date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    // Fetch today's consultations count
    const { count: todayCount } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('vet_id', user.id)
      .gte('created_at', todayStart.toISOString())
      .in('status', ['completed', 'in_progress']);

    // Fetch this week's consultations count
    const { count: weekCount } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('vet_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .in('status', ['completed', 'in_progress']);

    // Get vet profile for total count and rating
    const { data: vetProfile } = await supabase
      .from('vet_profiles')
      .select('consultation_count, average_rating, is_available')
      .eq('id', user.id)
      .single();

    // Fetch recent consultations with relations
    const { data: recentConsultations, error: consultationsError } = await supabase
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

    if (consultationsError) {
      console.error('Error fetching consultations:', consultationsError);
    }

    // Map consultations to expected format
    const mappedConsultations = (recentConsultations || []).map((row) => ({
      id: row.id,
      consultationNumber: row.consultation_number,
      customerId: row.customer_id,
      vetId: row.vet_id,
      petId: row.pet_id,
      type: row.type,
      status: row.status,
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

    return NextResponse.json({
      stats: {
        todayConsultations: todayCount || 0,
        weekConsultations: weekCount || 0,
        totalConsultations: vetProfile?.consultation_count || 0,
        averageRating: vetProfile?.average_rating || 0,
        isAvailable: vetProfile?.is_available || false,
      },
      recentConsultations: mappedConsultations,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/vet/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
