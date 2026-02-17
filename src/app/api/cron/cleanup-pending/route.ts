import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/cleanup-pending
 *
 * Vercel Cron job that runs hourly to cancel pending consultations
 * that are older than 2 hours (likely abandoned booking attempts).
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

  const now = new Date();
  // Consultations pending for more than 2 hours are considered abandoned
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const { data: stalePending, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', cutoff);

  if (fetchError) {
    console.error('Failed to fetch stale pending consultations:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!stalePending || stalePending.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const ids = stalePending.map((c) => c.id);

  const { error: updateError, count } = await supabaseAdmin
    .from('consultations')
    .update({
      status: 'closed',
      outcome: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('status', 'pending');

  if (updateError) {
    console.error('Failed to cleanup pending consultations:', updateError);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  console.log(`Cleaned up ${count ?? ids.length} stale pending consultations`);

  return NextResponse.json({
    processed: count ?? ids.length,
    ids,
  });
}
