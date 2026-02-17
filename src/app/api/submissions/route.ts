import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SubmissionBody {
  type: 'medication' | 'diagnosis';
  name: string;
  category?: string;
  species?: 'dog' | 'cat' | 'both';
  additionalData?: Record<string, unknown>;
}

/**
 * POST /api/submissions
 * Submit a new medication or diagnosis for admin review
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    if (profile?.role !== 'vet') {
      return NextResponse.json(
        { error: 'Only vets can submit new items', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as SubmissionBody;

    if (!body.type || !body.name?.trim()) {
      return NextResponse.json(
        { error: 'Type and name are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!['medication', 'diagnosis'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Type must be medication or diagnosis', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Check for duplicate pending submissions
    const { data: existing } = await supabase
      .from('medication_submissions')
      .select('id')
      .eq('type', body.type)
      .eq('name', body.name.trim())
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This item has already been submitted for review', code: 'DUPLICATE' },
        { status: 409 }
      );
    }

    const { data: submission, error: insertError } = await supabase
      .from('medication_submissions')
      .insert({
        submitted_by: user.id,
        type: body.type,
        name: body.name.trim(),
        category: body.category?.trim() || null,
        species: body.species || null,
        additional_data: body.additionalData || {},
      })
      .select('id, type, name, status, created_at')
      .single();

    if (insertError) {
      console.error('Failed to create submission:', insertError);
      return NextResponse.json(
        { error: 'Failed to create submission', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Error in POST /api/submissions:', error);
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions
 * List submissions — vets see their own, admins see all pending
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    let query = supabase
      .from('medication_submissions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    // Vets only see their own submissions (RLS handles this)
    if (profile?.role !== 'admin') {
      query = query.eq('submitted_by', user.id);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Failed to fetch submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: submissions || [] });
  } catch (error) {
    console.error('Error in GET /api/submissions:', error);
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
