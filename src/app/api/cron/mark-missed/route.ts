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

  if (!expiredConsultations || expiredConsultations.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: Array<{
    consultationId: string;
    action: 'marked_missed';
    notifiedCustomer: boolean;
    notifiedVet: boolean;
  }> = [];

  for (const consultation of expiredConsultations) {
    // Mark as closed with missed outcome
    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'closed',
        outcome: 'missed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultation.id)
      .eq('status', 'scheduled'); // Only if still scheduled

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

    // Notify customer (in-app)
    await supabaseAdmin.from('notifications').insert({
      user_id: consultation.customer_id,
      type: 'consultation_missed',
      title: 'Appointment missed',
      body: `Your consultation for ${petName} scheduled for ${dateTimeStr} was missed. You can book a new appointment.`,
      channel: 'in_app',
      data: {
        consultationId: consultation.id,
        scheduledAt: consultation.scheduled_at,
        petName,
      },
    });
    notifiedCustomer = true;

    // Send missed email to customer
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

    // Notify vet if assigned
    if (consultation.vet_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: consultation.vet_id,
        type: 'consultation_missed',
        title: 'Appointment missed',
        body: `Consultation for ${petName} scheduled for ${dateTimeStr} was not joined and has been marked as missed.`,
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

    console.log(`Consultation ${consultation.id} marked as missed`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
