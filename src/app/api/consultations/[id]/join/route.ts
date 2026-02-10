import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createRoom, generateToken, DAILY_DOMAIN } from '@/lib/daily';
import { canJoinConsultation } from '@/lib/scheduling';

/**
 * POST /api/consultations/[id]/join
 *
 * Join a scheduled consultation. Creates the Daily.co room just-in-time
 * if it doesn't exist yet.
 *
 * Access Rules:
 * - Customer: Must be the consultation's customer_id
 * - Vet: Must be the consultation's vet_id
 * - Both: Must be within join window (5 min before to 45 min after scheduled_at)
 *
 * Response:
 * {
 *   roomUrl: "https://furrie.daily.co/furrie-uuid",
 *   token: "eyJ...",
 *   consultation: {
 *     id: "...",
 *     status: "scheduled" | "in_progress",
 *     scheduledAt: "...",
 *     vet: { name: "Dr. Sharma" },
 *     pet: { name: "Buddy" }
 *   }
 * }
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
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

    // Fetch consultation with relations
    const { data: consultation, error: fetchError } = await supabaseAdmin
      .from('consultations')
      .select(
        `
        id,
        customer_id,
        vet_id,
        status,
        type,
        scheduled_at,
        daily_room_name,
        daily_room_url,
        room_created_at,
        started_at,
        duration_minutes,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species,
          breed
        ),
        profiles!consultations_vet_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Determine if user is customer or vet
    const isCustomer = consultation.customer_id === user.id;
    const isVet = consultation.vet_id === user.id;

    if (!isCustomer && !isVet) {
      return NextResponse.json(
        { error: 'You are not a participant in this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check consultation status
    const validStatuses = ['scheduled', 'in_progress'];
    if (!validStatuses.includes(consultation.status)) {
      return NextResponse.json(
        {
          error: `Cannot join consultation with status: ${consultation.status}`,
          code: 'INVALID_STATUS',
          currentStatus: consultation.status,
        },
        { status: 400 }
      );
    }

    // Check join window
    if (!consultation.scheduled_at) {
      return NextResponse.json(
        { error: 'Consultation has no scheduled time', code: 'NO_SCHEDULE' },
        { status: 400 }
      );
    }

    const joinCheck = canJoinConsultation(consultation.scheduled_at);
    if (!joinCheck.canJoin) {
      return NextResponse.json(
        {
          error: joinCheck.reason,
          code: 'OUTSIDE_JOIN_WINDOW',
          minutesUntilStart: joinCheck.minutesUntilStart,
        },
        { status: 400 }
      );
    }

    // Create room just-in-time if it doesn't exist
    let roomName = consultation.daily_room_name;
    let roomUrl = consultation.daily_room_url;

    if (!roomName || !roomUrl) {
      try {
        const room = await createRoom(id, consultation.duration_minutes || 30);
        roomName = room.name;
        roomUrl = room.url;

        // Update consultation with room info
        await supabaseAdmin
          .from('consultations')
          .update({
            daily_room_name: roomName,
            daily_room_url: roomUrl,
            room_created_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (roomError) {
        console.error('Error creating Daily.co room:', roomError);
        return NextResponse.json(
          { error: 'Failed to create video room', code: 'ROOM_ERROR' },
          { status: 500 }
        );
      }
    }

    // Get user's display name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = userProfile?.full_name || (isVet ? 'Veterinarian' : 'Pet Parent');

    // Generate meeting token
    let token: string;
    try {
      token = await generateToken(
        roomName,
        user.id,
        userName,
        isVet, // Vets are room owners
        60, // 60 minute token expiry
        {
          canRecord: isVet,
          autoStartRecording: isVet, // Auto-start recording when vet joins
        }
      );
    } catch (tokenError) {
      console.error('Error generating meeting token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate meeting token', code: 'TOKEN_ERROR' },
        { status: 500 }
      );
    }

    // Update consultation status to in_progress if first join
    if (consultation.status === 'scheduled') {
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'scheduled'); // Optimistic lock
    }

    // Format response
    // Supabase returns joined data as objects (not arrays) for !fkey syntax with single()
    const pet = consultation.pets as unknown as { id: string; name: string; species: string; breed: string } | null;
    const vet = consultation.profiles as unknown as { id: string; full_name: string; avatar_url: string | null } | null;

    return NextResponse.json({
      roomUrl,
      roomName,
      token,
      dailyDomain: DAILY_DOMAIN,
      consultation: {
        id: consultation.id,
        status: consultation.status === 'scheduled' ? 'in_progress' : consultation.status,
        scheduledAt: consultation.scheduled_at,
        durationMinutes: consultation.duration_minutes,
        pet: pet
          ? {
              id: pet.id,
              name: pet.name,
              species: pet.species,
              breed: pet.breed,
            }
          : null,
        vet: vet
          ? {
              id: vet.id,
              name: vet.full_name,
              avatarUrl: vet.avatar_url,
            }
          : null,
      },
      participant: {
        id: user.id,
        name: userName,
        role: isVet ? 'vet' : 'customer',
        isOwner: isVet,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/consultations/[id]/join:', error);
    return NextResponse.json(
      { error: 'Failed to join consultation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
