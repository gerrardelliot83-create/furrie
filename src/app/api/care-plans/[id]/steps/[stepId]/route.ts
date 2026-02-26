import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/care-plans/[id]/steps/[stepId] — Update step details
export async function PATCH(
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
    const { title, instructions, stepType, stepOrder, dueDate, requiresResponse, status } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (instructions !== undefined) updates.instructions = instructions;
    if (stepType !== undefined) updates.step_type = stepType;
    if (stepOrder !== undefined) updates.step_order = stepOrder;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (requiresResponse !== undefined) updates.requires_response = requiresResponse;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('care_plan_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .single();

    if (error) {
      console.error('Error updating step:', error);
      return NextResponse.json(
        { error: 'Failed to update step', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH step:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/care-plans/[id]/steps/[stepId] — Delete a step
export async function DELETE(
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

    const { error } = await supabase
      .from('care_plan_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      console.error('Error deleting step:', error);
      return NextResponse.json(
        { error: 'Failed to delete step', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE step:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
