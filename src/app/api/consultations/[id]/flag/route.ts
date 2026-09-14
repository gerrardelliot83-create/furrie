import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';

// POST /api/consultations/[id]/flag - Flag a consultation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const { user, error: authError, supabase } = await getRequestUser();

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

    // Insert flag record. Columns are `details` and `admin_status` (BRK-3:
    // the route wrote `notes`/`status`, which do not exist, so every POST 500ed).
    const { error: flagError } = await supabase.from('consultation_flags').insert({
      consultation_id: consultationId,
      flagged_by: user.id,
      reason,
      details: notes || null,
      admin_status: 'pending',
    });

    if (flagError) {
      console.error('Error creating flag:', flagError);
      return NextResponse.json(
        { error: 'Failed to flag consultation', code: 'FLAG_ERROR' },
        { status: 500 }
      );
    }

    // consultations has no is_flagged column; flag state lives on consultation_flags.
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

// PATCH /api/consultations/[id]/flag - Withdraw a flag (within 24 hours)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Find the most recent pending flag by this vet
    const { data: flag, error: flagError } = await supabase
      .from('consultation_flags')
      .select('id, created_at')
      .eq('consultation_id', consultationId)
      .eq('flagged_by', user.id)
      .eq('admin_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (flagError || !flag) {
      return NextResponse.json(
        { error: 'No pending flag found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if within 24-hour withdrawal window
    const flaggedAt = new Date(flag.created_at).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - flaggedAt > twentyFourHours) {
      return NextResponse.json(
        { error: 'Flag withdrawal window (24 hours) has expired. Contact admin.', code: 'WINDOW_EXPIRED' },
        { status: 403 }
      );
    }

    // Mark withdrawn. RLS ("Vets can withdraw own pending flags") only lets the
    // vet move their own pending flag to 'withdrawn'; `.select()` so a silent
    // zero-row update surfaces as an error instead of a false success.
    const { data: updated, error: updateError } = await supabase
      .from('consultation_flags')
      .update({ admin_status: 'withdrawn' })
      .eq('id', flag.id)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Failed to withdraw flag', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Flag withdrawn successfully',
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/consultations/[id]/flag:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
