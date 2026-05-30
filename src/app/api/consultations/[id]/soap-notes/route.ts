import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildSoapNoteUpsert,
  mapSoapNoteFromDB,
  SoapValidationError,
} from '@/lib/utils/soapMapper';

/**
 * SOAP notes for a consultation.
 *
 *   POST  /api/consultations/[id]/soap-notes  — create/upsert the full document
 *   PATCH /api/consultations/[id]/soap-notes  — partial autosave (deltas only)
 *
 * Bearer-aware (mobile) / cookie-aware (web) via getRequestUser(). Replaces the
 * web's client-side direct insert/update to `soap_notes` (SOAPForm.tsx) so the
 * mobile app does not depend on undocumented table RLS for writes.
 *
 * Authorization: the caller MUST be the consultation's assigned vet
 * (`consultations.vet_id === user.id`) — checked in app code, stricter than the
 * `soap_notes` RLS ("Vets can manage own SOAP notes"). `vet_id` and
 * `consultation_id` on the row are always set server-side, never trusted from
 * the body. The write uses the service-role client AFTER that check, mirroring
 * the proven pattern in PATCH /api/consultations/[id] and the care-plans route.
 *
 * The soap_notes table has UNIQUE(consultation_id), so a single upsert keyed on
 * consultation_id creates-or-updates the one note per consultation.
 */

async function authorizeAssignedVet(
  consultationId: string
): Promise<{ userId: string } | { errorResponse: NextResponse }> {
  const { user, error: authError } = await getRequestUser();

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const { data: consultation, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select('id, vet_id')
    .eq('id', consultationId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error loading consultation for SOAP auth:', fetchError);
    return {
      errorResponse: NextResponse.json(
        { error: 'Failed to load consultation', code: 'FETCH_ERROR' },
        { status: 500 }
      ),
    };
  }

  if (!consultation) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      ),
    };
  }

  if (consultation.vet_id !== user.id) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'You are not the assigned vet for this consultation',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id };
}

async function upsertSoapNote(
  request: Request,
  consultationId: string,
  partial: boolean
): Promise<NextResponse> {
  const auth = await authorizeAssignedVet(consultationId);
  if ('errorResponse' in auth) return auth.errorResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  let row;
  try {
    row = buildSoapNoteUpsert(body, consultationId, auth.userId, { partial });
  } catch (error) {
    if (error instanceof SoapValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from('soap_notes')
    .upsert(row, { onConflict: 'consultation_id' })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error saving SOAP notes:', error);
    return NextResponse.json(
      { error: 'Failed to save SOAP notes', code: 'SAVE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ soapNote: mapSoapNoteFromDB(data) }, {
    status: partial ? 200 : 201,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await upsertSoapNote(request, id, false);
  } catch (error) {
    console.error('Unexpected error in POST /api/consultations/[id]/soap-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await upsertSoapNote(request, id, true);
  } catch (error) {
    console.error('Unexpected error in PATCH /api/consultations/[id]/soap-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
