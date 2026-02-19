import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/vet/pets/[id] - Get pet details for vet (only if vet has consulted this pet)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: petId } = await params;

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
        { error: 'Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Verify vet has consulted this pet
    const { count: consultationCount } = await supabaseAdmin
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('vet_id', user.id)
      .eq('pet_id', petId);

    if (!consultationCount || consultationCount === 0) {
      return NextResponse.json(
        { error: 'You have not consulted this pet', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch full pet details
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch owner info
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', pet.owner_id)
      .single();

    // Fetch consultation history for this pet with this vet
    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select(`
        id, consultation_number, status, outcome, scheduled_at, created_at,
        started_at, ended_at, concern_text, symptom_categories,
        soap_notes (id),
        prescriptions (id, prescription_number, pdf_url)
      `)
      .eq('vet_id', user.id)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      pet,
      owner,
      consultations: consultations || [],
      totalConsultations: consultationCount,
    });
  } catch (error) {
    console.error('Error in GET /api/vet/pets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
