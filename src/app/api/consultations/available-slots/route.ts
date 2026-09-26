import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { computeAvailableSlots, SCHEDULING_CONSTANTS } from '@/lib/scheduling';
import { withRoute } from '@/server/handler';

// Bookings are allowed up to 7 days ahead; never compute more than 8 days of
// slots in one request (A-11).
const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 8 * 24 * 60 * 60 * 1000;

/**
 * GET /api/consultations/available-slots
 *
 * Returns available appointment slots for the next 7 days.
 * Slots are 30-minute windows when at least one vet is available.
 *
 * Query Parameters:
 * - from: Start date (ISO string, default: now + 15 min; never before now)
 * - to: End date (ISO string, default: now + 7 days; never after now + 8 days)
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
export const GET = withRoute(async function GET(request: Request) {
  try {
    const { user, error: authError } = await getRequestUser();

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

    // Clamp the range: from >= now, to <= now + 8 days (A-11)
    const now = Date.now();
    const effectiveFrom = new Date(
      Math.max(fromDate?.getTime() ?? now + SCHEDULING_CONSTANTS.MIN_LEAD_TIME_MS, now)
    );
    const effectiveTo = new Date(Math.min(toDate?.getTime() ?? now + DEFAULT_RANGE_MS, now + MAX_RANGE_MS));

    if (effectiveTo <= effectiveFrom) {
      return NextResponse.json(
        { error: '"to" must be after "from" and within the next 8 days', code: 'INVALID_RANGE' },
        { status: 400 }
      );
    }

    const slots = await computeAvailableSlots({
      fromDate: effectiveFrom,
      toDate: effectiveTo,
    });

    return NextResponse.json({
      slots,
      meta: {
        fromDate: effectiveFrom.toISOString(),
        toDate: effectiveTo.toISOString(),
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
});
