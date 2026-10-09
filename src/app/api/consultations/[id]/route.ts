import { NextResponse, after } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  mapConsultationWithRelationsFromDB,
  parseCustomerConsultationPatch,
} from '@/lib/utils/consultationMapper';
import { releaseConsultationCredit } from '@/lib/credits/releaseCredit';
import { cancelReturnsCredit } from '@/lib/credits/cancelCredit';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendVetConsultationCancelledEmail } from '@/lib/email';
import { formatScheduledTimeShort } from '@/lib/utils';
import { withRoute } from '@/server/handler';

const CANCELLABLE_STATUSES = ['pending', 'scheduled'];

/**
 * Tell the assigned vet that the customer cancelled (CX-1: they used to hear
 * nothing and could wait in an empty call). Same channels as a new booking:
 * a Broadcast to the open vet portal, an in-app notification and an email.
 * Runs after the response; never throws.
 */
async function notifyVetOfCancellation(consultation: {
  id: string;
  vet_id: string;
  pet_id: string;
  customer_id: string;
  scheduled_at: string;
  consultation_number: string;
}): Promise<void> {
  const [{ data: pet }, { data: vet }, { data: customer }] = await Promise.all([
    supabaseAdmin.from('pets').select('name, species').eq('id', consultation.pet_id).maybeSingle(),
    supabaseAdmin.from('profiles').select('full_name, email').eq('id', consultation.vet_id).maybeSingle(),
    supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.customer_id).maybeSingle(),
  ]);
  const petName = pet?.name || 'A pet';
  const when = formatScheduledTimeShort(consultation.scheduled_at);

  const tasks: Promise<unknown>[] = [];

  // The vet portal refreshes its lists and shows a toast (VetAlerts).
  tasks.push(
    (async () => {
      const channel = supabaseAdmin.channel(`vet:${consultation.vet_id}:notifications`);
      await channel.send({
        type: 'broadcast',
        event: 'consultation_cancelled',
        payload: { consultationId: consultation.id, petName, scheduledAt: consultation.scheduled_at },
      });
      await supabaseAdmin.removeChannel(channel);
    })()
  );

  tasks.push(
    createNotification({
      user_id: consultation.vet_id,
      type: 'consultation_cancelled',
      title: 'Consultation cancelled',
      body: `${petName} · was booked for ${when}. The pet parent cancelled.`,
      channel: 'in_app',
      data: {
        consultationId: consultation.id,
        petName,
        scheduledAt: consultation.scheduled_at,
      },
    })
  );

  if (vet?.email) {
    tasks.push(
      sendVetConsultationCancelledEmail(vet.email, {
        vetName: vet.full_name || '',
        petName,
        petSpecies: pet?.species ?? null,
        customerName: customer?.full_name && customer.full_name !== 'User' ? customer.full_name : 'The pet parent',
        scheduledAt: consultation.scheduled_at,
        consultationNumber: consultation.consultation_number,
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[cancel] vet notification failed:', r.reason);
    } else if (r.value && typeof r.value === 'object' && 'success' in r.value && r.value.success === false) {
      console.error('[cancel] vet cancellation email failed:', (r.value as { error?: string }).error);
    }
  }
}

// GET /api/consultations/[id] - Get single consultation
export const GET = withRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();
    const { id } = await params;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Determine if user is a vet by checking vet_profiles table directly
    // This is more reliable than checking profiles.role which could fail
    let isVet = false;

    const { data: vetProfile, error: vetCheckError } = await supabaseAdmin
      .from('vet_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (vetCheckError) {
      console.error('Vet profile check failed:', vetCheckError);
      // Don't fail silently - try alternative approach
      // Check if user is vet_id OR customer_id on this specific consultation
      const { data: consultationOwnership } = await supabaseAdmin
        .from('consultations')
        .select('customer_id, vet_id')
        .eq('id', id)
        .maybeSingle();

      if (!consultationOwnership) {
        return NextResponse.json(
          { error: 'Consultation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if (consultationOwnership.vet_id === user.id) {
        isVet = true;
      } else if (consultationOwnership.customer_id !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to view this consultation', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    } else {
      // vetProfile exists means user is a vet
      isVet = vetProfile !== null;
    }

    // Fetch consultation with relations
    let consultation;
    let queryError;

    if (isVet) {
      // For vets: Use admin client to bypass RLS timing issues
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .select(
          `
          *,
          pets!consultations_pet_id_fkey (
            id,
            name,
            species,
            breed,
            photo_urls
          ),
          profiles!consultations_vet_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          consultation_ratings (
            rating,
            feedback_text
          ),
          prescriptions (
            id,
            pdf_url,
            prescription_number
          ),
          soap_notes (
            id,
            consultation_id,
            vet_id,
            chief_complaint,
            history_present_illness,
            behavior_changes,
            appetite_changes,
            activity_level_changes,
            diet_info,
            previous_treatments,
            environmental_factors,
            other_pets_household,
            general_appearance,
            body_condition_score,
            visible_physical_findings,
            respiratory_pattern,
            gait_mobility,
            vital_signs,
            referenced_media_urls,
            provisional_diagnosis,
            differential_diagnoses,
            confidence_level,
            teleconsultation_limitations,
            medications,
            dietary_recommendations,
            lifestyle_modifications,
            home_care_instructions,
            warning_signs,
            follow_up_timeframe,
            in_person_visit_recommended,
            in_person_urgency,
            referral_specialist,
            additional_diagnostics,
            created_at,
            updated_at
          )
        `
        )
        .eq('id', id)
        .single();

      // Manual security check: ensure vet is assigned
      if (data && data.vet_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this consultation', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Fetch vet_profiles separately (no direct FK from consultations to vet_profiles)
      if (data?.vet_id) {
        const { data: vp } = await supabaseAdmin
          .from('vet_profiles')
          .select('qualifications')
          .eq('id', data.vet_id)
          .single();
        if (vp) {
          (data as Record<string, unknown>).vet_profiles = vp;
        }
      }

      // Fetch consultation_media separately (admin client to match vet branch RLS bypass)
      if (data?.id) {
        const { data: mediaData } = await supabaseAdmin
          .from('consultation_media')
          .select('id, consultation_id, uploaded_by, media_type, url, thumbnail_url, file_name, file_size_bytes, created_at')
          .eq('consultation_id', data.id)
          .order('created_at', { ascending: true });
        (data as Record<string, unknown>).consultation_media = mediaData ?? [];
      }

      consultation = data;
      queryError = error;
    } else {
      // For customers: Use regular client with RLS
      const { data, error } = await supabase
        .from('consultations')
        .select(
          `
          *,
          pets!consultations_pet_id_fkey (
            id,
            name,
            species,
            breed,
            photo_urls
          ),
          profiles!consultations_vet_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          consultation_ratings (
            rating,
            feedback_text
          ),
          prescriptions (
            id,
            pdf_url,
            prescription_number
          ),
          soap_notes (
            id,
            consultation_id,
            vet_id,
            chief_complaint,
            history_present_illness,
            behavior_changes,
            appetite_changes,
            activity_level_changes,
            diet_info,
            previous_treatments,
            environmental_factors,
            other_pets_household,
            general_appearance,
            body_condition_score,
            visible_physical_findings,
            respiratory_pattern,
            gait_mobility,
            vital_signs,
            referenced_media_urls,
            provisional_diagnosis,
            differential_diagnoses,
            confidence_level,
            teleconsultation_limitations,
            medications,
            dietary_recommendations,
            lifestyle_modifications,
            home_care_instructions,
            warning_signs,
            follow_up_timeframe,
            in_person_visit_recommended,
            in_person_urgency,
            referral_specialist,
            additional_diagnostics,
            created_at,
            updated_at
          )
        `
        )
        .eq('id', id)
        .eq('customer_id', user.id)
        .single();

      // Fetch vet_profiles separately (no direct FK from consultations to vet_profiles)
      if (data?.vet_id) {
        const { data: vp } = await supabase
          .from('vet_profiles')
          .select('qualifications')
          .eq('id', data.vet_id)
          .single();
        if (vp) {
          (data as Record<string, unknown>).vet_profiles = vp;
        }
      }

      // Fetch consultation_media separately (RLS-scoped — participants_view_media policy)
      if (data?.id) {
        const { data: mediaData } = await supabase
          .from('consultation_media')
          .select('id, consultation_id, uploaded_by, media_type, url, thumbnail_url, file_name, file_size_bytes, created_at')
          .eq('consultation_id', data.id)
          .order('created_at', { ascending: true });
        (data as Record<string, unknown>).consultation_media = mediaData ?? [];
      }

      consultation = data;
      queryError = error;
    }

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Consultation not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error fetching consultation:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch consultation', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map to TypeScript interface
    const mappedConsultation = mapConsultationWithRelationsFromDB(
      consultation as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
    );

    return NextResponse.json({ consultation: mappedConsultation });
  } catch (error) {
    console.error('Unexpected error in GET /api/consultations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

// PATCH /api/consultations/[id] - a customer cancels their consultation or
// edits its concern. Nothing else (SEC-3): parseCustomerConsultationPatch()
// refuses every other shape, because the write uses the service role.
export const PATCH = withRoute(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, supabase, profile } = await getRequestUser();
    const { id } = await params;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const patch = parseCustomerConsultationPatch(body);
    if (patch.kind === 'invalid') {
      return NextResponse.json(
        { error: patch.error, code: 'FIELD_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    // Verify consultation exists and belongs to user (read with their session)
    const { data: existing, error: fetchError } = await supabase
      .from('consultations')
      .select('id, status, customer_id, scheduled_at')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check ownership: the customer on the row, signed in as a customer
    if (existing.customer_id !== user.id || profile?.role !== 'customer') {
      return NextResponse.json(
        { error: 'You do not have permission to update this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Writes use the admin client (customers have no UPDATE policy) and repeat
    // the owner and status conditions, so a consultation that changed in the
    // meantime is not touched.
    if (patch.kind === 'cancel') {
      if (!CANCELLABLE_STATUSES.includes(existing.status)) {
        return NextResponse.json(
          {
            error: `Cannot cancel consultation with status "${existing.status}"`,
            code: 'INVALID_TRANSITION',
          },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('consultations')
        .update({ status: 'closed', outcome: 'cancelled' })
        .eq('id', id)
        .eq('customer_id', user.id)
        .in('status', CANCELLABLE_STATUSES)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Error cancelling consultation:', updateError);
        return NextResponse.json(
          { error: 'Failed to update consultation', code: 'UPDATE_ERROR' },
          { status: 500 }
        );
      }
      if (!updated) {
        return NextResponse.json(
          { error: 'This consultation can no longer be cancelled', code: 'INVALID_TRANSITION' },
          { status: 400 }
        );
      }

      // Terms §7.3 (L1 seam 2): the credit comes back when a booked
      // consultation is cancelled more than 5 minutes before it starts. The
      // customer's cancel screens show the same rule (cancelCredit.ts, CX-1).
      let creditReturned = false;
      if (existing.status === 'scheduled' && cancelReturnsCredit(existing.scheduled_at)) {
        const release = await releaseConsultationCredit(id);
        creditReturned = release.released;
      }

      // Only a confirmed booking was ever announced to the vet; a 'pending'
      // one never got that far, so there is nothing to take back.
      if (existing.status === 'scheduled' && updated.vet_id && updated.scheduled_at) {
        const cancelled = {
          id: updated.id,
          vet_id: updated.vet_id,
          pet_id: updated.pet_id,
          customer_id: updated.customer_id,
          scheduled_at: updated.scheduled_at,
          consultation_number: updated.consultation_number,
        };
        after(() => notifyVetOfCancellation(cancelled));
      }

      return NextResponse.json({ consultation: updated, creditReturned });
    }

    // Concern edit: only while the consultation is booked and not started.
    if (existing.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot edit concerns after consultation has started', code: 'EDIT_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('consultations')
      .update(patch.update)
      .eq('id', id)
      .eq('customer_id', user.id)
      .eq('status', 'scheduled')
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error updating consultation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update consultation', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }
    if (!updated) {
      return NextResponse.json(
        { error: 'Cannot edit concerns after consultation has started', code: 'EDIT_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    return NextResponse.json({ consultation: updated });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/consultations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
