import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/vet/vaccinations/approve - Approve a vaccination record
export async function POST(request: Request) {
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

    const body = await request.json();
    const { petId, vaccinationIndex } = body;

    if (!petId || vaccinationIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch the pet
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('vaccination_history')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const history = pet.vaccination_history as Array<{
      name: string;
      date: string;
      nextDueDate?: string;
      administeredBy?: string;
      status: 'pending_approval' | 'approved' | 'rejected';
      approvedBy?: string;
      approvedAt?: string;
    }> | null;

    if (!history || !history[vaccinationIndex]) {
      return NextResponse.json(
        { error: 'Vaccination record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update the vaccination record
    history[vaccinationIndex] = {
      ...history[vaccinationIndex],
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
    };

    // Save the updated history
    const { error: updateError } = await supabase
      .from('pets')
      .update({
        vaccination_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId);

    if (updateError) {
      console.error('Error updating vaccination:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve vaccination', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vaccination approved successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/vet/vaccinations/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
