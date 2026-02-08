import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaymentStatus, SKIP_PAYMENTS } from '@/lib/payments';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    // First check our database for the payment
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .select('*')
      .eq('cashfree_order_id', orderId)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('Database error fetching payment:', dbError);
    }

    // If payment exists in DB, return its status
    if (payment) {
      // Verify the payment belongs to the requesting user
      if (payment.customer_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: payment.cashfree_order_id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.status === 'completed' ? payment.updated_at : null,
        devMode: SKIP_PAYMENTS,
      });
    }

    // Otherwise, check with payment gateway (or mock)
    const statusResponse = await getPaymentStatus({ orderId });

    return NextResponse.json({
      success: statusResponse.success,
      orderId: statusResponse.orderId,
      status: statusResponse.status,
      amount: statusResponse.amount,
      currency: statusResponse.currency,
      paidAt: statusResponse.paidAt,
      error: statusResponse.error,
      devMode: SKIP_PAYMENTS,
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
