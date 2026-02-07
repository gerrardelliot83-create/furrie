import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/consultations/[id]/flag - Flag a consultation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Unauthorized - Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Verify consultation belongs to this vet
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('id, status, vet_id')
      .eq('id', consultationId)
      .eq('vet_id', user.id)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { reason, notes } = body;

    // Validate reason
    const validReasons = [
      'beyond_teleconsultation',
      'unresponsive_user',
      'emergency_in_person',
      'inappropriate_behavior',
      'technical_issues',
      'other',
    ];

    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid flag reason', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Insert flag record
    const { error: flagError } = await supabase.from('consultation_flags').insert({
      consultation_id: consultationId,
      flagged_by: user.id,
      reason,
      notes: notes || null,
      status: 'pending',
    });

    if (flagError) {
      console.error('Error creating flag:', flagError);
      return NextResponse.json(
        { error: 'Failed to flag consultation', code: 'FLAG_ERROR' },
        { status: 500 }
      );
    }

    // Update consultation to mark it as flagged
    await supabase
      .from('consultations')
      .update({
        is_flagged: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    return NextResponse.json({
      success: true,
      message: 'Consultation flagged successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/consultations/[id]/flag:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
