import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';

/**
 * GET /api/cron/expire-packs
 *
 * Vercel Cron job that expires consultation packs past their validity window.
 * Only affects packs that have an expires_at date set.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: expiredPacks, error } = await supabaseAdmin
    .from('consultation_packs')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', now)
    .select('id, customer_id, pack_size, remaining_count');

  if (error) {
    console.error('Failed to expire packs:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // Create notifications for expired packs (per-user; broadcast updates the bell)
  if (expiredPacks && expiredPacks.length > 0) {
    await Promise.all(expiredPacks.map((pack) => createNotification({
      user_id: pack.customer_id,
      type: 'pack_expired',
      title: 'Consultation pack expired',
      body: `Your pack of ${pack.pack_size} consultations has expired with ${pack.remaining_count} unused credits.`,
      channel: 'in_app',
      data: { packId: pack.id, remainingCount: pack.remaining_count },
    })));
  }

  return NextResponse.json({
    processed: expiredPacks?.length || 0,
    expired: expiredPacks || [],
  });
}
