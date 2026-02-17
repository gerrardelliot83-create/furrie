import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  sendCustomerOneHourReminderEmail,
  sendVetOneHourReminderEmail,
  sendCustomerFifteenMinReminderEmail,
  sendVetFifteenMinReminderEmail,
} from '@/lib/email';

/**
 * GET /api/cron/send-reminders
 *
 * Vercel Cron job that runs every 5 minutes to send consultation reminders.
 * Sends reminders at:
 * - 1 hour before scheduled time
 * - 15 minutes before scheduled time
 *
 * Cron schedule: Every 5 minutes (see vercel.json)
 */
export async function GET(request: Request) {
  // Verify cron secret (set in Vercel environment)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without secret for testing
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const results: Array<{
    consultationId: string;
    reminderType: '1h' | '15m';
    userId: string;
    userType: 'customer' | 'vet';
  }> = [];

  // Calculate time windows
  // 1 hour reminder: scheduled_at between 55-65 minutes from now
  const oneHourWindowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const oneHourWindowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  // 15 minute reminder: scheduled_at between 10-20 minutes from now
  const fifteenMinWindowStart = new Date(now.getTime() + 10 * 60 * 1000);
  const fifteenMinWindowEnd = new Date(now.getTime() + 20 * 60 * 1000);

  // Find consultations needing 1-hour reminder
  const { data: oneHourConsultations, error: error1h } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      pets!consultations_pet_id_fkey (name),
      profiles!consultations_customer_id_fkey (full_name, email)
    `)
    .eq('status', 'scheduled')
    .eq('reminder_1h_sent', false)
    .gte('scheduled_at', oneHourWindowStart.toISOString())
    .lte('scheduled_at', oneHourWindowEnd.toISOString());

  if (error1h) {
    console.error('Failed to fetch 1h reminder consultations:', error1h);
  }

  // Send 1-hour reminders
  for (const consultation of oneHourConsultations || []) {
    const scheduledTime = new Date(consultation.scheduled_at);
    const timeStr = scheduledTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // Supabase returns joined data as objects (not arrays) for !fkey syntax
    const petData = consultation.pets as unknown as { name: string } | null;
    const profileData = consultation.profiles as unknown as { full_name: string; email: string } | null;
    const petName = petData?.name || 'your pet';
    const customerName = profileData?.full_name || 'Pet parent';

    // Send in-app notification to customer
    await supabaseAdmin.from('notifications').insert({
      user_id: consultation.customer_id,
      type: 'consultation_reminder_1h',
      title: 'Appointment in 1 hour',
      body: `Your consultation for ${petName} is scheduled at ${timeStr}. Make sure you have a stable internet connection.`,
      channel: 'in_app',
      data: {
        consultationId: consultation.id,
        scheduledAt: consultation.scheduled_at,
        petName,
      },
    });
    results.push({
      consultationId: consultation.id,
      reminderType: '1h',
      userId: consultation.customer_id,
      userType: 'customer',
    });

    // Send email reminder to customer
    if (profileData?.email) {
      // Fetch vet name for email
      const { data: vetProfile } = consultation.vet_id
        ? await supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.vet_id).single()
        : { data: null };

      await sendCustomerOneHourReminderEmail(profileData.email, {
        customerName,
        petName,
        vetName: vetProfile?.full_name || 'your vet',
        scheduledAt: consultation.scheduled_at,
      }).catch((e) => console.error('1h customer email failed:', e));
    }

    // Send to vet if assigned
    if (consultation.vet_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: consultation.vet_id,
        type: 'consultation_reminder_1h',
        title: 'Appointment in 1 hour',
        body: `Consultation with ${customerName} for ${petName} at ${timeStr}.`,
        channel: 'in_app',
        data: {
          consultationId: consultation.id,
          scheduledAt: consultation.scheduled_at,
          petName,
          customerName,
        },
      });
      results.push({
        consultationId: consultation.id,
        reminderType: '1h',
        userId: consultation.vet_id,
        userType: 'vet',
      });

      // Send email reminder to vet
      const { data: vetUser } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', consultation.vet_id)
        .single();

      if (vetUser?.email) {
        await sendVetOneHourReminderEmail(vetUser.email, {
          vetName: vetUser.full_name || 'Doctor',
          petName,
          customerName,
          scheduledAt: consultation.scheduled_at,
        }).catch((e) => console.error('1h vet email failed:', e));
      }
    }

    // Mark reminder as sent
    await supabaseAdmin
      .from('consultations')
      .update({ reminder_1h_sent: true })
      .eq('id', consultation.id);
  }

  // Find consultations needing 15-minute reminder
  const { data: fifteenMinConsultations, error: error15m } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      daily_room_url,
      pets!consultations_pet_id_fkey (name),
      profiles!consultations_customer_id_fkey (full_name, email)
    `)
    .eq('status', 'scheduled')
    .eq('reminder_15m_sent', false)
    .gte('scheduled_at', fifteenMinWindowStart.toISOString())
    .lte('scheduled_at', fifteenMinWindowEnd.toISOString());

  if (error15m) {
    console.error('Failed to fetch 15m reminder consultations:', error15m);
  }

  // Send 15-minute reminders
  for (const consultation of fifteenMinConsultations || []) {
    const scheduledTime = new Date(consultation.scheduled_at);
    const timeStr = scheduledTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    // Supabase returns joined data as objects (not arrays) for !fkey syntax
    const petData15m = consultation.pets as unknown as { name: string } | null;
    const profileData15m = consultation.profiles as unknown as { full_name: string; email: string } | null;
    const petName = petData15m?.name || 'your pet';
    const customerName15m = profileData15m?.full_name || 'Pet parent';

    // Send in-app notification to customer
    await supabaseAdmin.from('notifications').insert({
      user_id: consultation.customer_id,
      type: 'consultation_reminder_15m',
      title: 'Appointment starting soon',
      body: `Your consultation for ${petName} starts in 15 minutes at ${timeStr}. You can join the waiting room now.`,
      channel: 'in_app',
      data: {
        consultationId: consultation.id,
        scheduledAt: consultation.scheduled_at,
        petName,
        canJoinNow: true,
      },
    });
    results.push({
      consultationId: consultation.id,
      reminderType: '15m',
      userId: consultation.customer_id,
      userType: 'customer',
    });

    // Send email with join link to customer
    if (profileData15m?.email) {
      const { data: vetProfile15m } = consultation.vet_id
        ? await supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.vet_id).single()
        : { data: null };

      await sendCustomerFifteenMinReminderEmail(profileData15m.email, {
        customerName: customerName15m,
        petName,
        vetName: vetProfile15m?.full_name || 'your vet',
        consultationId: consultation.id,
      }).catch((e) => console.error('15m customer email failed:', e));
    }

    // Send to vet if assigned
    if (consultation.vet_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: consultation.vet_id,
        type: 'consultation_reminder_15m',
        title: 'Appointment starting soon',
        body: `Consultation with ${customerName15m} for ${petName} starts in 15 minutes.`,
        channel: 'in_app',
        data: {
          consultationId: consultation.id,
          scheduledAt: consultation.scheduled_at,
          petName,
          customerName: customerName15m,
          canJoinNow: true,
        },
      });
      results.push({
        consultationId: consultation.id,
        reminderType: '15m',
        userId: consultation.vet_id,
        userType: 'vet',
      });

      // Send email with join link to vet
      const { data: vetUser15m } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', consultation.vet_id)
        .single();

      if (vetUser15m?.email) {
        await sendVetFifteenMinReminderEmail(vetUser15m.email, {
          vetName: vetUser15m.full_name || 'Doctor',
          petName,
          customerName: customerName15m,
          consultationId: consultation.id,
        }).catch((e) => console.error('15m vet email failed:', e));
      }
    }

    // Mark reminder as sent
    await supabaseAdmin
      .from('consultations')
      .update({ reminder_15m_sent: true })
      .eq('id', consultation.id);
  }

  console.log(`Sent ${results.length} reminders`);

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
