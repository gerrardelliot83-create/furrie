import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DAILY_DOMAIN,
  clearRoomForJoin,
  generateToken,
  prepareConsultationRoom,
  roomExpiryFor,
  type PreparedRoom,
} from '@/lib/daily';
import { canJoinConsultation } from '@/lib/scheduling';
import { canJoinNow } from '@/lib/scheduling/joinWindow';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { withRoute } from '@/server/handler';

/**
 * POST /api/consultations/[id]/join
 *
 * Join a scheduled consultation. Creates the Daily.co room just-in-time
 * if it doesn't exist yet.
 *
 * Access Rules:
 * - Customer: Must be the consultation's customer_id
 * - Vet: Must be the consultation's vet_id
 * - Both: Must be within join window (lib/scheduling/joinWindow: 10 min before
 *   to 45 min after scheduled_at)
 *
 * Every call makes sure the room is open until the booking time + 90 min and
 * removes the caller's own earlier sessions from it (VC-1).
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
export const POST = withRoute(async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, profile } = await getRequestUser();
    const { id } = await params;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Each join can cost several Daily API calls (room, presence, eject,
    // token); a burst from one account must not use up the account-wide
    // Daily limit. Automatic retries plus Try again stay well under this.
    if (!checkRateLimit(`join:${user.id}`, { maxRequests: 20, windowMs: 5 * 60 * 1000 }).success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a minute, then tap Try again.', code: 'RATE_LIMITED' },
        { status: 429 }
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

    // Determine if user is customer or vet. A-03: the id on the row must match
    // AND the caller must have that role; `isVet` makes them the room owner
    // with recording.
    const isCustomer = consultation.customer_id === user.id && profile?.role === 'customer';
    const isVet = consultation.vet_id === user.id && profile?.role === 'vet';

    if (!isCustomer && !isVet) {
      return NextResponse.json(
        { error: 'You are not a participant in this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check consultation status
    const validStatuses = ['scheduled', 'active'];
    if (!validStatuses.includes(consultation.status)) {
      return NextResponse.json(
        {
          // Shown to the person as it is (VC-1.1): plain words, not a status code.
          error:
            consultation.status === 'closed'
              ? 'This consultation has already ended, so its video call is closed.'
              : 'This consultation isn’t confirmed yet, so its video call isn’t open.',
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

    // A call in progress can be rejoined until its room closes (VC-1); a
    // scheduled one only inside the join window.
    const joinCheck = canJoinConsultation(consultation.scheduled_at);
    if (!canJoinNow(consultation.scheduled_at, consultation.status, Date.now())) {
      return NextResponse.json(
        {
          error: joinCheck.reason,
          code: 'OUTSIDE_JOIN_WINDOW',
          minutesUntilStart: joinCheck.minutesUntilStart,
        },
        { status: 400 }
      );
    }

    // Make sure the room exists and stays open long enough (VC-1). A-04: a
    // consultation's room is always `furrie-<consultation id>`; the stored
    // name is never trusted. Before VC-1 the room was created on the first
    // join with a 35-minute life, and once it closed the same dead room kept
    // being handed out.
    let room: PreparedRoom;
    try {
      room = await prepareConsultationRoom(id, roomExpiryFor(consultation.scheduled_at, Date.now()));
    } catch (roomError) {
      console.error('Error preparing Daily.co room:', roomError);
      return NextResponse.json(
        { error: 'Failed to create video room', code: 'ROOM_ERROR' },
        { status: 500 }
      );
    }
    const roomName = room.name;
    const roomUrl = room.url;

    if (
      room.action === 'created' ||
      consultation.daily_room_name !== roomName ||
      consultation.daily_room_url !== roomUrl
    ) {
      await supabaseAdmin
        .from('consultations')
        .update({
          daily_room_name: roomName,
          daily_room_url: roomUrl,
          ...(room.action === 'created' || !consultation.room_created_at
            ? { room_created_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', id);
    }

    // The pet parent always gets in (L1 + L4): remove this caller's earlier
    // sessions (a reload, a second tab, a dropped connection) and anyone else,
    // and the other participant's older copies if the room would still be
    // full. On 7 Oct the vet's earlier session stayed 9 minutes and the pet
    // parent was refused four times. This runs when Join is pressed (the page
    // fetches the ticket then), never just because a page was opened.
    const cleanup = await clearRoomForJoin(roomName, {
      callerUserId: user.id,
      otherUserId: isVet ? consultation.customer_id : consultation.vet_id,
      maxParticipants: room.maxParticipants,
    });
    if (cleanup.otherSessions > 0) {
      // Someone else's duplicate was in the room: exactly what used to lock
      // the pet parent out. Worth knowing about even though it's handled.
      Sentry.captureMessage('video-call: duplicate sessions cleared on join', {
        level: 'warning',
        tags: { area: 'video-call', 'call.role': isVet ? 'vet' : 'customer' },
        extra: { consultationId: id, ...cleanup },
      });
    }

    // No personal data: ids and what happened, for the Vercel logs.
    console.log(
      `[join] consultation=${id} role=${isVet ? 'vet' : 'customer'} room=${room.action} open_until=${new Date(room.expiresAt * 1000).toISOString()} cleanup=${cleanup.method} own=${cleanup.ownSessions} others=${cleanup.otherSessions} ejected=${cleanup.ejected}`
    );

    // Display name from the profile getRequestUser() already loaded.
    const userName = profile?.full_name || (isVet ? 'Veterinarian' : 'Pet Parent');

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

    // Update consultation status to active if first join
    if (consultation.status === 'scheduled') {
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'active',
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
        status: consultation.status === 'scheduled' ? 'active' : consultation.status,
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
});
