import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/packs
 * List customer's consultation packs with balance
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: packs, error } = await supabase
      .from('consultation_packs')
      .select('*')
      .eq('customer_id', user.id)
      .order('purchased_at', { ascending: false });

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
}
