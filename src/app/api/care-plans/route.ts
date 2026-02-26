import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendCarePlanCreatedEmail } from '@/lib/email';
import type { CarePlanCategory } from '@/types';

const VALID_CATEGORIES: CarePlanCategory[] = [
  'preventive', 'treatment', 'nutrition', 'vaccination', 'medication', 'supplement', 'custom',
];

const VALID_STEP_TYPES = [
  'medication', 'supplement', 'test', 'vaccination', 'nutrition', 'exercise', 'video_check_in', 'custom',
];

// GET /api/care-plans?petId=xxx — List care plans for a pet
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const vetId = searchParams.get('vetId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    let query = supabase
      .from('care_plans')
      .select(`
        *,
        care_plan_steps (id, status),
        pets!care_plans_pet_id_fkey (id, name, species, breed, photo_urls),
        vet:profiles!care_plans_vet_id_fkey (id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (petId) query = query.eq('pet_id', petId);
    if (vetId) query = query.eq('vet_id', vetId);
    if (customerId) query = query.eq('customer_id', customerId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching care plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch care plans', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Add step progress counts
    const plans = (data || []).map((plan) => {
      const steps = plan.care_plan_steps || [];
      const totalSteps = steps.length;
      const completedSteps = steps.filter((s: { status: string }) => s.status === 'completed').length;
      return {
        ...plan,
        totalSteps,
        completedSteps,
      };
    });

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('Unexpected error in GET /api/care-plans:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/care-plans — Create a care plan with steps
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    if (!profile || profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Only vets can create care plans', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { petId, title, description, category, status: planStatus, steps } = body;

    // Validate required fields
    if (!petId || !title || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: petId, title, category', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Get pet owner
    const { data: pet } = await supabase
      .from('pets')
      .select('owner_id')
      .eq('id', petId)
      .single();

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create the care plan
    const { data: plan, error: planError } = await supabase
      .from('care_plans')
      .insert({
        pet_id: petId,
        vet_id: user.id,
        customer_id: pet.owner_id,
        title,
        description: description || null,
        category,
        status: planStatus || 'active',
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating care plan:', planError);
      return NextResponse.json(
        { error: 'Failed to create care plan', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Create steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepRows = steps.map((step: {
        title: string;
        instructions?: string;
        stepType: string;
        dueDate?: string;
        requiresResponse?: boolean;
      }, index: number) => {
        if (!step.title || !step.stepType) {
          throw new Error(`Step ${index + 1} missing required fields`);
        }
        if (!VALID_STEP_TYPES.includes(step.stepType)) {
          throw new Error(`Step ${index + 1} has invalid stepType`);
        }
        return {
          care_plan_id: plan.id,
          title: step.title,
          instructions: step.instructions || null,
          step_type: step.stepType,
          step_order: index + 1,
          due_date: step.dueDate || null,
          requires_response: step.requiresResponse || false,
        };
      });

      const { error: stepsError } = await supabase
        .from('care_plan_steps')
        .insert(stepRows);

      if (stepsError) {
        console.error('Error creating care plan steps:', stepsError);
        // Plan was created but steps failed — still return the plan
        return NextResponse.json({
          data: plan,
          warning: 'Plan created but some steps failed to save',
        }, { status: 201 });
      }
    }

    // Fetch the complete plan with steps
    const { data: completePlan } = await supabase
      .from('care_plans')
      .select(`
        *,
        care_plan_steps (*)
      `)
      .eq('id', plan.id)
      .single();

    // Send notification + email if plan is active (published)
    if (plan.status === 'active') {
      const stepCount = steps?.length || 0;

      // Get customer and vet profile info for notification/email
      const [customerResult, vetResult, petResult2] = await Promise.all([
        supabaseAdmin.from('profiles').select('email, full_name').eq('id', pet.owner_id).single(),
        supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single(),
        supabaseAdmin.from('pets').select('name').eq('id', petId).single(),
      ]);

      // In-app notification
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: pet.owner_id,
          type: 'care_plan_created',
          title: 'New Care Plan',
          body: `Dr. ${vetResult.data?.full_name || 'Your vet'} has created a care plan "${title}" for ${petResult2.data?.name || 'your pet'}.`,
          channel: 'in_app',
          data: { carePlanId: plan.id, petId },
        });
      } catch (notifyErr) {
        console.error('Failed to create care plan notification:', notifyErr);
      }

      // Email notification
      if (customerResult.data?.email) {
        try {
          await sendCarePlanCreatedEmail(customerResult.data.email, {
            customerName: customerResult.data.full_name || 'Pet Parent',
            petName: petResult2.data?.name || 'your pet',
            vetName: vetResult.data?.full_name || 'Your Veterinarian',
            planTitle: title,
            planCategory: category,
            stepCount,
            petId,
          });
        } catch (emailErr) {
          console.error('Failed to send care plan email:', emailErr);
        }
      }
    }

    return NextResponse.json({ data: completePlan }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/care-plans:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
