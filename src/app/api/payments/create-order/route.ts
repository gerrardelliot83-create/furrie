import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createOrder, SKIP_PAYMENTS, PAYMENT_GATEWAY } from '@/lib/payments';
import { sendBookingConfirmationEmail, sendVetNewBookingEmail } from '@/lib/email';
import type { CreateOrderRequest } from '@/lib/payments/types';

export async function POST(request: Request) {
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

    const body = await request.json() as Partial<CreateOrderRequest>;

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    if (!body.consultationId && !body.subscriptionId) {
      return NextResponse.json(
        { error: 'Either consultationId or subscriptionId is required', code: 'MISSING_REFERENCE' },
        { status: 400 }
      );
    }

    // Create the order request
    const orderRequest: CreateOrderRequest = {
      customerId: user.id,
      consultationId: body.consultationId,
      subscriptionId: body.subscriptionId,
      amount: body.amount,
      currency: body.currency || 'INR',
      description: body.description,
      metadata: body.metadata,
    };

    // Create order with payment service
    const orderResponse = await createOrder(orderRequest);

    if (!orderResponse.success) {
      return NextResponse.json(
        { error: orderResponse.error, code: 'ORDER_CREATION_FAILED' },
        { status: 500 }
      );
    }

    // Store payment record using admin client (customers can't INSERT due to RLS)
    const { data: paymentRecord, error: dbError } = await supabaseAdmin
      .from('payments')
      .insert({
        customer_id: user.id,
        consultation_id: body.consultationId || null,
        subscription_id: body.subscriptionId || null,
        cashfree_order_id: orderResponse.orderId,
        amount: orderRequest.amount,
        currency: orderRequest.currency,
        status: SKIP_PAYMENTS ? 'completed' : 'pending',
        metadata: {
          ...orderRequest.metadata,
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

    // If in dev bypass mode and it's a consultation, mark as paid and scheduled
    if (SKIP_PAYMENTS && body.consultationId) {
      console.log('[create-order] SKIP_PAYMENTS mode: updating consultation status to scheduled');

      // Use the payment record's UUID (not the mock order ID string which isn't a valid UUID)
      const paymentUuid = paymentRecord?.id || null;

      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('consultations')
        .update({
          payment_id: paymentUuid,
          amount_paid: orderRequest.amount,
          status: 'scheduled',
        })
        .eq('id', body.consultationId)
        .eq('status', 'pending')
        .select('id, status')
        .single();

      if (updateError) {
        console.error('[create-order] Failed to update consultation status:', updateError);
      } else if (updateData) {
        console.log('[create-order] Successfully updated consultation:', updateData.id, 'to status:', updateData.status);

        // Send booking confirmation emails (mirrors webhook behavior)
        try {
          const { data: consultation } = await supabaseAdmin
            .from('consultations')
            .select('consultation_number, scheduled_at, vet_id, pet_id, customer_id, is_priority')
            .eq('id', body.consultationId)
            .single();

          if (consultation) {
            const [customerResult, vetResult, petResult] = await Promise.all([
              supabaseAdmin.from('profiles').select('email, full_name').eq('id', consultation.customer_id).single(),
              supabaseAdmin.from('profiles').select('email, full_name').eq('id', consultation.vet_id).single(),
              supabaseAdmin.from('pets').select('name, species').eq('id', consultation.pet_id).single(),
            ]);

            const customerEmail = customerResult.data?.email;
            const customerName = customerResult.data?.full_name || 'there';
            const vetEmail = vetResult.data?.email;
            const vetName = vetResult.data?.full_name || 'Doctor';
            const petName = petResult.data?.name || 'your pet';
            const petSpecies = petResult.data?.species || 'dog';

            if (customerEmail) {
              const bookingEmailResult = await sendBookingConfirmationEmail(customerEmail, {
                customerName,
                petName,
                vetName,
                scheduledAt: consultation.scheduled_at,
                consultationNumber: consultation.consultation_number,
              });
              if (!bookingEmailResult.success) {
                console.error('[create-order] Booking confirmation email failed:', bookingEmailResult.error);
              }
            }

            if (vetEmail) {
              const vetEmailResult = await sendVetNewBookingEmail(vetEmail, {
                vetName,
                customerName,
                petName,
                petSpecies,
                scheduledAt: consultation.scheduled_at,
                consultationNumber: consultation.consultation_number,
                isPriority: consultation.is_priority || false,
              });
              if (!vetEmailResult.success) {
                console.error('[create-order] Vet booking email failed:', vetEmailResult.error);
              }
            }
          }
        } catch (emailError) {
          console.error('[create-order] Failed to send booking emails:', emailError);
        }
      } else {
        console.warn('[create-order] No rows updated - consultation may not be in pending status');
      }
    }

    return NextResponse.json({
      success: true,
      orderId: orderResponse.orderId,
      gatewayOrderId: orderResponse.gatewayOrderId,
      redirectUrl: orderResponse.redirectUrl,
      status: orderResponse.status,
      devMode: SKIP_PAYMENTS,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
