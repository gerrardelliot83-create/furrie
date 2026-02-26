import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/care-plans/[id]/steps/[stepId]/responses — List responses for a step
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('care_plan_step_responses')
      .select('*, profiles:user_id (full_name, avatar_url)')
      .eq('step_id', stepId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch responses', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET responses:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/care-plans/[id]/steps/[stepId]/responses — Add a response
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { responseText, mediaUrls, mediaTypes } = body;

    if (!responseText && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Response must include text or media', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('care_plan_step_responses')
      .insert({
        step_id: stepId,
        user_id: user.id,
        response_text: responseText || null,
        media_urls: mediaUrls || [],
        media_types: mediaTypes || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating response:', error);
      return NextResponse.json(
        { error: 'Failed to create response', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST response:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
