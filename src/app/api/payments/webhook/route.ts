import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature, SKIP_PAYMENTS, PAYMENT_GATEWAY } from '@/lib/payments';
import type { PaymentStatus } from '@/lib/payments/types';

// Disable body parsing to get raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-verify') ||
                      request.headers.get('x-cashfree-signature') ||
                      '';

    // Verify webhook signature (skipped in dev mode)
    if (!SKIP_PAYMENTS) {
      const isValid = verifyWebhookSignature(rawBody, signature, PAYMENT_GATEWAY);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
          { status: 401 }
        );
      }
    }

    // Parse the webhook payload
    let payload: {
      order_id?: string;
      orderId?: string;
      cf_order_id?: string;
      transaction_id?: string;
      transactionId?: string;
      cf_payment_id?: string;
      order_status?: string;
      payment_status?: string;
      status?: string;
      order_amount?: number;
      amount?: number;
      payment_method?: string;
      paymentMethod?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    // Extract order details (handle different gateway formats)
    const orderId = payload.order_id || payload.orderId || payload.cf_order_id;
    const transactionId = payload.transaction_id || payload.transactionId || payload.cf_payment_id;
    const statusRaw = payload.order_status || payload.payment_status || payload.status;
    const amount = payload.order_amount || payload.amount;
    const paymentMethod = payload.payment_method || payload.paymentMethod;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order ID', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    // Map gateway status to our status
    const statusMap: Record<string, PaymentStatus> = {
      'PAID': 'completed',
      'SUCCESS': 'completed',
      'completed': 'completed',
      'FAILED': 'failed',
      'FAILURE': 'failed',
      'failed': 'failed',
      'PENDING': 'pending',
      'pending': 'pending',
      'PROCESSING': 'processing',
      'processing': 'processing',
      'REFUNDED': 'refunded',
      'refunded': 'refunded',
    };

    const status: PaymentStatus = statusMap[statusRaw || ''] || 'pending';

    // Use admin client to update payment (bypasses RLS)
    const supabase = createClient();

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        cashfree_payment_id: transactionId,
        status: status,
        payment_method: paymentMethod,
        metadata: {
          webhook_received_at: new Date().toISOString(),
          raw_status: statusRaw,
          gateway: PAYMENT_GATEWAY,
        },
      })
      .eq('cashfree_order_id', orderId);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      // Don't fail - we still need to acknowledge the webhook
    }

    // If payment completed, update related consultation/subscription
    if (status === 'completed') {
      // Get the payment to find related records
      const { data: payment } = await supabase
        .from('payments')
        .select('consultation_id, subscription_id, amount')
        .eq('cashfree_order_id', orderId)
        .single();

      if (payment?.consultation_id) {
        await supabase
          .from('consultations')
          .update({
            payment_id: orderId,
            amount_paid: amount || payment.amount,
          })
          .eq('id', payment.consultation_id);
      }

      if (payment?.subscription_id) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
          })
          .eq('id', payment.subscription_id);
      }
    }

    // Acknowledge webhook receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 to prevent webhook retries for unrecoverable errors
    return NextResponse.json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
}
