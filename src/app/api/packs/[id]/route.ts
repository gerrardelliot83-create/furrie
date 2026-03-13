import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/packs/[id]
 * Get pack detail with usage history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch pack (RLS ensures customer can only see own packs)
    const { data: pack, error: packError } = await supabase
      .from('consultation_packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Pack not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch usage history
    const { data: uses, error: usesError } = await supabase
      .from('consultation_pack_uses')
      .select(`
        id,
        consultation_id,
        used_at,
        consultations!consultation_pack_uses_consultation_id_fkey (
          consultation_number,
          scheduled_at,
          status,
          outcome,
          pets!consultations_pet_id_fkey (name, species)
        )
      `)
      .eq('pack_id', packId)
      .order('used_at', { ascending: false });

    if (usesError) {
      console.error('Failed to fetch pack uses:', usesError);
    }

    return NextResponse.json({
      pack,
      uses: uses || [],
    });
  } catch (error) {
    console.error('Error in GET /api/packs/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
