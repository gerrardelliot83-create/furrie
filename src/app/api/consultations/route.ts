import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapConsultationFromDB,
  mapConsultationToDB,
  mapConsultationWithRelationsFromDB,
} from '@/lib/utils/consultationMapper';

// GET /api/consultations - List user's consultations
export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');

    // Build query with relations
    let query = supabase
      .from('consultations')
      .select(
        `
        *,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species,
          breed,
          photo_urls
        ),
        profiles!consultations_vet_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        consultation_ratings (
          rating,
          feedback_text
        ),
        prescriptions (
          id,
          pdf_url,
          prescription_number
        )
      `
      )
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusParam) {
      const statuses = statusParam.split(',');
      query = query.in('status', statuses);
    }

    // Apply type filter
    if (typeParam) {
      query = query.eq('type', typeParam);
    }

    // Apply limit
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    const { data: consultations, error } = await query;

    if (error) {
      console.error('Error fetching consultations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consultations', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map database rows to TypeScript interface with relations
    const mappedConsultations = (consultations || []).map((row) =>
      mapConsultationWithRelationsFromDB(row as Parameters<typeof mapConsultationWithRelationsFromDB>[0])
    );

    return NextResponse.json({ consultations: mappedConsultations });
  } catch (error) {
    console.error('Unexpected error in GET /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/consultations - Create new consultation
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

    const body = await request.json();

    // Validate required fields
    if (!body.petId) {
      return NextResponse.json(
        { error: 'Missing required field: petId', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify pet belongs to user
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', body.petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found or does not belong to you', code: 'PET_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate concern text or symptoms
    if (!body.concernText && (!body.symptomCategories || body.symptomCategories.length === 0)) {
      return NextResponse.json(
        {
          error: 'Please provide a concern description or select at least one symptom',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Map to database format
    const consultationData = mapConsultationToDB(
      {
        petId: body.petId,
        concernText: body.concernText?.trim() || null,
        symptomCategories: body.symptomCategories || [],
        type: 'direct_connect',
        // TODO: Phase 5 - Set isFree based on subscription/sachet check
        isFree: false,
        isPriority: false,
      },
      user.id
    );

    // Insert consultation
    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert(consultationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating consultation:', error);
      return NextResponse.json(
        { error: 'Failed to create consultation', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Map back to TypeScript interface
    const mappedConsultation = mapConsultationFromDB(consultation);

    return NextResponse.json({ consultation: mappedConsultation }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
