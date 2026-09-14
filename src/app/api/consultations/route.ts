import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';

// GET /api/consultations - List user's consultations
export async function GET(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

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
