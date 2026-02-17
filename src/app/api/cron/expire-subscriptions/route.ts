import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSubscriptionExpiredEmail } from '@/lib/email';

/**
 * GET /api/cron/expire-subscriptions
 *
 * Vercel Cron job that runs hourly to expire active subscriptions
 * whose expires_at date has passed.
 *
 * Cron schedule: Every hour (see vercel.json)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date().toISOString();

  // Find active subscriptions past their expiry date
  const { data: expiredSubs, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      id,
      customer_id,
      pet_id,
      expires_at,
      pets!subscriptions_pet_id_fkey (name)
    `)
    .eq('status', 'active')
    .lt('expires_at', now);

  if (fetchError) {
    console.error('Failed to fetch expired subscriptions:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!expiredSubs || expiredSubs.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: Array<{
    subscriptionId: string;
    customerId: string;
    notified: boolean;
  }> = [];

  for (const sub of expiredSubs) {
    // Mark subscription as expired
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', sub.id)
      .eq('status', 'active');

    if (updateError) {
      console.error(`Failed to expire subscription ${sub.id}:`, updateError);
      continue;
    }

    const petData = sub.pets as unknown as { name: string } | null;
    const petName = petData?.name || 'your pet';
    let notified = false;

    // Send notification email
    const { data: customerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', sub.customer_id)
      .single();

    if (customerProfile?.email) {
      const emailResult = await sendSubscriptionExpiredEmail(customerProfile.email, {
        customerName: customerProfile.full_name || 'there',
        petName,
        expiredAt: sub.expires_at,
      });
      if (!emailResult.success) {
        console.error('Subscription expired email failed:', emailResult.error);
      }
      notified = true;
    }

    // Create in-app notification
    await supabaseAdmin.from('notifications').insert({
      user_id: sub.customer_id,
      type: 'subscription_expired',
      title: 'Furrie Plus expired',
      body: `Your Furrie Plus subscription for ${petName} has expired.`,
      channel: 'in_app',
      data: {
        subscriptionId: sub.id,
        petName,
      },
    });

    results.push({
      subscriptionId: sub.id,
      customerId: sub.customer_id,
      notified,
    });

    console.log(`Subscription ${sub.id} expired`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
