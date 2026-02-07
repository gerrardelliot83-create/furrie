import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/consultations/[id]/rate
 * Submits a rating for a completed consultation
 *
 * Body: { rating: number (1-5), feedback?: string }
 *
 * Only the customer of the consultation can submit a rating.
 * Ratings can only be submitted for completed consultations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, feedback } = body;

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch consultation
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select('id, customer_id, vet_id, status')
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user is the customer
    if (consultation.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the customer can rate this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Verify consultation is completed
    if (consultation.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only rate completed consultations', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Verify vet exists
    if (!consultation.vet_id) {
      return NextResponse.json(
        { error: 'Consultation has no assigned veterinarian', code: 'NO_VET' },
        { status: 400 }
      );
    }

    // Check if already rated
    const { data: existingRating } = await supabase
      .from('consultation_ratings')
      .select('id')
      .eq('consultation_id', consultationId)
      .single();

    if (existingRating) {
      return NextResponse.json(
        { error: 'This consultation has already been rated', code: 'ALREADY_RATED' },
        { status: 400 }
      );
    }

    // Insert rating
    const { error: insertError } = await supabase
      .from('consultation_ratings')
      .insert({
        consultation_id: consultationId,
        customer_id: user.id,
        vet_id: consultation.vet_id,
        rating,
        feedback_text: feedback?.trim() || null,
      });

    if (insertError) {
      console.error('Failed to insert rating:', insertError);
      return NextResponse.json(
        { error: 'Failed to save rating', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Update vet's average rating
    await updateVetAverageRating(consultation.vet_id);

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating', code: 'RATE_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Updates the vet's average rating based on all their ratings
 */
async function updateVetAverageRating(vetId: string) {
  try {
    // Calculate new average
    const { data: ratings, error: fetchError } = await supabaseAdmin
      .from('consultation_ratings')
      .select('rating')
      .eq('vet_id', vetId);

    if (fetchError || !ratings || ratings.length === 0) {
      return;
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    // Update vet profile
    await supabaseAdmin
      .from('vet_profiles')
      .update({
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        updated_at: new Date().toISOString(),
      })
      .eq('id', vetId);
  } catch (error) {
    console.error('Failed to update vet average rating:', error);
  }
}
