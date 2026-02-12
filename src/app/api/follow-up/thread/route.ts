import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  checkSoapExists,
  checkPlusSubscription,
  calculateThreadExpiry,
} from '@/lib/utils/followUpHelpers';

interface CreateThreadRequest {
  consultationId: string;
}

/**
 * POST /api/follow-up/thread
 * Create a follow-up thread for a consultation
 * Called after vet submits SOAP notes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateThreadRequest = await request.json();
    const { consultationId } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required', code: 'MISSING_CONSULTATION_ID' },
        { status: 400 }
      );
    }

    // Get consultation details
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('id, customer_id, vet_id, pet_id, status')
      .eq('id', consultationId)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'CONSULTATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify caller is the vet assigned to this consultation
    if (consultation.vet_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned vet can create a follow-up thread', code: 'NOT_ASSIGNED_VET' },
        { status: 403 }
      );
    }

    // Check if SOAP notes exist
    const soapExists = await checkSoapExists(consultationId);
    if (!soapExists) {
      return NextResponse.json(
        { error: 'SOAP notes must be submitted before creating a follow-up thread', code: 'SOAP_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('follow_up_threads')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();

    if (existingThread) {
      // Return existing thread
      return NextResponse.json({
        thread: existingThread,
        created: false,
      });
    }

    // Check if customer has Plus subscription for this pet
    const isPlusUser = await checkPlusSubscription(
      consultation.customer_id,
      consultation.pet_id
    );

    // Calculate expiry based on subscription
    const expiresAt = calculateThreadExpiry(isPlusUser);

    // Create new thread using admin client to bypass RLS
    // Authorization is already validated above (vet must be assigned to consultation)
    const { data: newThread, error: createError } = await supabaseAdmin
      .from('follow_up_threads')
      .insert({
        consultation_id: consultationId,
        customer_id: consultation.customer_id,
        vet_id: consultation.vet_id,
        pet_id: consultation.pet_id,
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating follow-up thread:', createError);
      return NextResponse.json(
        { error: 'Failed to create follow-up thread', code: 'CREATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      thread: newThread,
      created: true,
      isPlusUser,
    });
  } catch (error) {
    console.error('Error in follow-up thread creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/follow-up/thread?consultationId=xxx
 * Get follow-up thread for a consultation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get consultationId from query params
    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('consultationId');

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required', code: 'MISSING_CONSULTATION_ID' },
        { status: 400 }
      );
    }

    // Get thread with verification that user is a participant
    const { data: thread, error: threadError } = await supabase
      .from('follow_up_threads')
      .select('*')
      .eq('consultation_id', consultationId)
      .or(`customer_id.eq.${user.id},vet_id.eq.${user.id}`)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: 'Thread not found or not accessible', code: 'THREAD_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if thread is expired
    const isExpired = thread.expires_at
      ? new Date(thread.expires_at) < new Date()
      : false;

    return NextResponse.json({
      thread,
      isExpired,
    });
  } catch (error) {
    console.error('Error fetching follow-up thread:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
