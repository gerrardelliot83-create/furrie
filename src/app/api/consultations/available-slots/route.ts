import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeAvailableSlots } from '@/lib/scheduling';

/**
 * GET /api/consultations/available-slots
 *
 * Returns available appointment slots for the next 7 days.
 * Slots are 30-minute windows when at least one vet is available.
 *
 * Query Parameters:
 * - from: Start date (ISO string, default: now + 15 min)
 * - to: End date (ISO string, default: from + 7 days)
 *
 * Response:
 * {
 *   slots: [
 *     {
 *       date: "2026-02-09",
 *       dayOfWeek: "Sunday",
 *       times: [
 *         { start: "10:00", end: "10:30", datetime: "2026-02-09T10:00:00+05:30" },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    const fromDate = fromParam ? new Date(fromParam) : undefined;
    const toDate = toParam ? new Date(toParam) : undefined;

    // Validate dates if provided
    if (fromDate && isNaN(fromDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid "from" date format', code: 'INVALID_PARAM' },
        { status: 400 }
      );
    }

    if (toDate && isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid "to" date format', code: 'INVALID_PARAM' },
        { status: 400 }
      );
    }

    // Compute available slots
    const slots = await computeAvailableSlots({
      fromDate,
      toDate,
    });

    return NextResponse.json({
      slots,
      meta: {
        fromDate: fromDate?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        toDate: toDate?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalSlots: slots.reduce((acc, day) => acc + day.times.length, 0),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/consultations/available-slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
