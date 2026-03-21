import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PackSize } from '@/types';
import { PACK_UNIT_PRICE, PACK_PRICING } from '@/types';

interface TestActivateRequest {
  customerId: string;
  packSize: PackSize;
}

/**
 * POST /api/admin/packs/test-activate
 *
 * Admin-only endpoint to create a consultation pack directly,
 * simulating a successful payment. Used for end-to-end testing
 * of pack purchase, credit tracking, and credit usage.
 *
 * Request body: { customerId: string, packSize: 3 | 5 | 10 }
 * Response: { pack, paymentId, message }
 */
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
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as TestActivateRequest;

    // Validate request
    if (!body.customerId) {
      return NextResponse.json(
        { error: 'customerId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.packSize || ![3, 5, 10].includes(body.packSize)) {
      return NextResponse.json(
        { error: 'packSize must be 3, 5, or 10', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify customer exists and is a customer role
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
        { error: 'User is not a customer', code: 'NOT_CUSTOMER' },
        { status: 400 }
      );
    }

    const packSize = body.packSize;
    const pricing = PACK_PRICING[packSize];

    // Create a test payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_id: body.customerId,
        cashfree_order_id: `TEST_${Date.now().toString(36).toUpperCase()}`,
        amount: pricing.totalPrice,
        currency: 'INR',
        status: 'completed',
        metadata: {
          type: 'pack_purchase',
          packSize,
          unitPrice: PACK_UNIT_PRICE,
          discountPercent: pricing.discount,
          gateway: 'test',
          test_activation: true,
          activated_by: user.id,
        },
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('Failed to create test payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create test payment record', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Create the consultation pack
    const { data: pack, error: packError } = await supabaseAdmin
      .from('consultation_packs')
      .insert({
        customer_id: body.customerId,
        pack_size: packSize,
        total_consultations: packSize,
        unit_price: PACK_UNIT_PRICE,
        discount_percent: pricing.discount,
        total_price: pricing.totalPrice,
        status: 'active',
        payment_id: paymentRecord.id,
      })
      .select('id, pack_size, total_consultations, remaining_count, total_price, status, purchased_at')
      .single();

    if (packError) {
      console.error('Failed to create test pack:', packError);
      return NextResponse.json(
        { error: 'Failed to create pack', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        pack,
        paymentId: paymentRecord.id,
        message: `Test pack of ${packSize} activated for ${customer.full_name}. ${packSize} credits available.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/packs/test-activate:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
