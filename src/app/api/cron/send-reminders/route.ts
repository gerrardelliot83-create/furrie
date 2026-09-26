import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { verifyCronRequest } from '@/lib/cron/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import {
  sendCustomerOneHourReminderEmail,
  sendVetOneHourReminderEmail,
  sendCustomerStartingSoonEmail,
  sendVetStartingSoonEmail,
} from '@/lib/email';
import { SCHEDULING_CONSTANTS } from '@/lib/scheduling';
import { reminderDue, ONE_HOUR_REMINDER_WINDOW } from '@/lib/scheduling/reminders';
import { formatIstTime } from '@/lib/time/ist';
import { withRoute } from '@/server/handler';

type ReminderFlag = 'reminder_1h_sent' | 'reminder_15m_sent';

interface Candidate {
  id: string;
  customer_id: string;
  vet_id: string | null;
  scheduled_at: string;
  reminder_1h_sent: boolean | null;
  reminder_15m_sent: boolean | null;
  pets: { name: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface Delivery {
  /** At least one channel (in-app or email) reached the customer. */
  customerReached: boolean;
}

/**
 * GET /api/cron/send-reminders   (every 5 minutes, vercel.json)
 *
 * 1-hour and 15-minute reminders to the customer and the vet, in-app and
 * email. Which one is due: src/lib/scheduling/reminders.ts.
 *
 * Each reminder is CLAIMED before it is sent: a guarded update flips its
 * flag, and only the run that flipped it sends — so two overlapping runs
 * can't send twice. If nothing reached the customer, the flag is released
 * so the next run retries, and the failure goes to Sentry.
 *
 * Times are India time. The join window opens 5 minutes before the start,
 * and the 15-minute texts say so. Fails closed without CRON_SECRET
 * (lib/cron/auth.ts).
 */
export const GET = withRoute(async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const now = new Date();
  const horizon = new Date(now.getTime() + ONE_HOUR_REMINDER_WINDOW.upToMinutes * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      reminder_1h_sent,
      reminder_15m_sent,
      pets!consultations_pet_id_fkey (name),
      profiles!consultations_customer_id_fkey (full_name, email)
    `)
    .eq('status', 'scheduled')
    .gt('scheduled_at', now.toISOString())
    .lte('scheduled_at', horizon.toISOString())
    .or('reminder_1h_sent.not.is.true,reminder_15m_sent.not.is.true');

  if (error) {
    console.error('[send-reminders] failed to fetch consultations:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const results: Array<{ consultationId: string; reminderType: '1h' | '15m'; customerReached: boolean }> = [];

  for (const consultation of (data ?? []) as unknown as Candidate[]) {
    if (!consultation.scheduled_at) continue;
    const minutesUntil = (new Date(consultation.scheduled_at).getTime() - now.getTime()) / 60000;
    const decision = reminderDue(minutesUntil, {
      oneHour: consultation.reminder_1h_sent === true,
      fifteenMin: consultation.reminder_15m_sent === true,
    });
    if (decision.send === 'none') continue;

    const flag: ReminderFlag = decision.send === '1h' ? 'reminder_1h_sent' : 'reminder_15m_sent';
    const flagsToSet: ReminderFlag[] =
      decision.send === '15m' && decision.alsoMarkOneHour ? ['reminder_15m_sent', 'reminder_1h_sent'] : [flag];

    const claimed = await setFlags(consultation.id, flagsToSet, true, flag);
    if (!claimed) continue; // another run claimed it, or it is no longer scheduled

    let delivery: Delivery;
    try {
      delivery =
        decision.send === '1h'
          ? await sendOneHourReminders(consultation)
          : await sendStartingSoonReminders(consultation, now);
    } catch (err) {
      console.error(`[send-reminders] ${decision.send} reminder threw for ${consultation.id}:`, err);
      delivery = { customerReached: false };
    }

    if (!delivery.customerReached) {
      await setFlags(consultation.id, flagsToSet, false);
      Sentry.captureMessage(`[send-reminders] ${decision.send} reminder reached nobody; released for retry`, {
        level: 'error',
        extra: { consultationId: consultation.id },
      });
    }

    results.push({
      consultationId: consultation.id,
      reminderType: decision.send,
      customerReached: delivery.customerReached,
    });
  }

  console.log(`[send-reminders] processed ${results.length} reminder(s)`);
  return NextResponse.json({ processed: results.length, results });
});

/**
 * Set reminder flags. With `onlyIfUnset`, this is the claim: the update only
 * matches while that flag is not yet true and the consultation is still
 * scheduled, and it returns whether this call made the change.
 */
async function setFlags(
  consultationId: string,
  flags: ReminderFlag[],
  value: boolean,
  onlyIfUnset?: ReminderFlag
): Promise<boolean> {
  const update = Object.fromEntries(flags.map((f) => [f, value])) as Partial<Record<ReminderFlag, boolean>>;
  let query = supabaseAdmin.from('consultations').update(update).eq('id', consultationId);
  if (onlyIfUnset) {
    query = query.eq('status', 'scheduled').not(onlyIfUnset, 'is', true);
  }
  const { data, error } = await query.select('id').maybeSingle();
  if (error) {
    console.error(`[send-reminders] failed to set ${flags.join(', ')} for ${consultationId}:`, error);
    return false;
  }
  return !!data;
}

async function loadVet(vetId: string | null) {
  if (!vetId) return null;
  const { data } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', vetId).maybeSingle();
  return data;
}

async function attempt(what: string, consultationId: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    const ok = await fn();
    if (!ok) console.error(`[send-reminders] ${what} failed for ${consultationId}`);
    return ok;
  } catch (err) {
    console.error(`[send-reminders] ${what} threw for ${consultationId}:`, err);
    return false;
  }
}

async function sendOneHourReminders(consultation: Candidate): Promise<Delivery> {
  const petName = consultation.pets?.name || 'your pet';
  const customerName = consultation.profiles?.full_name || 'Pet parent';
  const time = formatIstTime(consultation.scheduled_at);
  const data = { consultationId: consultation.id, scheduledAt: consultation.scheduled_at, petName };
  const vet = await loadVet(consultation.vet_id);

  const inApp = await attempt('customer 1h in-app', consultation.id, async () => {
    const { error } = await createNotification({
      user_id: consultation.customer_id,
      type: 'consultation_reminder_1h',
      title: 'Consultation in about an hour',
      body: `Your consultation for ${petName} is at ${time} (India time). Find a quiet spot with a steady internet connection.`,
      channel: 'in_app',
      data,
    });
    return !error;
  });

  const email = consultation.profiles?.email
    ? await attempt('customer 1h email', consultation.id, async () => {
        const result = await sendCustomerOneHourReminderEmail(consultation.profiles!.email!, {
          customerName,
          petName,
          vetName: vet?.full_name || 'your vet',
          scheduledAt: consultation.scheduled_at,
        });
        return result.success;
      })
    : false;

  if (consultation.vet_id) {
    await attempt('vet 1h in-app', consultation.id, async () => {
      const { error } = await createNotification({
        user_id: consultation.vet_id!,
        type: 'consultation_reminder_1h',
        title: 'Consultation in about an hour',
        body: `Consultation with ${customerName} for ${petName} at ${time} (India time).`,
        channel: 'in_app',
        data: { ...data, customerName },
      });
      return !error;
    });
    if (vet?.email) {
      await attempt('vet 1h email', consultation.id, async () => {
        const result = await sendVetOneHourReminderEmail(vet.email!, {
          vetName: vet.full_name || 'Doctor',
          petName,
          customerName,
          scheduledAt: consultation.scheduled_at,
        });
        return result.success;
      });
    }
  }

  return { customerReached: inApp || email };
}

async function sendStartingSoonReminders(consultation: Candidate, now: Date): Promise<Delivery> {
  const petName = consultation.pets?.name || 'your pet';
  const customerName = consultation.profiles?.full_name || 'Pet parent';
  const scheduledAt = new Date(consultation.scheduled_at);
  const joinOpensAt = new Date(scheduledAt.getTime() - SCHEDULING_CONSTANTS.JOIN_WINDOW_BEFORE_MS);
  const canJoinNow = now >= joinOpensAt;
  const time = formatIstTime(scheduledAt);
  const joinText = canJoinNow ? 'You can join now.' : `You can join from ${formatIstTime(joinOpensAt)}.`;
  const data = {
    consultationId: consultation.id,
    scheduledAt: consultation.scheduled_at,
    petName,
    canJoinNow,
    joinOpensAt: joinOpensAt.toISOString(),
  };
  const vet = await loadVet(consultation.vet_id);

  const inApp = await attempt('customer 15m in-app', consultation.id, async () => {
    const { error } = await createNotification({
      user_id: consultation.customer_id,
      type: 'consultation_reminder_15m',
      title: 'Consultation starting soon',
      body: `Your consultation for ${petName} starts at ${time} (India time). ${joinText}`,
      channel: 'in_app',
      data,
    });
    return !error;
  });

  const email = consultation.profiles?.email
    ? await attempt('customer 15m email', consultation.id, async () => {
        const result = await sendCustomerStartingSoonEmail(consultation.profiles!.email!, {
          customerName,
          petName,
          vetName: vet?.full_name || '',
          consultationId: consultation.id,
          scheduledAt: consultation.scheduled_at,
          canJoinNow,
        });
        return result.success;
      })
    : false;

  if (consultation.vet_id) {
    await attempt('vet 15m in-app', consultation.id, async () => {
      const { error } = await createNotification({
        user_id: consultation.vet_id!,
        type: 'consultation_reminder_15m',
        title: 'Consultation starting soon',
        body: `Consultation with ${customerName} for ${petName} starts at ${time} (India time). ${joinText}`,
        channel: 'in_app',
        data: { ...data, customerName },
      });
      return !error;
    });
    if (vet?.email) {
      await attempt('vet 15m email', consultation.id, async () => {
        const result = await sendVetStartingSoonEmail(vet.email!, {
          vetName: vet.full_name || '',
          petName,
          customerName,
          consultationId: consultation.id,
          scheduledAt: consultation.scheduled_at,
          canJoinNow,
        });
        return result.success;
      });
    }
  }

  return { customerReached: inApp || email };
}
