import 'server-only';

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface VaccinationEntry {
  name: string;
  date: string;
  nextDueDate?: string;
  administeredBy?: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

/**
 * A vet approves or rejects a vaccination record a pet parent added (A-10).
 *
 * The old routes updated `pets` with the vet's own session; the pets UPDATE
 * policy is owner-only, so the update matched 0 rows and the routes still
 * said "approved". Now: signed in, role vet, active, and the vet must have a
 * consultation with this pet; then the write uses the service role and is
 * read back, so success is only reported when the record really changed.
 * (Agent S handles the pet owner's own self-approve path.)
 */
export async function handleVaccinationDecision(
  request: Request,
  decision: 'approved' | 'rejected'
): Promise<NextResponse> {
  const { user, error: authError } = await getRequestUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'vet' || profile.is_active === false) {
    return NextResponse.json({ error: 'Unauthorized - Vet access required', code: 'VET_REQUIRED' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    petId?: unknown;
    vaccinationIndex?: unknown;
    reason?: unknown;
  };
  const { petId, vaccinationIndex, reason } = body;

  if (typeof petId !== 'string' || !petId || !Number.isInteger(vaccinationIndex) || (vaccinationIndex as number) < 0) {
    return NextResponse.json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (decision === 'rejected' && (typeof reason !== 'string' || reason.trim().length === 0)) {
    return NextResponse.json({ error: 'Rejection reason is required', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  // Only a vet who has had a consultation with this pet may decide.
  const { data: consultations, error: linkError } = await supabaseAdmin
    .from('consultations')
    .select('id')
    .eq('vet_id', user.id)
    .eq('pet_id', petId)
    .limit(1);
  if (linkError) {
    console.error('Error checking vet-pet link:', linkError);
    return NextResponse.json({ error: 'Failed to load pet', code: 'FETCH_ERROR' }, { status: 500 });
  }
  if (!consultations || consultations.length === 0) {
    return NextResponse.json({ error: 'Pet not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const { data: pet, error: petError } = await supabaseAdmin
    .from('pets')
    .select('vaccination_history')
    .eq('id', petId)
    .maybeSingle();
  if (petError || !pet) {
    return NextResponse.json({ error: 'Pet not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const index = vaccinationIndex as number;
  const history = (pet.vaccination_history as VaccinationEntry[] | null) ?? null;
  if (!history || !history[index]) {
    return NextResponse.json({ error: 'Vaccination record not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const now = new Date().toISOString();
  history[index] =
    decision === 'approved'
      ? { ...history[index], status: 'approved', approvedBy: user.id, approvedAt: now }
      : {
          ...history[index],
          status: 'rejected',
          approvedBy: user.id,
          approvedAt: now,
          rejectionReason: (reason as string).trim(),
        };

  const { data: saved, error: updateError } = await supabaseAdmin
    .from('pets')
    .update({ vaccination_history: history, updated_at: now })
    .eq('id', petId)
    .select('id')
    .maybeSingle();

  if (updateError || !saved) {
    console.error(`Error saving vaccination decision (${decision}):`, updateError);
    return NextResponse.json(
      {
        error: decision === 'approved' ? 'Failed to approve vaccination' : 'Failed to reject vaccination',
        code: 'UPDATE_ERROR',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: decision === 'approved' ? 'Vaccination approved successfully' : 'Vaccination rejected successfully',
  });
}
