import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  mapConsultationWithRelationsFromDB,
  mapConsultationUpdateToDB,
} from '@/lib/utils/consultationMapper';

// GET /api/consultations/[id] - Get single consultation
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

    // Determine if user is a vet by checking vet_profiles table directly
    // This is more reliable than checking profiles.role which could fail
    let isVet = false;

    const { data: vetProfile, error: vetCheckError } = await supabaseAdmin
      .from('vet_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (vetCheckError) {
      console.error('Vet profile check failed:', vetCheckError);
      // Don't fail silently - try alternative approach
      // Check if user is vet_id OR customer_id on this specific consultation
      const { data: consultationOwnership } = await supabaseAdmin
        .from('consultations')
        .select('customer_id, vet_id')
        .eq('id', id)
        .maybeSingle();

      if (!consultationOwnership) {
        return NextResponse.json(
          { error: 'Consultation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if (consultationOwnership.vet_id === user.id) {
        isVet = true;
      } else if (consultationOwnership.customer_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to view this consultation', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    } else {
      // vetProfile exists means user is a vet
      isVet = vetProfile !== null;
    }

    // Fetch consultation with relations
    let consultation;
    let queryError;

    if (isVet) {
      // For vets: Use admin client to bypass RLS timing issues
      const { data, error } = await supabaseAdmin
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
          vet_profiles!consultations_vet_id_fkey (
            qualifications
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
        .eq('id', id)
        .single();

      // Manual security check: ensure vet is assigned
      if (data && data.vet_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this consultation', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      consultation = data;
      queryError = error;
    } else {
      // For customers: Use regular client with RLS
      const { data, error } = await supabase
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
          vet_profiles!consultations_vet_id_fkey (
            qualifications
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
        .eq('id', id)
        .single();

      consultation = data;
      queryError = error;
    }

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Consultation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error fetching consultation:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch consultation', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map to TypeScript interface
    const mappedConsultation = mapConsultationWithRelationsFromDB(
      consultation as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
    );

    return NextResponse.json({ consultation: mappedConsultation });
  } catch (error) {
    console.error('Unexpected error in GET /api/consultations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PATCH /api/consultations/[id] - Update consultation (e.g., cancel)
export async function PATCH(
  request: Request,
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

    const body = await request.json();

    // Verify consultation exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('consultations')
      .select('id, status, customer_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existing.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Validate status transitions for customers
    if (body.status) {
      const allowedTransitions: Record<string, string[]> = {
        pending: ['cancelled'],
        matching: ['cancelled'],
        matched: ['cancelled'],
        // in_progress, completed, missed cannot be changed by customer
      };

      const currentStatus = existing.status;
      const allowedNextStatuses = allowedTransitions[currentStatus] || [];

      if (!allowedNextStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Cannot change status from "${currentStatus}" to "${body.status}"`,
            code: 'INVALID_TRANSITION',
          },
          { status: 400 }
        );
      }
    }

    // Map update data
    const updateData = mapConsultationUpdateToDB(body);

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating consultation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update consultation', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ consultation: updated });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/consultations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
