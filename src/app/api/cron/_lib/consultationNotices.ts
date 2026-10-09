import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendCustomerMissedConsultationEmail, sendOpsConsultationProblemEmail } from '@/lib/email';
import { formatIstDateTime } from '@/lib/time/ist';
import type { FailedReason } from '@/lib/scheduling/outcomes';

/** A consultation a cron or the vet's Finish has just closed (by its own guarded update). */
export interface ClosedConsultation {
  id: string;
  customer_id: string;
  vet_id: string | null;
  scheduled_at: string;
  consultation_number: string | null;
  petName: string;
}

/** createNotification returns its error instead of throwing; make it throw so it is reported. */
function notified(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`in-app notification: ${result.error.message}`);
}

async function notice(name: string, consultationId: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[cron-notices] ${name} failed for ${consultationId}:`, err);
    Sentry.captureException(err, {
      tags: { area: 'consultation_outcome', step: name },
      extra: { consultationId },
    });
  }
}

/**
 * Outcome 'missed': the vet was there and the customer did not join (Daily
 * showed only the vet, or the vet said so at Finish). A consultation nobody
 * opened is 'failed' since VC-1b, never 'missed'.
 */
export async function sendMissedNotices(consultation: ClosedConsultation): Promise<void> {
  const when = `${formatIstDateTime(consultation.scheduled_at)} IST`;
  const pet = consultation.petName;
  const data = { consultationId: consultation.id, scheduledAt: consultation.scheduled_at, petName: pet };

  await notice('customer_in_app', consultation.id, async () => {
    notified(await createNotification({
      user_id: consultation.customer_id,
      type: 'consultation_missed',
      title: 'Consultation missed',
      body: `You didn't join the video call for ${pet}'s consultation on ${when}, so it has been marked as missed. You can book a new time from your dashboard.`,
      channel: 'in_app',
      data,
    }));
  });

  await notice('customer_email', consultation.id, async () => {
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', consultation.customer_id)
      .maybeSingle();
    if (!customer?.email) return;
    const result = await sendCustomerMissedConsultationEmail(customer.email, {
      customerName: customer.full_name || 'there',
      petName: pet,
      scheduledAt: consultation.scheduled_at,
    });
    if (!result.success) throw new Error(`missed email: ${result.error ?? 'send failed'}`);
  });

  if (consultation.vet_id) {
    const vetId = consultation.vet_id;
    await notice('vet_in_app', consultation.id, async () => {
      notified(await createNotification({
        user_id: vetId,
        type: 'consultation_missed',
        title: 'Consultation missed',
        body: `The customer didn't join the call for ${pet} on ${when}. It has been marked as missed.`,
        channel: 'in_app',
        data,
      }));
    });
  }
}

const FAILED_REASON_TEXT: Record<FailedReason, string> = {
  vet_no_show: 'The customer joined the video room, but the vet did not.',
  nobody_connected: 'Neither the vet nor the customer was in the video room.',
  daily_unreachable:
    'Daily could not be reached for 3 hours after the start, so we could not tell who joined.',
  technical_problem: 'The vet reported that they could not connect with the customer (a technical problem).',
};

/**
 * Outcome 'failed': the vet did not come, it could not go ahead, or we cannot
 * tell. Ops is emailed so an admin can follow up (and grant a replacement
 * credit by hand; automatic credit-back is CTO backlog L1-7). `detail` adds a
 * sentence to the reason (e.g. that nobody pressed Join at all).
 */
export async function sendFailedNotices(
  consultation: ClosedConsultation,
  reason: FailedReason,
  detail?: string
): Promise<void> {
  const when = `${formatIstDateTime(consultation.scheduled_at)} IST`;
  const pet = consultation.petName;
  const reasonText = detail ? `${FAILED_REASON_TEXT[reason]} ${detail}` : FAILED_REASON_TEXT[reason];
  const data = { consultationId: consultation.id, scheduledAt: consultation.scheduled_at, petName: pet };

  await notice('ops_email', consultation.id, async () => {
    const [{ data: customer }, vetResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('email, full_name').eq('id', consultation.customer_id).maybeSingle(),
      consultation.vet_id
        ? supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.vet_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const result = await sendOpsConsultationProblemEmail({
      consultationNumber: consultation.consultation_number ?? consultation.id,
      scheduledAt: consultation.scheduled_at,
      petName: pet,
      customerName: customer?.full_name || 'Customer',
      customerEmail: customer?.email ?? null,
      vetName: vetResult.data?.full_name || 'Vet',
      reason: reasonText,
    });
    if (!result.success) throw new Error(`ops email: ${result.error ?? 'send failed'}`);
  });

  await notice('customer_in_app', consultation.id, async () => {
    notified(await createNotification({
      user_id: consultation.customer_id,
      type: 'consultation_closed',
      title: 'Your consultation did not go ahead',
      body: `We're sorry: ${pet}'s consultation on ${when} did not go ahead. Our team has been told and will be in touch.`,
      channel: 'in_app',
      data,
    }));
  });

  if (consultation.vet_id) {
    const vetId = consultation.vet_id;
    await notice('vet_in_app', consultation.id, async () => {
      notified(await createNotification({
        user_id: vetId,
        type: 'consultation_closed',
        title: 'Consultation closed as failed',
        body: `${pet}'s consultation on ${when} was closed as failed. ${reasonText}`,
        channel: 'in_app',
        data,
      }));
    });
  }
}
