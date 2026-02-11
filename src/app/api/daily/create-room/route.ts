import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRoom } from '@/lib/daily';

/**
 * POST /api/daily/create-room
 * Creates a Daily.co room for a consultation
 *
 * Body: { consultationId: string }
 *
 * Only the assigned vet or the customer of the consultation can create a room.
 * The room is created and stored in the consultations table.
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

    // Fetch consultation to verify access and check if room already exists
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select('id, customer_id, vet_id, status, daily_room_name, daily_room_url, duration_minutes')
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user is either the customer or the assigned vet
    const isCustomer = consultation.customer_id === user.id;
    const isVet = consultation.vet_id === user.id;

    if (!isCustomer && !isVet) {
      return NextResponse.json(
        { error: 'Not authorized to access this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check if room already exists
    if (consultation.daily_room_name && consultation.daily_room_url) {
      return NextResponse.json({
        roomName: consultation.daily_room_name,
        roomUrl: consultation.daily_room_url,
        alreadyExists: true,
      });
    }

    // Verify consultation status is appropriate for room creation
    // Updated to support new status values (scheduled, active) and legacy values (matched, in_progress)
    const validStatuses = ['scheduled', 'active', 'matched', 'in_progress'];
    if (!validStatuses.includes(consultation.status)) {
      return NextResponse.json(
        { error: `Cannot create room for consultation with status: ${consultation.status}`, code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Create the Daily.co room
    const durationMinutes = consultation.duration_minutes || 30;
    const room = await createRoom(consultationId, durationMinutes);

    // Store room info in consultation
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        daily_room_name: room.name,
        daily_room_url: room.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Failed to update consultation with room info:', updateError);
      return NextResponse.json(
        { error: 'Failed to save room information', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      roomName: room.name,
      roomUrl: room.url,
      expiresAt: room.expiresAt,
      alreadyExists: false,
    });
  } catch (error) {
    console.error('Error creating Daily room:', error);
    return NextResponse.json(
      { error: 'Failed to create video room', code: 'DAILY_ERROR' },
      { status: 500 }
    );
  }
}
