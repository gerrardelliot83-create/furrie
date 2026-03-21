import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMissedAppointmentEmail } from '@/lib/email';

/**
 * GET /api/cron/mark-missed
 *
 * Vercel Cron job that runs every 5 minutes to mark consultations as missed
 * if no one joined within the join window (45 minutes after scheduled time).
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
  // Join window is 45 minutes after scheduled time
  // So if scheduled_at + 45 min < now, the window has expired
  const windowExpiredBefore = new Date(now.getTime() - 45 * 60 * 1000);

  // Find consultations where join window has expired
  const { data: expiredConsultations, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      pets!consultations_pet_id_fkey (name)
    `)
    .eq('status', 'scheduled')
    .lt('scheduled_at', windowExpiredBefore.toISOString());

  if (fetchError) {
    console.error('Failed to fetch expired consultations:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // Also find stale 'active' consultations that were never closed
  // (e.g., Daily.co webhook failed, browser crashed during call)
  // Active consultations older than 2 hours are considered stale
  const staleActiveCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const { data: staleActiveConsultations, error: staleError } = await supabaseAdmin
    .from('consultations')
    .select(`
      id,
      customer_id,
      vet_id,
      scheduled_at,
      pets!consultations_pet_id_fkey (name)
    `)
    .eq('status', 'active')
    .lt('updated_at', staleActiveCutoff.toISOString());

  if (staleError) {
    console.error('Failed to fetch stale active consultations:', staleError);
  }

  // Merge both lists for processing
  const allExpired = [
    ...(expiredConsultations || []).map((c) => ({ ...c, _reason: 'missed' as const })),
    ...(staleActiveConsultations || []).map((c) => ({ ...c, _reason: 'stale_active' as const })),
  ];

  if (allExpired.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: Array<{
    consultationId: string;
    action: 'marked_missed';
    notifiedCustomer: boolean;
    notifiedVet: boolean;
  }> = [];

  for (const consultation of allExpired) {
    const isMissed = consultation._reason === 'missed';
    const outcome = isMissed ? 'missed' : 'failed';
    const expectedStatus = isMissed ? 'scheduled' : 'active';

    // Mark as closed with appropriate outcome
    const updateData: Record<string, unknown> = {
      status: 'closed',
      outcome,
      updated_at: new Date().toISOString(),
    };

    // For stale active consultations, cap duration at 60 minutes
    // to prevent absurd duration values (e.g., 13935 min from days-old 'active' status)
    if (!isMissed) {
      updateData.duration_minutes = 0;
      updateData.ended_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update(updateData)
      .eq('id', consultation.id)
      .eq('status', expectedStatus); // Only if still in expected status

    if (updateError) {
      console.error(`Failed to mark consultation ${consultation.id} as missed:`, updateError);
      continue;
    }

    // Supabase returns joined data as objects (not arrays) for !fkey syntax
    const petData = consultation.pets as unknown as { name: string } | null;
    const petName = petData?.name || 'your pet';
    const scheduledTime = new Date(consultation.scheduled_at);
    const dateTimeStr = scheduledTime.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let notifiedCustomer = false;
    let notifiedVet = false;

    const notifTitle = isMissed ? 'Appointment missed' : 'Consultation ended';
    const notifBody = isMissed
      ? `Your consultation for ${petName} scheduled for ${dateTimeStr} was missed. You can book a new appointment.`
      : `Your consultation for ${petName} has been automatically closed due to inactivity.`;

    // Notify customer (in-app)
    await supabaseAdmin.from('notifications').insert({
      user_id: consultation.customer_id,
      type: isMissed ? 'consultation_missed' : 'consultation_closed',
      title: notifTitle,
      body: notifBody,
      channel: 'in_app',
      data: {
        consultationId: consultation.id,
        scheduledAt: consultation.scheduled_at,
        petName,
      },
    });
    notifiedCustomer = true;

    // Send missed email to customer (only for scheduled-missed, not stale active)
    if (isMissed) {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', consultation.customer_id)
        .single();

      if (customerProfile?.email) {
        const emailResult = await sendMissedAppointmentEmail(customerProfile.email, {
          customerName: customerProfile.full_name || 'there',
          petName,
          scheduledAt: consultation.scheduled_at,
        });
        if (!emailResult.success) {
          console.error('Missed appointment email failed:', emailResult.error);
        }
      }
    }

    // Notify vet if assigned
    if (consultation.vet_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: consultation.vet_id,
        type: isMissed ? 'consultation_missed' : 'consultation_closed',
        title: notifTitle,
        body: isMissed
          ? `Consultation for ${petName} scheduled for ${dateTimeStr} was not joined and has been marked as missed.`
          : `Consultation for ${petName} has been automatically closed due to inactivity.`,
        channel: 'in_app',
        data: {
          consultationId: consultation.id,
          scheduledAt: consultation.scheduled_at,
          petName,
        },
      });
      notifiedVet = true;
    }

    results.push({
      consultationId: consultation.id,
      action: 'marked_missed',
      notifiedCustomer,
      notifiedVet,
    });

    console.log(`Consultation ${consultation.id} marked as ${isMissed ? 'missed' : 'stale-closed'}`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
