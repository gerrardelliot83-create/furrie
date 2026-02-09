import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/consultations/[id]/accept
 *
 * Server-side acceptance of a consultation by a vet.
 * This endpoint:
 * 1. Verifies the vet is assigned to this consultation
 * 2. Updates status from 'matched' to 'accepted'
 * 3. Notifies the customer
 * 4. Returns success with room URL
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Verify user is a vet (check vet_profiles)
    const { data: vetProfile } = await supabaseAdmin
      .from('vet_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!vetProfile) {
      return NextResponse.json(
        { error: 'Only vets can accept consultations', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch consultation and verify vet is assigned
    const { data: consultation, error: fetchError } = await supabaseAdmin
      .from('consultations')
      .select('id, status, vet_id, customer_id, daily_room_url')
      .eq('id', id)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify this vet is assigned
    if (consultation.vet_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Verify status is 'matched' (can only accept matched consultations)
    if (consultation.status !== 'matched') {
      return NextResponse.json(
        {
          error: `Cannot accept consultation with status: ${consultation.status}`,
          code: 'INVALID_STATUS',
          currentStatus: consultation.status
        },
        { status: 400 }
      );
    }

    // Update status to 'accepted'
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'matched') // Optimistic lock - only update if still matched
      .select()
      .single();

    if (updateError || !updated) {
      // Race condition - consultation was reassigned
      return NextResponse.json(
        { error: 'Consultation was reassigned', code: 'REASSIGNED' },
        { status: 409 }
      );
    }

    // Notify customer that vet accepted
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: consultation.customer_id,
        type: 'vet_accepted',
        title: 'Vet is joining',
        body: 'Your veterinarian has accepted and is joining the call.',
        channel: 'in_app',
        data: { consultationId: id },
      });

    return NextResponse.json({
      success: true,
      consultation: {
        id: updated.id,
        status: updated.status,
        roomUrl: updated.daily_room_url,
      },
    });
  } catch (error) {
    console.error('Error accepting consultation:', error);
    return NextResponse.json(
      { error: 'Failed to accept consultation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
