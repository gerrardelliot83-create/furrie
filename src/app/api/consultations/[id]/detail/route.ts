import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/consultations/[id]/detail — Full consultation detail for customer panel
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Fetch consultation with all relations (customer-scoped via RLS + customer_id filter)
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id, name, species, breed, photo_urls, gender
        ),
        profiles!consultations_vet_id_fkey (
          id, full_name, avatar_url
        ),
        consultation_ratings (rating, feedback_text),
        prescriptions (id, pdf_url, prescription_number),
        soap_notes (
          provisional_diagnosis,
          home_care_instructions,
          warning_signs,
          follow_up_timeframe,
          in_person_visit_recommended,
          in_person_urgency
        )
      `)
      .eq('id', id)
      .eq('customer_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Consultation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error fetching consultation detail:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consultation', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Fetch vet_profiles separately (no direct FK)
    let vetProfile: { qualifications: string | null; years_of_experience: number | null } | null = null;
    if (data.vet_id) {
      const { data: vp } = await supabase
        .from('vet_profiles')
        .select('qualifications, years_of_experience')
        .eq('id', data.vet_id)
        .single();
      vetProfile = vp;
    }

    // Fetch consultation media
    const { data: mediaData } = await supabase
      .from('consultation_media')
      .select('id, url, media_type, file_name, file_size_bytes, created_at')
      .eq('consultation_id', id)
      .order('created_at', { ascending: true });

    // Fetch follow-up thread
    const { data: followUpThread } = await supabase
      .from('follow_up_threads')
      .select('id, is_active, expires_at')
      .eq('consultation_id', id)
      .single();

    return NextResponse.json({
      consultation: data,
      vetProfile,
      media: mediaData || [],
      followUpThread,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/consultations/[id]/detail:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
