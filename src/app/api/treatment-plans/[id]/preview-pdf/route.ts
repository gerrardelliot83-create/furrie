/**
 * POST /api/treatment-plans/[id]/preview-pdf
 *
 * Render a preview PDF for the current (unsaved OR saved) draft without
 * changing status, uploading, or sending email. Returns the PDF bytes
 * directly. The builder calls this when the vet clicks "Preview PDF".
 *
 * Body: { draft?: TreatmentPlanDraft }
 *   - If `draft` is supplied, it is used as-is (preview uncommitted edits).
 *   - Otherwise the persisted row is used.
 *
 * Vet-only; must own the underlying consultation.
 */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import {
  parseTreatmentPlanDraft,
  type TreatmentPlanDraft,
} from '@/lib/treatment-plans/schemas';
import { loadTreatmentPlanContext } from '@/lib/treatment-plans/fetchContext';
import { renderTreatmentPlanPdf } from '@/lib/treatment-plans/renderPdf';

interface PreviewBody {
  draft?: unknown;
}

export async function POST(
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

    // Load the row (also gives us consultation_id and plan number)
    const { data: row, error: fetchErr } = await supabase
      .from('prescriptions')
      .select('*')
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

    // Load context (vet, pet, owner, SOAP for fallback diagnosis)
    const ctx = await loadTreatmentPlanContext(
      supabase,
      user.id,
      row.consultation_id
    );
    if (!ctx.ok) {
      return NextResponse.json(
        { error: ctx.error, code: ctx.code },
        { status: ctx.status }
      );
    }

    // Resolve draft: body.draft wins; else reconstruct from the row.
    const body = (await request.json().catch(() => ({}))) as PreviewBody;
    let draft: TreatmentPlanDraft;
    if (body.draft && typeof body.draft === 'object') {
      draft = parseTreatmentPlanDraft(body.draft);
    } else {
      draft = parseTreatmentPlanDraft({
        observations: row.observations ?? '',
        diagnosis: ctx.soapNote?.provisional_diagnosis ?? '',
        lab_tests: Array.isArray(row.lab_tests) ? row.lab_tests : [],
        medications: Array.isArray(row.medications) ? row.medications : [],
        diet_nutrition: row.diet_nutrition ?? row.dietary_recommendations ?? '',
        home_care: row.home_care ?? row.lifestyle_recommendations ?? '',
        warning_signs: row.warning_signs ?? '',
        follow_up:
          row.follow_up && typeof row.follow_up === 'object'
            ? row.follow_up
            : {
                timeframe: row.follow_up_recommendation ?? '',
                mode: 'none',
                notes: '',
              },
        in_person_advisory: row.in_person_advisory ?? '',
        custom_sections: Array.isArray(row.custom_sections)
          ? row.custom_sections
          : [],
      });
    }

    const pdfBuffer = await renderTreatmentPlanPdf({
      planNumber: row.prescription_number,
      finalizedAt: row.finalized_at,
      consultationId: row.consultation_id,
      draft,
      header: ctx.header,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="treatment-plan-${row.prescription_number}-preview.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('POST /api/treatment-plans/[id]/preview-pdf error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
