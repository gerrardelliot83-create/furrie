import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/pets/[id]/consultation-count
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    const { count, error } = await supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', id)
      .eq('customer_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to count consultations', code: 'COUNT_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/pets/[id]/consultation-count:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
