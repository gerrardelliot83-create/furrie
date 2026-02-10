import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findAvailableVetForSlot, SCHEDULING_CONSTANTS } from '@/lib/scheduling';

interface BookRequest {
  petId: string;
  scheduledAt: string; // ISO datetime string
  concernText?: string;
  symptomCategories?: string[];
}

/**
 * POST /api/consultations/book
 *
 * Books a consultation for a specific time slot.
 *
 * Flow:
 * 1. Validate the slot is still available (race condition check)
 * 2. Find an available vet for that slot
 * 3. Create consultation with status='pending', type='scheduled'
 * 4. Return consultation details for payment flow
 *
 * After payment completes (via webhook), status changes to 'scheduled'.
 *
 * Request:
 * {
 *   petId: "uuid",
 *   scheduledAt: "2026-02-09T10:00:00+05:30",
 *   concernText?: "My dog has been vomiting",
 *   symptomCategories?: ["vomiting", "loss_of_appetite"]
 * }
 *
 * Response:
 * {
 *   consultation: {
 *     id: "uuid",
 *     consultationNumber: "FUR-20260209-001",
 *     status: "pending",
 *     type: "scheduled",
 *     scheduledAt: "2026-02-09T10:00:00+05:30",
 *     pet: { ... },
 *     vet: { ... }
 *   },
 *   payment: {
 *     amount: 499,
 *     currency: "INR"
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
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

    const body = (await request.json()) as BookRequest;

    // Validate required fields
    if (!body.petId) {
      return NextResponse.json(
        { error: 'Pet ID is required', code: 'MISSING_PET_ID' },
        { status: 400 }
      );
    }

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled time is required', code: 'MISSING_SCHEDULED_AT' },
        { status: 400 }
      );
    }

    // Validate scheduled time
    const scheduledTime = new Date(body.scheduledAt);
    if (isNaN(scheduledTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled time format', code: 'INVALID_SCHEDULED_AT' },
        { status: 400 }
      );
    }

    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();

    // Check minimum lead time (15 minutes)
    if (timeDiff < SCHEDULING_CONSTANTS.MIN_LEAD_TIME_MS) {
      return NextResponse.json(
        {
          error: 'Appointments must be booked at least 15 minutes in advance',
          code: 'TOO_SOON',
        },
        { status: 400 }
      );
    }

    // Check maximum booking window (7 days)
    const maxBookingWindow = 7 * 24 * 60 * 60 * 1000;
    if (timeDiff > maxBookingWindow) {
      return NextResponse.json(
        {
          error: 'Appointments can only be booked up to 7 days in advance',
          code: 'TOO_FAR',
        },
        { status: 400 }
      );
    }

    // Verify pet belongs to customer
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed, owner_id')
      .eq('id', body.petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'PET_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (pet.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this pet', code: 'NOT_PET_OWNER' },
        { status: 403 }
      );
    }

    // Find an available vet for this slot
    const vetId = await findAvailableVetForSlot(body.scheduledAt);

    if (!vetId) {
      return NextResponse.json(
        {
          error: 'No vets available for this time slot. Please choose a different time.',
          code: 'NO_VET_AVAILABLE',
        },
        { status: 409 }
      );
    }

    // Get vet profile info
    const { data: vetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', vetId)
      .single();

    // Create consultation
    const { data: consultation, error: createError } = await supabaseAdmin
      .from('consultations')
      .insert({
        customer_id: user.id,
        vet_id: vetId,
        pet_id: body.petId,
        type: 'scheduled',
        status: 'pending', // Will change to 'scheduled' after payment
        scheduled_at: body.scheduledAt,
        concern_text: body.concernText || null,
        symptom_categories: body.symptomCategories || [],
        duration_minutes: 30,
        is_priority: false,
        is_free: false,
      })
      .select(
        `
        id,
        consultation_number,
        status,
        type,
        scheduled_at,
        concern_text,
        symptom_categories,
        created_at
      `
      )
      .single();

    if (createError || !consultation) {
      console.error('Error creating consultation:', createError);

      // Check if it's a unique constraint violation (slot already booked)
      if (createError?.code === '23505') {
        return NextResponse.json(
          {
            error: 'This time slot was just booked by someone else. Please choose a different time.',
            code: 'SLOT_TAKEN',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create consultation', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Get consultation fee (could be from pricing config, hardcoded for MVP)
    const consultationFee = 499;

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        consultationNumber: consultation.consultation_number,
        status: consultation.status,
        type: consultation.type,
        scheduledAt: consultation.scheduled_at,
        concernText: consultation.concern_text,
        symptomCategories: consultation.symptom_categories,
        createdAt: consultation.created_at,
        pet: {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
        },
        vet: vetProfile
          ? {
              id: vetProfile.id,
              name: vetProfile.full_name,
              avatarUrl: vetProfile.avatar_url,
            }
          : null,
      },
      payment: {
        amount: consultationFee,
        currency: 'INR',
        description: `Consultation for ${pet.name}`,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/consultations/book:', error);
    return NextResponse.json(
      { error: 'Failed to book consultation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
