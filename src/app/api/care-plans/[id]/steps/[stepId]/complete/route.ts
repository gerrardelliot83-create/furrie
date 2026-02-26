import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/care-plans/[id]/steps/[stepId]/complete — Mark step as completed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: planId, stepId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Get the step details
    const { data: step, error: stepError } = await supabase
      .from('care_plan_steps')
      .select('*, care_plans!care_plan_steps_care_plan_id_fkey (vet_id, customer_id, pet_id, title)')
      .eq('id', stepId)
      .single();

    if (stepError || !step) {
      return NextResponse.json(
        { error: 'Step not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const plan = step.care_plans;

    // If step requires response, check for response data
    if (step.requires_response) {
      const body = await request.json().catch(() => ({}));
      const { responseText, mediaUrls, mediaTypes } = body as {
        responseText?: string;
        mediaUrls?: string[];
        mediaTypes?: string[];
      };

      if (!responseText && (!mediaUrls || mediaUrls.length === 0)) {
        return NextResponse.json(
          { error: 'This step requires a response (text or media) before marking complete', code: 'RESPONSE_REQUIRED' },
          { status: 400 }
        );
      }

      // Create the response
      const { error: responseError } = await supabase
        .from('care_plan_step_responses')
        .insert({
          step_id: stepId,
          user_id: user.id,
          response_text: responseText || null,
          media_urls: mediaUrls || [],
          media_types: mediaTypes || [],
        });

      if (responseError) {
        console.error('Error creating step response:', responseError);
        return NextResponse.json(
          { error: 'Failed to save response', code: 'CREATE_ERROR' },
          { status: 500 }
        );
      }
    }

    // Mark step as completed
    const { data: updatedStep, error: updateError } = await supabase
      .from('care_plan_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', stepId)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing step:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete step', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Check if all steps are now completed
    const { data: allSteps } = await supabase
      .from('care_plan_steps')
      .select('id, status')
      .eq('care_plan_id', planId);

    const allCompleted = allSteps && allSteps.length > 0 &&
      allSteps.every((s: { status: string }) => s.status === 'completed');

    // If all steps completed, update plan status
    if (allCompleted) {
      await supabase
        .from('care_plans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', planId);

      // Notify vet that all steps are completed
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: plan.vet_id,
          type: 'care_plan_completed',
          title: 'Care Plan Completed',
          body: `All steps in "${plan.title}" have been completed by the pet parent.`,
          channel: 'in_app',
          data: { carePlanId: planId, petId: plan.pet_id },
        });
      } catch (notifyErr) {
        console.error('Failed to notify vet about plan completion:', notifyErr);
      }
    }

    // Notify vet about step completion with response
    if (step.requires_response && plan.vet_id !== user.id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: plan.vet_id,
          type: 'care_plan_step_response',
          title: 'Care Plan Step Response',
          body: `A response has been submitted for "${step.title}" in care plan "${plan.title}".`,
          channel: 'in_app',
          data: { carePlanId: planId, stepId, petId: plan.pet_id },
        });
      } catch (notifyErr) {
        console.error('Failed to notify vet about step response:', notifyErr);
      }
    }

    return NextResponse.json({
      data: updatedStep,
      allCompleted: !!allCompleted,
    });
  } catch (error) {
    console.error('Unexpected error in POST complete:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
