import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STEP_TYPES = [
  'medication', 'supplement', 'test', 'vaccination', 'nutrition', 'exercise', 'video_check_in', 'custom',
];

// GET /api/care-plans/[id]/steps — List steps for a plan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('care_plan_steps')
      .select('*, care_plan_step_responses (*)')
      .eq('care_plan_id', id)
      .order('step_order', { ascending: true });

    if (error) {
      console.error('Error fetching steps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch steps', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/care-plans/[id]/steps:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/care-plans/[id]/steps — Add a new step
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, instructions, stepType, dueDate, requiresResponse } = body;

    if (!title || !stepType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, stepType', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!VALID_STEP_TYPES.includes(stepType)) {
      return NextResponse.json(
        { error: `Invalid stepType. Must be one of: ${VALID_STEP_TYPES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Get current max step_order
    const { data: existingSteps } = await supabase
      .from('care_plan_steps')
      .select('step_order')
      .eq('care_plan_id', id)
      .order('step_order', { ascending: false })
      .limit(1);

    const nextOrder = existingSteps && existingSteps.length > 0
      ? existingSteps[0].step_order + 1
      : 1;

    const { data, error } = await supabase
      .from('care_plan_steps')
      .insert({
        care_plan_id: id,
        title,
        instructions: instructions || null,
        step_type: stepType,
        step_order: nextOrder,
        due_date: dueDate || null,
        requires_response: requiresResponse || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating step:', error);
      return NextResponse.json(
        { error: 'Failed to create step', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/care-plans/[id]/steps:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
