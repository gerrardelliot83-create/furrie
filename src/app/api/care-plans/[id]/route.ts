import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CarePlanStatus } from '@/types';

const VALID_STATUSES: CarePlanStatus[] = ['draft', 'active', 'completed', 'archived'];

// GET /api/care-plans/[id] — Get plan with steps and responses
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
      .from('care_plans')
      .select(`
        *,
        care_plan_steps (
          *,
          care_plan_step_responses (*)
        ),
        pets!care_plans_pet_id_fkey (id, name, species, breed, photo_urls),
        vet:profiles!care_plans_vet_id_fkey (id, full_name, avatar_url),
        customer:profiles!care_plans_customer_id_fkey (id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching care plan:', error);
      return NextResponse.json(
        { error: 'Care plan not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Sort steps by step_order
    if (data.care_plan_steps) {
      data.care_plan_steps.sort(
        (a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order
      );
    }

    const totalSteps = data.care_plan_steps?.length || 0;
    const completedSteps = data.care_plan_steps?.filter(
      (s: { status: string }) => s.status === 'completed'
    ).length || 0;

    return NextResponse.json({
      data: { ...data, totalSteps, completedSteps },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/care-plans/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PATCH /api/care-plans/[id] — Update plan status/details
export async function PATCH(
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
    const { title, description, category, status } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
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
      .from('care_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating care plan:', error);
      return NextResponse.json(
        { error: 'Failed to update care plan', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/care-plans/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
