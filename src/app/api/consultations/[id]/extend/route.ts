import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extendRoomExpiry } from '@/lib/daily';

const EXTENSION_MINUTES = 15;

/**
 * POST /api/consultations/[id]/extend
 * Extends a consultation session by 15 minutes
 *
 * Only the assigned vet can extend a session.
 * Updates both the Daily.co room expiry and the consultation record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch consultation
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select('id, vet_id, status, daily_room_name, duration_minutes, was_extended')
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user is the assigned vet
    if (consultation.vet_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned veterinarian can extend this session', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Verify consultation is in progress
    if (consultation.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Can only extend active consultations', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Check if already extended (only allow one extension)
    if (consultation.was_extended) {
      return NextResponse.json(
        { error: 'This session has already been extended', code: 'ALREADY_EXTENDED' },
        { status: 400 }
      );
    }

    // Verify room exists
    if (!consultation.daily_room_name) {
      return NextResponse.json(
        { error: 'No active video room for this consultation', code: 'NO_ROOM' },
        { status: 400 }
      );
    }

    // Extend Daily.co room expiry
    let newExpiry: number;
    try {
      const result = await extendRoomExpiry(consultation.daily_room_name, EXTENSION_MINUTES);
      newExpiry = result.expiresAt;
    } catch (error) {
      console.error('Failed to extend Daily room:', error);
      return NextResponse.json(
        { error: 'Failed to extend video room', code: 'DAILY_ERROR' },
        { status: 500 }
      );
    }

    // Update consultation record
    const newDuration = (consultation.duration_minutes || 30) + EXTENSION_MINUTES;

    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        duration_minutes: newDuration,
        was_extended: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Failed to update consultation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update consultation record', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session extended by ${EXTENSION_MINUTES} minutes`,
      newDurationMinutes: newDuration,
      roomExpiresAt: newExpiry,
    });
  } catch (error) {
    console.error('Error extending session:', error);
    return NextResponse.json(
      { error: 'Failed to extend session', code: 'EXTEND_ERROR' },
      { status: 500 }
    );
  }
}
