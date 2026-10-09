import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { revalidatePath } from 'next/cache';
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
 *   'system' — the stale-call cron closed it because Daily showed the vet and
 *              the customer in the call together (V rule set, A-07, VC-1b).
 */
export type CompletionTrigger = 'vet' | 'system';

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Drop cached copies of the pages that show this consultation, after it
 * closes or its notes are sent (CTO review item 6). Internal paths: the
 * portals are served from vet./app. hosts through rewrites. Call it from the
 * request or cron handler itself, not from inside after().
 */
export function revalidateConsultationPages(consultationId: string): void {
  const paths = [
    `/vet-portal/consultations/${consultationId}`,
    '/vet-portal/consultations',
    '/vet-portal/dashboard',
    `/customer-portal/consultations/${consultationId}`,
    '/customer-portal/consultations',
    '/customer-portal/dashboard',
  ];
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.warn(`[completion] revalidatePath(${path}) failed:`, err);
    }
  }
}

/** True when a saved note has what the "notes are ready" email promises. */
export function noteIsComplete(
  note: { chief_complaint: string | null; provisional_diagnosis: string | null } | null
): boolean {
  return !!note?.chief_complaint?.trim() && !!note?.provisional_diagnosis?.trim();
}

/** createNotification returns its error instead of throwing; make it throw so it is reported. */
function notified(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`in-app notification: ${result.error.message}`);
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

interface DeliveryContext {
  consultationId: string;
  customerId: string;
  vetId: string;
  petId: string;
  customerEmail: string | null;
  customerName: string;
  vetFullName: string | null;
  petName: string;
  followUpExpiry: string | null;
}

/**
 * Create the consultation's follow-up thread unless one exists. The thread is
 * also the "notes were sent to the pet parent" marker. There is no unique
 * index on follow_up_threads.consultation_id (backlog V-7), so if two requests
 * both insert, only the one holding the earliest thread keeps it; the other
 * deletes its own brand-new row. Returns whether this call created it.
 */
async function claimFollowUpThread(ctx: DeliveryContext): Promise<boolean> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('follow_up_threads')
    .select('id')
    .eq('consultation_id', ctx.consultationId)
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) return false;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('follow_up_threads')
    .insert({
      consultation_id: ctx.consultationId,
      customer_id: ctx.customerId,
      vet_id: ctx.vetId,
      pet_id: ctx.petId,
      is_active: true,
      expires_at: ctx.followUpExpiry,
    })
    .select('id')
    .single();
  if (insertError || !inserted) throw new Error(insertError?.message ?? 'thread not created');

  const { data: first } = await supabaseAdmin
    .from('follow_up_threads')
    .select('id')
    .eq('consultation_id', ctx.consultationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);
  if (first && first.length > 0 && first[0].id !== inserted.id) {
    await supabaseAdmin.from('follow_up_threads').delete().eq('id', inserted.id);
    return false;
  }
  return true;
}

/**
 * Send the vet's notes to the pet parent, once: the follow-up thread, the
 * follow-up email and the completion email ("the notes are ready"). Only the
 * call that creates the thread sends the emails. Returns whether it did.
 */
async function deliverNotesOnce(ctx: DeliveryContext): Promise<boolean> {
  let created = false;
  await step('follow_up_thread', ctx.consultationId, async () => {
    created = await claimFollowUpThread(ctx);
  });
  if (!created) return false;

  if (ctx.customerEmail) {
    const to = ctx.customerEmail;
    await step('follow_up_email', ctx.consultationId, async () => {
      assertSent(
        await sendFollowUpAvailableEmail(to, {
          customerName: ctx.customerName,
          petName: ctx.petName,
          vetName: ctx.vetFullName || 'your vet',
          expiresAt: ctx.followUpExpiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          consultationId: ctx.consultationId,
        }),
        'follow-up email'
      );
    });
    await step('completion_email', ctx.consultationId, async () => {
      assertSent(
        await sendConsultationCompletedEmail(to, {
          customerName: ctx.customerName,
          petName: ctx.petName,
          vetName: ctx.vetFullName || 'your vet',
          consultationId: ctx.consultationId,
        }),
        'completion email'
      );
    });
  }
  return true;
}

/** Everything the delivery and notices need about one consultation. */
async function loadContext(consultationId: string) {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, customer_id, vet_id, pet_id, status, outcome')
    .eq('id', consultationId)
    .maybeSingle();
  if (error || !consultation) return null;

  const [noteResult, customerResult, vetResult, petResult] = await Promise.all([
    supabaseAdmin
      .from('soap_notes')
      .select('id, chief_complaint, provisional_diagnosis')
      .eq('consultation_id', consultationId)
      .maybeSingle(),
    supabaseAdmin.from('profiles').select('email, full_name').eq('id', consultation.customer_id).maybeSingle(),
    consultation.vet_id
      ? supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.vet_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin.from('pets').select('name').eq('id', consultation.pet_id).maybeSingle(),
  ]);

  let isPlusUser = false;
  await step('plus_check', consultationId, async () => {
    isPlusUser = await checkPlusSubscriptionWithClient(supabaseAdmin, consultation.customer_id, consultation.pet_id);
  });

  return {
    consultation,
    hasNotes: noteIsComplete(noteResult.data),
    customerEmail: customerResult.data?.email ?? null,
    customerName: customerResult.data?.full_name || 'there',
    vetFullName: vetResult.data?.full_name ?? null,
    petName: petResult.data?.name || 'your pet',
    followUpExpiry: calculateThreadExpiry(isPlusUser),
  };
}

export type LateNotesResult = 'sent' | 'already_sent' | 'notes_missing' | 'not_success';

/**
 * The cron can close a consultation as a success before the vet has written
 * notes (Daily showed both people in the call). Then nothing had been sent to
 * the pet parent. Once the notes exist, the vet presses "Send notes to the pet
 * parent" (POST /api/vet/consultations/[id]/complete on a closed consultation)
 * and this delivers them once (CTO review of V-1, item 1). The follow-up
 * thread's existence is the "already sent" marker, so no DB change is needed.
 */
export async function deliverLateNotes(consultationId: string): Promise<LateNotesResult> {
  const ctx = await loadContext(consultationId);
  if (!ctx || ctx.consultation.status !== 'closed' || ctx.consultation.outcome !== 'success' || !ctx.consultation.vet_id) {
    return 'not_success';
  }
  if (!ctx.hasNotes) return 'notes_missing';

  const sent = await deliverNotesOnce({
    consultationId,
    customerId: ctx.consultation.customer_id,
    vetId: ctx.consultation.vet_id,
    petId: ctx.consultation.pet_id,
    customerEmail: ctx.customerEmail,
    customerName: ctx.customerName,
    vetFullName: ctx.vetFullName,
    petName: ctx.petName,
    followUpExpiry: ctx.followUpExpiry,
  });
  if (!sent) return 'already_sent';

  await step('customer_notes_notification', consultationId, async () => {
    notified(await createNotification({
      user_id: ctx.consultation.customer_id,
      type: 'consultation_completed',
      title: "The vet's notes are ready",
      body: `The notes from ${ctx.petName}'s consultation with ${formatVetName(ctx.vetFullName)} are ready.`,
      channel: 'in_app',
      data: { consultationId },
    }));
  });
  return 'sent';
}

/**
 * Everything that follows a consultation closing as a success: follow-up
 * expiry, sending the notes (follow-up thread + emails, once), the customer's
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
  const ctx = await loadContext(consultationId);

  if (!ctx || ctx.consultation.status !== 'closed' || ctx.consultation.outcome !== 'success') {
    Sentry.captureMessage('[completion] consultation not closed as success; side effects skipped', {
      level: 'warning',
      extra: { consultationId, trigger },
    });
    return;
  }

  const { customer_id: customerId, vet_id: vetId, pet_id: petId } = ctx.consultation;
  const { hasNotes, customerEmail, customerName, vetFullName, petName, followUpExpiry } = ctx;
  const vetDisplayName = formatVetName(vetFullName);

  await step('follow_up_expiry', consultationId, async () => {
    const { error: expiryError } = await supabaseAdmin
      .from('consultations')
      .update({ follow_up_expires_at: followUpExpiry })
      .eq('id', consultationId);
    if (expiryError) throw new Error(expiryError.message);
  });

  // The notes go to the pet parent (follow-up chat + emails) once they exist.
  // Without notes (cron close), the vet sends them later: deliverLateNotes.
  if (hasNotes && vetId) {
    await deliverNotesOnce({
      consultationId,
      customerId,
      vetId,
      petId,
      customerEmail,
      customerName,
      vetFullName,
      petName,
      followUpExpiry,
    });
  }

  await step('customer_notification', consultationId, async () => {
    notified(await createNotification({
      user_id: customerId,
      type: 'consultation_completed',
      title: 'Consultation completed',
      body: hasNotes
        ? `Your consultation for ${petName} with ${vetDisplayName} is complete. The vet's notes are ready.`
        : `Your consultation for ${petName} with ${vetDisplayName} has ended. The vet's notes will appear here once they are written.`,
      channel: 'in_app',
      data: { consultationId },
    }));
  });

  // Closed by the cron without notes: ask the vet to write them.
  if (trigger === 'system' && !hasNotes && vetId) {
    await step('vet_notes_reminder', consultationId, async () => {
      notified(await createNotification({
        user_id: vetId,
        type: 'consultation_closed',
        title: 'Please add your notes',
        body: `The consultation for ${petName} was closed automatically after the call. Please add your notes, then press "Send notes to the pet parent".`,
        channel: 'in_app',
        data: { consultationId },
      }));
    });
  }

  if (FEATURES.ENABLE_INVITES) {
    await step('referrer_reward', consultationId, async () => {
      await grantReferrerRewardIfEligible(customerId);
    });
  }
}
