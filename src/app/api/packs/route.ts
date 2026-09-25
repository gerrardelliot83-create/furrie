import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { withRoute } from '@/server/handler';

const PACK_STATUSES = ['active', 'exhausted', 'expired', 'cancelled'] as const;

/**
 * GET /api/packs[?status=active|exhausted|expired|cancelled]
 * List the customer's consultation packs with balance.
 *
 * `status=active` returns only packs that can still be used: active, with
 * credits left and not past their expiry date (the hourly expiry cron may not
 * have marked them yet). The mobile app has always sent `?status=active`;
 * before L1 the parameter was ignored and expired packs looked usable.
 */
export const GET = withRoute(async function GET(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const status = new URL(request.url).searchParams.get('status');

    let query = supabase
      .from('consultation_packs')
      .select('*')
      .eq('customer_id', user.id)
      .order('purchased_at', { ascending: false });

    if (status && (PACK_STATUSES as readonly string[]).includes(status)) {
      query = query.eq('status', status);
      if (status === 'active') {
        query = query
          .gt('remaining_count', 0)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      }
    }

    const { data: packs, error } = await query;

    if (error) {
      console.error('Failed to fetch packs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch packs', code: 'QUERY_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ packs: packs || [] });
  } catch (error) {
    console.error('Error in GET /api/packs:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
