/**
 * /api/treatment-plans
 *
 * GET  ?consultationId=<uuid>
 *   Fetch the Treatment Plan row for a consultation. If none exists yet,
 *   creates a draft prefilled from the consultation's SOAP note and
 *   returns the new draft. Vet-only; enforces vet ownership of the
 *   consultation.
 *
 * POST
 *   Body: { consultationId: string }
 *   Idempotent: returns the existing draft if one already exists,
 *   otherwise creates a new draft prefilled from SOAP. Used by the builder
 *   when the vet explicitly opens the Treatment Plan tab.
 */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildDraftFromSoap,
  loadTreatmentPlanContext,
} from '@/lib/treatment-plans/fetchContext';
import {
  parseTreatmentPlanDraft,
  type TreatmentPlanDraft,
} from '@/lib/treatment-plans/schemas';
import type {
  PreviousPdfEntry,
  TreatmentPlanView,
} from '@/lib/treatment-plans/types';

// ----------------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------------

interface PrescriptionRow {
  id: string;
  prescription_number: string;
  consultation_id: string;
  pdf_url: string | null;
  status: string | null;
  updated_at: string | null;
  version: number;
  finalized_at: string | null;
  observations: string | null;
  diagnosis?: string | null; // not stored; carried in custom_sections? No — we store in-place below
  medications: unknown;
  lab_tests: unknown;
  diet_nutrition: string | null;
  dietary_recommendations: string | null;
  home_care: string | null;
  lifestyle_recommendations: string | null;
  warning_signs: string | null;
  follow_up: unknown;
  follow_up_recommendation: string | null;
  in_person_advisory: string | null;
  custom_sections: unknown;
  previous_pdf_urls: unknown;
}

/**
 * Build the draft object for the builder from a prescriptions row. If the
 * row has new-schema columns populated, those take precedence; otherwise
 * we fall back to the legacy flat columns.
 */
function draftFromRow(
  row: PrescriptionRow,
  fallbackDiagnosis: string
): TreatmentPlanDraft {
  return parseTreatmentPlanDraft({
    observations: row.observations ?? '',
    // Diagnosis is not yet a DB column — we keep it in the draft shape
    // sourced from SOAP on first open. The PATCH endpoint persists it by
    // re-writing custom_sections[0] as a synthetic "Diagnosis" section? NO —
    // simpler: we persist diagnosis into the existing warning_signs sibling?
    // Simplest: store diagnosis in a dedicated column in a follow-up migration.
    // For now we read fallbackDiagnosis from SOAP and let the UI edit it in
    // memory only. PATCH will also accept `diagnosis` but store it in the
    // first custom_section until we ship the dedicated column.
    diagnosis: fallbackDiagnosis,
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
    custom_sections: Array.isArray(row.custom_sections) ? row.custom_sections : [],
  });
}

function parsePreviousPdfUrls(v: unknown): PreviousPdfEntry[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    if (
      typeof o.url !== 'string' ||
      typeof o.finalized_at !== 'string' ||
      typeof o.version !== 'number'
    ) {
      return [];
    }
    return [{ url: o.url, finalized_at: o.finalized_at, version: o.version }];
  });
}

async function verifyVet(userId: string) {
  // Uses supabaseAdmin so role lookup works under either cookie auth or
  // bearer auth (bearer-only mobile requests have no cookies for an
  // RLS-scoped read of the user's own profile to land on).
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return profile?.role === 'vet';
}

// ----------------------------------------------------------------------------
// GET /api/treatment-plans?consultationId=...
// ----------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (!(await verifyVet(user.id))) {
      return NextResponse.json(
        { error: 'Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('consultationId');

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const ctx = await loadTreatmentPlanContext(supabase, user.id, consultationId);
    if (!ctx.ok) {
      return NextResponse.json(
        { error: ctx.error, code: ctx.code },
        { status: ctx.status }
      );
    }

    // Look for an existing prescriptions row for this consultation.
    // Latest by created_at — matches the historical behavior where the
    // consultation detail query uses .order('created_at', {ascending:false}).
    const { data: existingRow } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRow) {
      const row = existingRow as unknown as PrescriptionRow;
      const view: TreatmentPlanView = {
        id: row.id,
        prescriptionNumber: row.prescription_number,
        consultationId: row.consultation_id,
        version: row.version,
        status: (row.status === 'finalized' ? 'finalized' : 'draft') as
          | 'finalized'
          | 'draft',
        finalizedAt: row.finalized_at,
        pdfUrl: row.pdf_url,
        previousPdfUrls: parsePreviousPdfUrls(row.previous_pdf_urls),
        updatedAt: row.updated_at ?? new Date().toISOString(),
        draft: draftFromRow(
          row,
          ctx.soapNote?.provisional_diagnosis ?? ''
        ),
        header: ctx.header,
      };
      return NextResponse.json({ treatmentPlan: view });
    }

    // No row yet — do NOT insert on GET (keeps GET idempotent & cacheable).
    // Return a synthetic draft view with id=null; the UI will POST to
    // create the real row on first edit.
    const prefill = buildDraftFromSoap(ctx.soapNote);
    return NextResponse.json({
      treatmentPlan: null,
      prefill: {
        consultationId,
        draft: prefill,
        header: ctx.header,
        soapNoteId: ctx.soapNote?.id ?? null,
      },
    });
  } catch (err) {
    console.error('GET /api/treatment-plans error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// POST /api/treatment-plans { consultationId }
// ----------------------------------------------------------------------------

interface CreateBody {
  consultationId?: string;
}

export async function POST(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (!(await verifyVet(user.id))) {
      return NextResponse.json(
        { error: 'Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreateBody;
    const consultationId = body.consultationId?.trim();

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const ctx = await loadTreatmentPlanContext(supabase, user.id, consultationId);
    if (!ctx.ok) {
      return NextResponse.json(
        { error: ctx.error, code: ctx.code },
        { status: ctx.status }
      );
    }

    if (!ctx.soapNote) {
      return NextResponse.json(
        {
          error: 'Please complete SOAP notes before creating a treatment plan.',
          code: 'SOAP_REQUIRED',
        },
        { status: 400 }
      );
    }

    // Idempotent: if a draft already exists for this consultation, return it.
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const row = existing as unknown as PrescriptionRow;
      const view: TreatmentPlanView = {
        id: row.id,
        prescriptionNumber: row.prescription_number,
        consultationId: row.consultation_id,
        version: row.version,
        status: (row.status === 'finalized' ? 'finalized' : 'draft') as
          | 'finalized'
          | 'draft',
        finalizedAt: row.finalized_at,
        pdfUrl: row.pdf_url,
        previousPdfUrls: parsePreviousPdfUrls(row.previous_pdf_urls),
        updatedAt: row.updated_at ?? new Date().toISOString(),
        draft: draftFromRow(row, ctx.soapNote.provisional_diagnosis ?? ''),
        header: ctx.header,
      };
      return NextResponse.json({ treatmentPlan: view, created: false });
    }

    // Create a new draft prefilled from SOAP.
    const prefill = buildDraftFromSoap(ctx.soapNote);

    const { data: inserted, error: insertError } = await supabase
      .from('prescriptions')
      .insert({
        consultation_id: consultationId,
        soap_note_id: ctx.soapNote.id,
        vet_id: user.id,
        customer_id: ctx.owner.id,
        pet_id: ctx.pet.id,
        status: 'draft',
        medications: prefill.medications,
        lab_tests: prefill.lab_tests,
        observations: prefill.observations || null,
        diet_nutrition: prefill.diet_nutrition || null,
        home_care: prefill.home_care || null,
        // Legacy columns kept populated for backward-compat with the old API:
        dietary_recommendations: prefill.diet_nutrition || null,
        lifestyle_recommendations: prefill.home_care || null,
        warning_signs: prefill.warning_signs || null,
        follow_up: prefill.follow_up,
        follow_up_recommendation: prefill.follow_up.timeframe || null,
        in_person_advisory: prefill.in_person_advisory || null,
        custom_sections: prefill.custom_sections,
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      console.error('Treatment plan insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to create treatment plan', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    const row = inserted as unknown as PrescriptionRow;
    const view: TreatmentPlanView = {
      id: row.id,
      prescriptionNumber: row.prescription_number,
      consultationId: row.consultation_id,
      version: row.version,
      status: 'draft',
      finalizedAt: null,
      pdfUrl: row.pdf_url,
      previousPdfUrls: [],
      updatedAt: row.updated_at ?? new Date().toISOString(),
      draft: draftFromRow(row, ctx.soapNote.provisional_diagnosis ?? ''),
      header: ctx.header,
    };

    return NextResponse.json({ treatmentPlan: view, created: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/treatment-plans error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
