import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendConsultationCompletedEmail, sendFollowUpAvailableEmail } from '@/lib/email';
import { checkPlusSubscriptionWithClient, calculateThreadExpiry } from '@/lib/utils/followUpHelpers';
import { grantReferrerRewardIfEligible } from '@/lib/invites/grantReferrerReward';
import { FEATURES } from '@/lib/config/features';
import { formatVetName } from '@/lib/utils';

/**
 * Who closed the consultation as a success:
 *   'vet'    — the vet pressed Finish (POST /api/vet/consultations/[id]/complete);
 *   'system' — the stale-call cron closed it because Daily showed both the vet
 *              and the customer in the room (V rule set, A-07).
 */
export type CompletionTrigger = 'vet' | 'system';

interface EmailResult {
  success: boolean;
  error?: string;
}

/** True when a saved note has what the "notes are ready" email promises. */
export function noteIsComplete(
  note: { chief_complaint: string | null; provisional_diagnosis: string | null } | null
): boolean {
  return !!note?.chief_complaint?.trim() && !!note?.provisional_diagnosis?.trim();
}

async function step(name: string, consultationId: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[completion] ${name} failed for ${consultationId}:`, err);
    Sentry.captureException(err, {
      tags: { area: 'consultation_completion', step: name },
      extra: { consultationId },
    });
  }
}

function assertSent(result: EmailResult, what: string): void {
  if (!result.success) throw new Error(`${what}: ${result.error ?? 'send failed'}`);
}

/**
 * Everything that follows a consultation closing as a success: follow-up
 * expiry, the follow-up chat thread, the customer's completion email and
 * in-app notice, and the invite-reward check.
 *
 * Call it only from the code path whose guarded update flipped the status to
 * closed/success, so it runs once per consultation. Each step is independent:
 * a failure goes to Sentry and does not stop the others. All writes use the
 * service role; the caller has already checked who is asking.
 */
export async function runCompletionSideEffects(
  consultationId: string,
  trigger: CompletionTrigger
): Promise<void> {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, customer_id, vet_id, pet_id, status, outcome')
    .eq('id', consultationId)
    .maybeSingle();

  if (error || !consultation || consultation.status !== 'closed' || consultation.outcome !== 'success') {
    Sentry.captureMessage('[completion] consultation not closed as success; side effects skipped', {
      level: 'warning',
      extra: { consultationId, trigger, error: error?.message },
    });
    return;
  }

  const { customer_id: customerId, vet_id: vetId, pet_id: petId } = consultation;

  const [noteResult, customerResult, vetResult, petResult] = await Promise.all([
    supabaseAdmin
      .from('soap_notes')
      .select('id, chief_complaint, provisional_diagnosis')
      .eq('consultation_id', consultationId)
      .maybeSingle(),
    supabaseAdmin.from('profiles').select('email, full_name').eq('id', customerId).maybeSingle(),
    vetId
      ? supabaseAdmin.from('profiles').select('full_name').eq('id', vetId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin.from('pets').select('name').eq('id', petId).maybeSingle(),
  ]);

  const note = noteResult.data;
  const hasNotes = noteIsComplete(note);
  const customerEmail = customerResult.data?.email ?? null;
  const customerName = customerResult.data?.full_name || 'there';
  const vetFullName = vetResult.data?.full_name ?? null;
  const vetDisplayName = formatVetName(vetFullName);
  const petName = petResult.data?.name || 'your pet';

  let isPlusUser = false;
  await step('plus_check', consultationId, async () => {
    isPlusUser = await checkPlusSubscriptionWithClient(supabaseAdmin, customerId, petId);
  });
  const followUpExpiry = calculateThreadExpiry(isPlusUser);

  await step('follow_up_expiry', consultationId, async () => {
    const { error: expiryError } = await supabaseAdmin
      .from('consultations')
      .update({ follow_up_expires_at: followUpExpiry })
      .eq('id', consultationId);
    if (expiryError) throw new Error(expiryError.message);
  });

  // The follow-up chat opens once the vet's notes exist (same rule as
  // POST /api/follow-up/thread). A thread that already exists is kept.
  if (note && vetId) {
    await step('follow_up_thread', consultationId, async () => {
      const { data: existing } = await supabaseAdmin
        .from('follow_up_threads')
        .select('id')
        .eq('consultation_id', consultationId)
        .limit(1);
      if (existing && existing.length > 0) return;

      const { error: threadError } = await supabaseAdmin.from('follow_up_threads').insert({
        consultation_id: consultationId,
        customer_id: customerId,
        vet_id: vetId,
        pet_id: petId,
        is_active: true,
        expires_at: followUpExpiry,
      });
      if (threadError) throw new Error(threadError.message);

      if (customerEmail) {
        assertSent(
          await sendFollowUpAvailableEmail(customerEmail, {
            customerName,
            petName,
            vetName: vetFullName || 'your vet',
            expiresAt: followUpExpiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            consultationId,
          }),
          'follow-up email'
        );
      }
    });
  }

  if (hasNotes) {
    await step('completion_email', consultationId, async () => {
      if (!customerEmail) return;
      assertSent(
        await sendConsultationCompletedEmail(customerEmail, {
          customerName,
          petName,
          vetName: vetFullName || 'your vet',
          consultationId,
        }),
        'completion email'
      );
    });
  }

  await step('customer_notification', consultationId, async () => {
    await createNotification({
      user_id: customerId,
      type: 'consultation_completed',
      title: 'Consultation completed',
      body: hasNotes
        ? `Your consultation for ${petName} with ${vetDisplayName} is complete. The vet's notes are ready.`
        : `Your consultation for ${petName} with ${vetDisplayName} has ended. The vet's notes will appear here once they are written.`,
      channel: 'in_app',
      data: { consultationId },
    });
  });

  // Closed by the cron without notes: ask the vet to write them.
  if (trigger === 'system' && !hasNotes && vetId) {
    await step('vet_notes_reminder', consultationId, async () => {
      await createNotification({
        user_id: vetId,
        type: 'consultation_closed',
        title: 'Please add your notes',
        body: `The consultation for ${petName} was closed automatically after the call. Please add your notes.`,
        channel: 'in_app',
        data: { consultationId },
      });
    });
  }

  if (FEATURES.ENABLE_INVITES) {
    await step('referrer_reward', consultationId, async () => {
      await grantReferrerRewardIfEligible(customerId);
    });
  }
}
