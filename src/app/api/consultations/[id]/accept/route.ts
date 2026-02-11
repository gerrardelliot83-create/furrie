import { NextResponse } from 'next/server';

/**
 * POST /api/consultations/[id]/accept
 *
 * @deprecated This endpoint is DEPRECATED as of Feb 2026.
 * The instant matching flow (where vets explicitly accept) has been replaced
 * with a scheduling-based system where consultations are pre-assigned to vets.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Consultations are now auto-scheduled with pre-assigned vets.',
      code: 'DEPRECATED',
    },
    { status: 410 }
  );
}
