import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Shared guard for the Vercel cron routes.
 *
 * SEC-8: every cron used `if (process.env.CRON_SECRET && header !== secret)`,
 * which means an unset secret disabled the check entirely and anyone could
 * trigger the jobs. Now a missing secret in production is a 401, the
 * comparison is constant-time, and local development without a secret still
 * works (with a warning) so the routes can be exercised by hand.
 *
 * Returns a NextResponse to send back early, or null when the request is
 * authorised.
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[cron] CRON_SECRET is not set; refusing to run');
      return NextResponse.json(
        { error: 'Cron secret not configured', code: 'CRON_NOT_CONFIGURED' },
        { status: 401 }
      );
    }
    console.warn('[cron] CRON_SECRET is not set; allowing unauthenticated run (non-production only)');
    return null;
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header);

  const ok = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}
