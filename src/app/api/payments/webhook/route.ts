import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature, SKIP_PAYMENTS, PAYMENT_GATEWAY } from '@/lib/payments';
import type { PaymentStatus } from '@/lib/payments/types';
import {
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  sendVetNewBookingEmail,
} from '@/lib/email';

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
        // Get consultation details including vet_id for notification
        const { data: consultation } = await supabase
          .from('consultations')
          .select('vet_id')
          .eq('id', payment.consultation_id)
          .single();

        // Update status to 'scheduled' after successful payment
        const { error: consultationUpdateError } = await supabase
          .from('consultations')
          .update({
            payment_id: orderId,
            amount_paid: amount || payment.amount,
            status: 'scheduled',
          })
          .eq('id', payment.consultation_id)
          .eq('status', 'pending'); // Optimistic lock - only update if still pending

        if (consultationUpdateError) {
          console.error('Failed to update consultation after payment:', consultationUpdateError);
        } else if (consultation?.vet_id) {
          // Send realtime notification to vet about status change
          try {
            const channel = supabase.channel(`vet:${consultation.vet_id}:notifications`);
            await channel.send({
              type: 'broadcast',
              event: 'consultation_updated',
              payload: {
                consultationId: payment.consultation_id,
                newStatus: 'scheduled',
              },
            });
            await supabase.removeChannel(channel);
          } catch (notifyError) {
            console.error('Failed to send vet notification:', notifyError);
          }

          // Send emails after payment (non-blocking)
          try {
            // Fetch full consultation details for emails
            const { data: fullConsultation } = await supabase
              .from('consultations')
              .select('consultation_number, scheduled_at, is_priority, pet_id, customer_id')
              .eq('id', payment.consultation_id)
              .single();

            if (fullConsultation) {
              // Fetch customer, vet, and pet details in parallel
              const [customerResult, vetResult, petResult] = await Promise.all([
                supabase.from('profiles').select('email, full_name').eq('id', fullConsultation.customer_id).single(),
                supabase.from('profiles').select('email, full_name').eq('id', consultation.vet_id).single(),
                supabase.from('pets').select('name, species').eq('id', fullConsultation.pet_id).single(),
              ]);

              const customerEmail = customerResult.data?.email;
              const customerName = customerResult.data?.full_name || 'there';
              const vetEmail = vetResult.data?.email;
              const vetName = vetResult.data?.full_name || 'Doctor';
              const petName = petResult.data?.name || 'your pet';
              const petSpecies = petResult.data?.species || 'dog';

              // Send booking confirmation to customer
              if (customerEmail) {
                const bookingEmailResult = await sendBookingConfirmationEmail(customerEmail, {
                  customerName,
                  petName,
                  vetName,
                  scheduledAt: fullConsultation.scheduled_at,
                  consultationNumber: fullConsultation.consultation_number,
                });
                if (!bookingEmailResult.success) {
                  console.error('Booking confirmation email failed:', bookingEmailResult.error);
                }

                // Send payment receipt
                const receiptEmailResult = await sendPaymentReceiptEmail(customerEmail, {
                  customerName,
                  petName,
                  consultationNumber: fullConsultation.consultation_number,
                  amount: amount || payment.amount,
                  paymentId: transactionId || orderId,
                  paidAt: new Date().toISOString(),
                });
                if (!receiptEmailResult.success) {
                  console.error('Payment receipt email failed:', receiptEmailResult.error);
                }
              }

              // Send new booking email to vet
              if (vetEmail) {
                const vetBookingEmailResult = await sendVetNewBookingEmail(vetEmail, {
                  vetName,
                  customerName,
                  petName,
                  petSpecies,
                  scheduledAt: fullConsultation.scheduled_at,
                  consultationNumber: fullConsultation.consultation_number,
                  isPriority: fullConsultation.is_priority || false,
                });
                if (!vetBookingEmailResult.success) {
                  console.error('Vet booking email failed:', vetBookingEmailResult.error);
                }
              }
            }
          } catch (emailError) {
            console.error('Failed to send payment emails:', emailError);
          }
        }
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
