import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createOrder, SKIP_PAYMENTS, PAYMENT_GATEWAY } from '@/lib/payments';
import type { PackSize } from '@/types';
import { PACK_UNIT_PRICE, PACK_PRICING } from '@/types';

interface PurchaseRequest {
  packSize: PackSize;
}

/**
 * POST /api/packs/purchase
 * Create a payment order for a consultation pack purchase
 *
 * Request: { packSize: 3 | 5 | 10 }
 * Response: { orderId, redirectUrl, packDetails }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PurchaseRequest;

    // Validate pack size
    if (!body.packSize || ![3, 5, 10].includes(body.packSize)) {
      return NextResponse.json(
        { error: 'Invalid pack size. Must be 3, 5, or 10.', code: 'INVALID_PACK_SIZE' },
        { status: 400 }
      );
    }

    const packSize = body.packSize as PackSize;
    const pricing = PACK_PRICING[packSize];

    // Create payment order
    const orderResponse = await createOrder({
      customerId: user.id,
      amount: pricing.totalPrice,
      currency: 'INR',
      description: `Consultation Pack of ${packSize}`,
      metadata: {
        type: 'pack_purchase',
        packSize,
        unitPrice: PACK_UNIT_PRICE,
        discountPercent: pricing.discount,
      },
    });

    if (!orderResponse.success) {
      return NextResponse.json(
        { error: orderResponse.error, code: 'ORDER_CREATION_FAILED' },
        { status: 500 }
      );
    }

    // Store payment record
    const { data: paymentRecord, error: dbError } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_id: user.id,
        cashfree_order_id: orderResponse.orderId,
        amount: pricing.totalPrice,
        currency: 'INR',
        status: SKIP_PAYMENTS ? 'completed' : 'pending',
        metadata: {
          type: 'pack_purchase',
          packSize,
          unitPrice: PACK_UNIT_PRICE,
          discountPercent: pricing.discount,
          gateway: PAYMENT_GATEWAY,
          skip_payments: SKIP_PAYMENTS,
        },
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Failed to store payment record:', dbError);
      if (!SKIP_PAYMENTS) {
        return NextResponse.json(
          { error: 'Failed to create payment record', code: 'DB_ERROR' },
          { status: 500 }
        );
      }
    }

    // If in dev bypass mode, create the pack immediately
    if (SKIP_PAYMENTS && paymentRecord) {
      const { data: pack, error: packError } = await supabaseAdmin
        .from('consultation_packs')
        .insert({
          customer_id: user.id,
          pack_size: packSize,
          total_consultations: packSize,
          unit_price: PACK_UNIT_PRICE,
          discount_percent: pricing.discount,
          total_price: pricing.totalPrice,
          status: 'active',
          payment_id: paymentRecord.id,
        })
        .select('id, pack_size, total_consultations, remaining_count, total_price, status')
        .single();

      if (packError) {
        console.error('Failed to create pack in dev mode:', packError);
      }

      return NextResponse.json({
        success: true,
        orderId: orderResponse.orderId,
        devMode: true,
        pack: pack || null,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: orderResponse.orderId,
      gatewayOrderId: orderResponse.gatewayOrderId,
      redirectUrl: orderResponse.redirectUrl,
      status: orderResponse.status,
      devMode: SKIP_PAYMENTS,
      packDetails: {
        packSize,
        unitPrice: PACK_UNIT_PRICE,
        discountPercent: pricing.discount,
        totalPrice: pricing.totalPrice,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/packs/purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
