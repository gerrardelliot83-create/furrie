/**
 * /api/treatment-plans/[id]
 *
 * PATCH
 *   Body: { updated_at: string, draft: Partial<TreatmentPlanDraft> }
 *   Autosave the section draft for a treatment plan row.
 *   - Vet-only; must own the underlying consultation (vet_id match).
 *   - Rejects edits on finalized plans with 409 (FINALIZED — use regenerate).
 *   - Uses `updated_at` for optimistic concurrency: if the client's
 *     updated_at is older than the DB's, returns 409 STALE_WRITE so the
 *     builder can refresh before retrying. This prevents data loss when
 *     the vet has the builder open in two tabs.
 *   - Validates the draft payload with parse* + validate* helpers.
 */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import {
  parseTreatmentPlanDraft,
  validateTreatmentPlanDraft,
  type TreatmentPlanDraft,
} from '@/lib/treatment-plans/schemas';

interface PatchBody {
  updated_at?: string;
  draft?: Partial<TreatmentPlanDraft>;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: 'id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { user, error: authError, supabase } = await getRequestUser();

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

    if (!profile || profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Load the row, verify ownership and status.
    const { data: row, error: fetchErr } = await supabase
      .from('prescriptions')
      .select('id, vet_id, status, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json(
        { error: 'Treatment plan not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (row.vet_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (row.status === 'finalized') {
      return NextResponse.json(
        {
          error:
            'This treatment plan is finalized. Regenerate a new version to make changes.',
          code: 'FINALIZED',
        },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as PatchBody;

    // Optimistic concurrency check
    if (body.updated_at && row.updated_at && body.updated_at !== row.updated_at) {
      return NextResponse.json(
        {
          error:
            'This treatment plan has been updated elsewhere. Please reload before editing.',
          code: 'STALE_WRITE',
          serverUpdatedAt: row.updated_at,
        },
        { status: 409 }
      );
    }

    const draft = parseTreatmentPlanDraft(body.draft ?? {});
    const errors = validateTreatmentPlanDraft(draft);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors[0], code: 'VALIDATION_ERROR', errors },
        { status: 400 }
      );
    }

    // Persist. We write both the new section columns AND the legacy flat
    // columns (dietary_recommendations, lifestyle_recommendations,
    // follow_up_recommendation) so the old read path in
    // /api/consultations/[id]/detail keeps rendering the latest data.
    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update({
        observations: draft.observations || null,
        medications: draft.medications,
        lab_tests: draft.lab_tests,
        diet_nutrition: draft.diet_nutrition || null,
        dietary_recommendations: draft.diet_nutrition || null,
        home_care: draft.home_care || null,
        lifestyle_recommendations: draft.home_care || null,
        warning_signs: draft.warning_signs || null,
        follow_up: draft.follow_up,
        follow_up_recommendation: draft.follow_up.timeframe || null,
        in_person_advisory: draft.in_person_advisory || null,
        custom_sections: draft.custom_sections,
      })
      .eq('id', id)
      .eq('vet_id', user.id)
      .eq('status', 'draft')
      .select('id, updated_at, version, status')
      .single();

    if (updateError || !updated) {
      console.error('Treatment plan PATCH failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to save treatment plan', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      updatedAt: updated.updated_at,
      version: updated.version,
      status: updated.status,
    });
  } catch (err) {
    console.error('PATCH /api/treatment-plans/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
