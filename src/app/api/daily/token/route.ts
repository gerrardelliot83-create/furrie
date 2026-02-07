import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateToken } from '@/lib/daily';

/**
 * POST /api/daily/token
 * Generates a meeting token for a participant
 *
 * Body: { consultationId: string }
 *
 * Token permissions:
 * - Vet: is_owner=true (can control recording)
 * - Customer: is_owner=false
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

    // Fetch consultation with related profiles
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select(`
        id,
        customer_id,
        vet_id,
        status,
        daily_room_name,
        daily_room_url
      `)
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

    // Room must exist
    if (!consultation.daily_room_name) {
      return NextResponse.json(
        { error: 'Video room has not been created yet', code: 'ROOM_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || 'Participant';
    const isOwner = isVet; // Only vets have owner privileges

    // Generate token
    const token = await generateToken(
      consultation.daily_room_name,
      user.id,
      userName,
      isOwner
    );

    return NextResponse.json({
      token,
      roomUrl: consultation.daily_room_url,
      roomName: consultation.daily_room_name,
      isOwner,
      userName,
    });
  } catch (error) {
    console.error('Error generating meeting token:', error);
    return NextResponse.json(
      { error: 'Failed to generate meeting token', code: 'DAILY_ERROR' },
      { status: 500 }
    );
  }
}
