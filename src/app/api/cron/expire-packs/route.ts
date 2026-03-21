import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/expire-packs
 *
 * Vercel Cron job that expires consultation packs past their validity window.
 * Only affects packs that have an expires_at date set.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

  // Create notifications for expired packs
  if (expiredPacks && expiredPacks.length > 0) {
    const notifications = expiredPacks.map((pack) => ({
      user_id: pack.customer_id,
      type: 'pack_expired',
      title: 'Consultation pack expired',
      body: `Your pack of ${pack.pack_size} consultations has expired with ${pack.remaining_count} unused credits.`,
      channel: 'in_app' as const,
      data: { packId: pack.id, remainingCount: pack.remaining_count },
    }));

    await supabaseAdmin.from('notifications').insert(notifications);
  }

  return NextResponse.json({
    processed: expiredPacks?.length || 0,
    expired: expiredPacks || [],
  });
}
