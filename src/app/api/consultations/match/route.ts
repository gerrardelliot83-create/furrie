import { NextResponse } from 'next/server';

/**
 * POST /api/consultations/match
 *
 * @deprecated This endpoint is DEPRECATED as of Feb 2026.
 * The instant matching flow has been replaced with a scheduling-based system.
 * Use /api/consultations/book for new bookings.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Use /api/consultations/book for scheduling consultations.',
      code: 'DEPRECATED',
    },
    { status: 410 }
  );
}
