/**
 * POST /api/admin/consultation-packs
 *
 * Admin-only endpoint to create a consultation pack for a customer
 * via admin grant (no payment required). Used when fulfilling credit requests.
 *
 * Request body: { customerId: string, totalCount: number, source?: string }
 * Response: { pack }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface CreatePackBody {
  customerId?: string;
  totalCount?: number;
  source?: string;
}

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = await createClient();
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreatePackBody;

    if (!body.customerId) {
      return NextResponse.json(
        { error: 'customerId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.totalCount || body.totalCount < 1 || body.totalCount > 50) {
      return NextResponse.json(
        { error: 'totalCount must be between 1 and 50', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', body.customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const source = body.source || 'admin_grant';

    // Create the consultation pack
    const { data: pack, error: packError } = await supabaseAdmin
      .from('consultation_packs')
      .insert({
        customer_id: body.customerId,
        pack_size: body.totalCount,
        total_consultations: body.totalCount,
        unit_price: 0,
        discount_percent: 100,
        total_price: 0,
        status: 'active',
        source,
        granted_by_admin_id: user.id,
      })
      .select('id, pack_size, total_consultations, remaining_count, status, purchased_at')
      .single();

    if (packError) {
      console.error('Failed to create admin pack:', packError);
      return NextResponse.json(
        { error: 'Failed to create pack', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pack }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/consultation-packs error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
