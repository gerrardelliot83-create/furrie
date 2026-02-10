/**
 * @deprecated This endpoint is DEPRECATED as of Feb 2026.
 * The instant matching flow has been replaced with a scheduling-based system.
 * Use /api/consultations/book for new bookings and /api/consultations/[id]/join to join rooms.
 * This file is kept for backwards compatibility during transition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createRoom } from '@/lib/daily';

// Matching timeout in seconds (used by client-side polling)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MATCHING_TIMEOUT_SECONDS = 120; // 2 minutes to find a vet

interface AvailableVet {
  id: string;
  profile: {
    full_name: string;
  };
  average_rating: number | null;
  consultation_count: number | null;
}

/**
 * POST /api/consultations/match
 * Initiates vet matching for a consultation
 *
 * Body: { consultationId: string }
 *
 * Algorithm:
 * 1. Set status to 'matching'
 * 2. Query available vets (verified, available, not in active call)
 * 3. Priority: Plus users skip queue (FIFO among Plus)
 * 4. Assign first available vet
 * 5. Create Daily.co room
 * 6. Send real-time notification to vet
 * 7. Timeout (120s) → status: 'no_vet_available'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { consultationId } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch consultation
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select(`
        id,
        customer_id,
        pet_id,
        status,
        is_priority,
        type,
        concern_text,
        symptom_categories,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species,
          breed
        )
      `)
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user owns this consultation
    if (consultation.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Verify consultation is in valid state for matching
    if (consultation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot match consultation with status: ${consultation.status}`, code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Update status to matching
    // Use supabaseAdmin because RLS policies don't allow customers to update consultations
    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'matching',
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Failed to update consultation status:', updateError);
      return NextResponse.json(
        { error: 'Failed to start matching', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Find available vet
    const availableVet = await findAvailableVet(consultation.is_priority);

    if (!availableVet) {
      // No vet available - update status
      // Use supabaseAdmin because RLS policies don't allow customers to update consultations
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'no_vet_available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      return NextResponse.json({
        matched: false,
        reason: 'no_vet_available',
        message: 'No veterinarians are currently available. Would you like to schedule an appointment?',
      });
    }

    // Create Daily.co room
    let room;
    try {
      room = await createRoom(consultationId, 30);
    } catch (roomError) {
      const errorMessage = roomError instanceof Error ? roomError.message : 'Unknown error';
      console.error('Failed to create Daily room:', {
        consultationId,
        error: errorMessage,
        stack: roomError instanceof Error ? roomError.stack : undefined,
      });

      // Rollback to pending
      // Use supabaseAdmin because RLS policies don't allow customers to update consultations
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      return NextResponse.json(
        {
          error: 'Failed to create video room',
          details: errorMessage,
          code: 'ROOM_ERROR'
        },
        { status: 500 }
      );
    }

    // Assign vet and update consultation
    // Use supabaseAdmin because RLS policies prevent customers from updating vet_id
    const { error: assignError } = await supabaseAdmin
      .from('consultations')
      .update({
        vet_id: availableVet.id,
        status: 'matched',
        daily_room_name: room.name,
        daily_room_url: room.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    if (assignError) {
      console.error('Failed to assign vet:', assignError);
      return NextResponse.json(
        { error: 'Failed to assign veterinarian', code: 'ASSIGN_ERROR' },
        { status: 500 }
      );
    }

    // Get customer profile for notification
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Send notification to vet via Supabase Realtime
    // The vet's portal will listen to this channel
    const petData = consultation.pets as unknown as { name: string; species: string; breed: string } | null;
    await sendVetNotification(availableVet.id, {
      type: 'incoming_consultation',
      consultationId,
      customerName: customerProfile?.full_name || 'Pet Parent',
      petName: petData?.name || 'Unknown',
      petSpecies: petData?.species || 'Unknown',
      petBreed: petData?.breed || 'Unknown',
      concern: consultation.concern_text || 'General consultation',
      symptoms: consultation.symptom_categories || [],
      roomUrl: room.url,
    });

    // Update vet consultation count
    await supabaseAdmin
      .from('vet_profiles')
      .update({
        consultation_count: (availableVet.consultation_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', availableVet.id);

    return NextResponse.json({
      matched: true,
      vet: {
        id: availableVet.id,
        name: availableVet.profile.full_name,
        rating: availableVet.average_rating,
      },
      room: {
        url: room.url,
        name: room.name,
      },
    });
  } catch (error) {
    console.error('Error in vet matching:', error);
    return NextResponse.json(
      { error: 'Matching failed', code: 'MATCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Finds an available vet
 * Priority users get matched first, then FIFO for regular users
 */
async function findAvailableVet(_isPriority: boolean): Promise<AvailableVet | null> {
  // Query available vets:
  // 1. Must be verified
  // 2. Must be marked as available
  // 3. Not currently in an active consultation
  const { data: availableVets, error } = await supabaseAdmin
    .from('vet_profiles')
    .select(`
      id,
      average_rating,
      consultation_count,
      profiles!vet_profiles_id_fkey (
        id,
        full_name,
        is_active
      )
    `)
    .eq('is_verified', true)
    .eq('is_available', true);

  // Debug logging
  console.log('findAvailableVet - Query results:', {
    is_verified: true,
    is_available: true,
    total_vets_found: availableVets?.length || 0,
    error: error?.message || null,
  });

  if (error || !availableVets || availableVets.length === 0) {
    console.log('No verified available vets found:', { error: error?.message });
    return null;
  }

  // Filter out vets who are in RECENT active consultations
  // Stale consultations (matched > 5 min, in_progress > 60 min) are ignored
  const vetsNotInCall: AvailableVet[] = [];

  // Calculate time thresholds
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  for (const vet of availableVets) {
    const profile = vet.profiles as unknown as { full_name: string; is_active: boolean } | null;

    // Check if profile is active
    if (profile?.is_active === false) {
      console.log(`Vet ${vet.id}: EXCLUDED - profile is_active is false`);
      continue;
    }

    // Check for RECENT active consultations only
    // A consultation is considered "active" if:
    // - Status is 'matched' AND created within last 5 minutes, OR
    // - Status is 'in_progress' AND created within last 60 minutes
    const { data: recentMatchedConsultation } = await supabaseAdmin
      .from('consultations')
      .select('id, status, created_at')
      .eq('vet_id', vet.id)
      .eq('status', 'matched')
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .maybeSingle();

    const { data: recentInProgressConsultation } = await supabaseAdmin
      .from('consultations')
      .select('id, status, created_at')
      .eq('vet_id', vet.id)
      .eq('status', 'in_progress')
      .gte('created_at', sixtyMinutesAgo)
      .limit(1)
      .maybeSingle();

    const hasActiveConsultation = recentMatchedConsultation || recentInProgressConsultation;

    if (hasActiveConsultation) {
      console.log(`Vet ${vet.id}: EXCLUDED - has active consultation:`, {
        matched: recentMatchedConsultation?.id || null,
        inProgress: recentInProgressConsultation?.id || null,
      });
      continue;
    }

    console.log(`Vet ${vet.id}: INCLUDED - available for matching`);

    vetsNotInCall.push({
      id: vet.id,
      profile: {
        full_name: profile?.full_name || 'Veterinarian',
      },
      average_rating: vet.average_rating,
      consultation_count: vet.consultation_count,
    });
  }

  if (vetsNotInCall.length === 0) {
    console.log('All vets are currently in consultations or excluded');
    return null;
  }

  // Sort by rating (higher first), then by consultation count (lower first for load balancing)
  vetsNotInCall.sort((a, b) => {
    const ratingA = a.average_rating || 0;
    const ratingB = b.average_rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    // Lower consultation count gets priority for load balancing
    return (a.consultation_count || 0) - (b.consultation_count || 0);
  });

  // Return first available vet
  return vetsNotInCall[0];
}

/**
 * Sends a real-time notification to the vet
 * Uses both:
 * 1. Database insert (for record keeping)
 * 2. Supabase Broadcast (for instant delivery - doesn't require Realtime publication setup)
 */
async function sendVetNotification(
  vetId: string,
  data: {
    type: string;
    consultationId: string;
    customerName: string;
    petName: string;
    petSpecies: string;
    petBreed: string;
    concern: string;
    symptoms: string[];
    roomUrl: string;
  }
) {
  const notificationPayload = {
    consultationId: data.consultationId,
    customerName: data.customerName,
    petName: data.petName,
    petSpecies: data.petSpecies,
    petBreed: data.petBreed,
    concern: data.concern,
    symptoms: data.symptoms,
    roomUrl: data.roomUrl,
  };

  // 1. Insert notification record (for persistence and history)
  const { error, data: insertedNotification } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: vetId,
      type: data.type,
      title: `Incoming consultation for ${data.petName}`,
      body: `${data.customerName} needs help with their ${data.petSpecies}. ${data.concern}`,
      channel: 'in_app',
      data: notificationPayload,
      is_read: false,
    })
    .select();

  if (error) {
    console.error('Failed to insert vet notification:', error);
  } else {
    console.log('Vet notification inserted:', {
      vetId,
      consultationId: data.consultationId,
      notificationId: insertedNotification?.[0]?.id,
    });
  }

  // 2. Broadcast directly to vet's channel for instant delivery
  // This works without requiring Realtime publication configuration
  const channel = supabaseAdmin.channel(`vet:${vetId}:incoming`);

  const broadcastResult = await channel.send({
    type: 'broadcast',
    event: 'incoming_consultation',
    payload: {
      id: insertedNotification?.[0]?.id || `temp-${Date.now()}`,
      type: data.type,
      title: `Incoming consultation for ${data.petName}`,
      body: `${data.customerName} needs help with their ${data.petSpecies}. ${data.concern}`,
      data: notificationPayload,
      createdAt: new Date().toISOString(),
    },
  });

  if (broadcastResult === 'ok') {
    console.log('Vet notification broadcast sent successfully:', {
      vetId,
      consultationId: data.consultationId,
      channel: `vet:${vetId}:incoming`,
    });
  } else {
    console.error('Failed to broadcast vet notification:', broadcastResult);
  }

  // Clean up the channel after sending
  await supabaseAdmin.removeChannel(channel);
}
