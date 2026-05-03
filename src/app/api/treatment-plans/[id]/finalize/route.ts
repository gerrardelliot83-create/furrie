/**
 * POST /api/treatment-plans/[id]/finalize
 *
 * Finalize a draft Treatment Plan:
 *   1. Validate the draft against the finalize guard (diagnosis +
 *      warning_signs + at least one of meds/labs/follow-up).
 *   2. Render the PDF.
 *   3. Upload to UploadThing.
 *   4. Transition status → 'finalized', set finalized_at, store pdf_url.
 *      If this is a regenerate (row already finalized), archive the old
 *      pdf_url into previous_pdf_urls and bump version.
 *   5. Send email to the customer with the PDF attached.
 *   6. Create an in-app notification.
 *
 * Body: { draft?: TreatmentPlanDraft }
 *   Optional explicit draft. If omitted, uses the persisted row.
 *
 * Transactional safety: we only transition status → 'finalized' AFTER a
 * successful PDF upload. Email and notifications are best-effort and
 * won't roll back the finalize if they fail.
 */

import { NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import {
  parseTreatmentPlanDraft,
  validateTreatmentPlanForFinalize,
  type TreatmentPlanDraft,
} from '@/lib/treatment-plans/schemas';
import { loadTreatmentPlanContext } from '@/lib/treatment-plans/fetchContext';
import { renderTreatmentPlanPdf } from '@/lib/treatment-plans/renderPdf';
import { sendTreatmentPlanEmail } from '@/lib/email';
import type { PreviousPdfEntry } from '@/lib/treatment-plans/types';

const utapi = new UTApi();

interface FinalizeBody {
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
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Load the row
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

    // Resolve and validate draft.
    const body = (await request.json().catch(() => ({}))) as FinalizeBody;
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

    const errors = validateTreatmentPlanForFinalize(draft);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors[0], code: 'FINALIZE_VALIDATION_FAILED', errors },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------
    // Persist the draft fields first (so if PDF upload fails and we
    // retry, the latest content is already saved). Do not flip status.
    // -----------------------------------------------------------------
    const { error: preSaveError } = await supabase
      .from('prescriptions')
      .update({
        observations: draft.observations || null,
        medications: draft.medications,
        lab_tests: draft.lab_tests,
        diet_nutrition: draft.diet_nutrition || null,
        dietary_recommendations: draft.diet_nutrition || null,
        home_care: draft.home_care || null,
        lifestyle_recommendations: draft.home_care || null,
        warning_signs: draft.warning_signs,
        follow_up: draft.follow_up,
        follow_up_recommendation: draft.follow_up.timeframe || null,
        in_person_advisory: draft.in_person_advisory || null,
        custom_sections: draft.custom_sections,
      })
      .eq('id', id)
      .eq('vet_id', user.id);

    if (preSaveError) {
      console.error('Finalize pre-save failed:', preSaveError);
      return NextResponse.json(
        { error: 'Failed to save treatment plan', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // -----------------------------------------------------------------
    // Render the PDF.
    // -----------------------------------------------------------------
    const nowIso = new Date().toISOString();
    const newVersion = row.version + (row.status === 'finalized' ? 1 : 0);
    const pdfBuffer = await renderTreatmentPlanPdf({
      planNumber: row.prescription_number,
      finalizedAt: nowIso,
      consultationId: row.consultation_id,
      draft,
      header: ctx.header,
    });

    // -----------------------------------------------------------------
    // Upload to UploadThing.
    // -----------------------------------------------------------------
    let newPdfUrl: string | null = null;
    try {
      const uint8Array = new Uint8Array(pdfBuffer);
      const file = new File(
        [uint8Array],
        `treatment-plan-${row.prescription_number}${
          newVersion > 1 ? `-v${newVersion}` : ''
        }.pdf`,
        { type: 'application/pdf' }
      );
      const uploadResponse = await utapi.uploadFiles([file]);
      if (uploadResponse[0]?.data?.ufsUrl) {
        newPdfUrl = uploadResponse[0].data.ufsUrl;
      } else if (uploadResponse[0]?.error) {
        console.error(
          'Treatment plan PDF upload error:',
          uploadResponse[0].error
        );
      }
    } catch (uploadErr) {
      console.error('Treatment plan PDF upload exception:', uploadErr);
    }

    if (!newPdfUrl) {
      return NextResponse.json(
        {
          error: 'Failed to upload treatment plan PDF. Please try again.',
          code: 'UPLOAD_FAILED',
        },
        { status: 502 }
      );
    }

    // -----------------------------------------------------------------
    // Flip status → finalized. If regenerating, archive old pdf_url.
    // -----------------------------------------------------------------
    const previousPdfUrls: PreviousPdfEntry[] = Array.isArray(
      row.previous_pdf_urls
    )
      ? (row.previous_pdf_urls as unknown as PreviousPdfEntry[])
      : [];

    if (row.status === 'finalized' && row.pdf_url) {
      previousPdfUrls.push({
        url: row.pdf_url,
        finalized_at: row.finalized_at ?? nowIso,
        version: row.version,
      });
    }

    const { error: finalizeError } = await supabase
      .from('prescriptions')
      .update({
        status: 'finalized',
        finalized_at: nowIso,
        pdf_url: newPdfUrl,
        version: newVersion,
        previous_pdf_urls: previousPdfUrls,
      })
      .eq('id', id)
      .eq('vet_id', user.id);

    if (finalizeError) {
      console.error('Finalize status update failed:', finalizeError);
      return NextResponse.json(
        { error: 'Failed to finalize treatment plan', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // -----------------------------------------------------------------
    // Side effects (best-effort).
    // -----------------------------------------------------------------
    if (ctx.owner.email) {
      try {
        await sendTreatmentPlanEmail({
          customerEmail: ctx.owner.email,
          customerName: ctx.owner.full_name ?? 'Pet Parent',
          petName: ctx.pet.name,
          vetName: profile.full_name ?? 'Your Veterinarian',
          planNumber: row.prescription_number,
          pdfBuffer: Buffer.from(pdfBuffer),
        });
      } catch (emailErr) {
        console.error('Treatment plan email failed:', emailErr);
      }
    }

    try {
      await createNotification({
        user_id: ctx.owner.id,
        type: 'prescription_ready',
        title: 'Treatment Plan Ready',
        body: `Your treatment plan for ${ctx.pet.name} is ready. Check your email or open the consultation to review it.`,
        channel: 'in_app',
        data: { consultationId: row.consultation_id, treatmentPlanId: id },
      });
    } catch (notifyErr) {
      console.error('Treatment plan notification failed:', notifyErr);
    }

    return NextResponse.json({
      id,
      pdfUrl: newPdfUrl,
      finalizedAt: nowIso,
      version: newVersion,
      status: 'finalized',
    });
  } catch (err) {
    console.error('POST /api/treatment-plans/[id]/finalize error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
