import { NextResponse } from 'next/server';

/**
 * GET /api/cron/reassign-stale
 *
 * @deprecated This cron job is DEPRECATED as of Feb 2026.
 * The instant matching flow has been replaced with a scheduling-based system.
 * This endpoint is no longer configured in vercel.json.
 * Use /api/cron/send-reminders and /api/cron/mark-missed for the scheduling flow.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'This cron job is deprecated. The instant matching flow has been replaced with scheduling.',
      code: 'DEPRECATED',
    },
    { status: 410 }
  );
}
