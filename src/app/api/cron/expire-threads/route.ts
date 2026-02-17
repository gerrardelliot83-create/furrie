import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/expire-threads
 *
 * Vercel Cron job that runs hourly to deactivate follow-up threads
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

  // Find active threads past their expiry date
  const { data: expiredThreads, error: fetchError } = await supabaseAdmin
    .from('follow_up_threads')
    .select('id, consultation_id')
    .eq('is_active', true)
    .lt('expires_at', now);

  if (fetchError) {
    console.error('Failed to fetch expired threads:', fetchError);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!expiredThreads || expiredThreads.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: Array<{
    threadId: string;
    consultationId: string;
  }> = [];

  for (const thread of expiredThreads) {
    const { error: updateError } = await supabaseAdmin
      .from('follow_up_threads')
      .update({ is_active: false })
      .eq('id', thread.id)
      .eq('is_active', true);

    if (updateError) {
      console.error(`Failed to expire thread ${thread.id}:`, updateError);
      continue;
    }

    results.push({
      threadId: thread.id,
      consultationId: thread.consultation_id,
    });

    console.log(`Thread ${thread.id} expired`);
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
