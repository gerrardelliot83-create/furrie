/**
 * POST /api/admin/consultation-packs
 *
 * Admin-only: give a customer free consultation credits (goodwill, refunds,
 * testing, offline payments before L1). Paid UPI orders are granted from
 * Credit requests instead, which records the price.
 *
 * Request body: { customerId: string, totalCount: 1–50, source?: 'admin_grant' | 'promo' | 'refund', note?: string }
 * Response: { pack }
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';
import { withRoute } from '@/server/handler';

const GRANT_SOURCES = ['admin_grant', 'promo', 'refund'] as const;

interface CreatePackBody {
  customerId?: string;
  totalCount?: number;
  source?: string;
  note?: string;
}

export const POST = withRoute(async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (auth.error) return auth.error;
    const adminId = auth.user.id;

    const body = (await request.json().catch(() => ({}))) as CreatePackBody;

    if (!body.customerId) {
      return NextResponse.json(
        { error: 'customerId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(body.totalCount) || (body.totalCount as number) < 1 || (body.totalCount as number) > 50) {
      return NextResponse.json(
        { error: 'totalCount must be a whole number between 1 and 50', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const totalCount = body.totalCount as number;

    const source = body.source ?? 'admin_grant';
    if (!(GRANT_SOURCES as readonly string[]).includes(source)) {
      return NextResponse.json(
        { error: `source must be one of: ${GRANT_SOURCES.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

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
    if (customer.role !== 'customer') {
      return NextResponse.json(
        { error: 'Credits can only be given to customer accounts', code: 'NOT_A_CUSTOMER' },
        { status: 400 }
      );
    }

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) || null : null;

    const { data: pack, error: packError } = await supabaseAdmin
      .from('consultation_packs')
      .insert({
        customer_id: body.customerId,
        pack_size: totalCount,
        total_consultations: totalCount,
        unit_price: 0,
        discount_percent: 100,
        total_price: 0,
        status: 'active',
        source,
        granted_by_admin_id: adminId,
        admin_note: note,
      })
      .select('id, pack_size, total_consultations, remaining_count, status, purchased_at')
      .single();

    if (packError || !pack) {
      console.error('Failed to create admin pack:', packError);
      return NextResponse.json(
        { error: 'Failed to create pack', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminId,
      action: 'grant_credits_free',
      targetType: 'customer',
      targetId: body.customerId,
      details: { packId: pack.id, credits: totalCount, source, note },
    });

    return NextResponse.json({ pack }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/consultation-packs error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
