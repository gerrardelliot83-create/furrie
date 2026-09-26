/**
 * /api/consultation-requests
 *
 * POST — Customer starts a UPI purchase (L1, 2026-09-25).
 *   Body: { packSize: 1 | 3 | 5 | 10 }
 *   The server prices the pack (GST on top), creates a unique payment
 *   reference and returns everything the pay screen needs (amount, UPI link,
 *   QR code, WhatsApp/call links). One open request per customer:
 *   - an open request for the same pack that isn't marked paid is returned
 *     again (same reference);
 *   - an open request for another pack that isn't marked paid is replaced
 *     (closed as 'replaced' — an admin can still grant it if it was paid);
 *   - a request already marked paid → 409, until an admin has checked it.
 *   Written with the service role after the auth check: amounts only ever
 *   come from the server's price list.
 *
 * GET — Customer fetches their own requests (most recent first).
 */

import { NextResponse, after } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPaymentRequestEmail } from '@/lib/email';
import { FEATURES } from '@/lib/config/features';
import { isPurchasablePackSize, quotePack } from '@/lib/pricing/packs';
import { generatePaymentReference } from '@/lib/upi/reference';
import { APP_URL, UPI_CONFIG } from '@/lib/upi/config';
import {
  PAYMENT_REQUEST_COLUMNS,
  buildPaymentRequestView,
  isPricedRequest,
  type PaymentRequestRow,
} from '@/lib/credits/paymentView';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/utils/rate-limit';
import { withRoute } from '@/server/handler';

const REFERENCE_INDEX = 'l1_uq_credit_requests_reference';
const ONE_PENDING_INDEX = 'uq_one_pending_request_per_customer';

export const POST = withRoute(async function POST(request: Request) {
  try {
    if (!FEATURES.ENABLE_PACK_REQUESTS) {
      return NextResponse.json(
        { error: 'Buying consultations is not currently available', code: 'FEATURE_DISABLED' },
        { status: 404 }
      );
    }

    const rateCheck = checkRateLimit(`buy:${getClientIp(request)}`, RATE_LIMITS.payment);
    if (!rateCheck.success) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const { user, error: authError } = await getRequestUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { packSize?: unknown };
    if (!isPurchasablePackSize(body.packSize)) {
      return NextResponse.json(
        { error: 'Choose 1, 3, 5 or 10 consultations', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const quote = quotePack(body.packSize);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'customer') {
      return NextResponse.json(
        { error: 'Only customer accounts can buy consultations', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    const customer = { name: profile.full_name, email: profile.email ?? user.email ?? null };

    // The customer's open request, if any.
    const { data: open } = await supabaseAdmin
      .from('consultation_credit_requests')
      .select(PAYMENT_REQUEST_COLUMNS)
      .eq('customer_id', user.id)
      .eq('status', 'pending')
      .maybeSingle<PaymentRequestRow>();

    if (open) {
      if (open.payment_claimed_at) {
        return NextResponse.json(
          {
            error: `We're still checking your payment for order ${open.reference_code ?? ''}. You can buy more once it's confirmed.`,
            code: 'PAYMENT_BEING_CHECKED',
            request: isPricedRequest(open) ? buildPaymentRequestView(open, customer) : null,
          },
          { status: 409 }
        );
      }
      if (isPricedRequest(open) && open.pack_size === quote.size && Number(open.amount_inr) === quote.total) {
        return NextResponse.json({ request: buildPaymentRequestView(open, customer) });
      }
      // Replace the unpaid request (a legacy request from before L1 included).
      await supabaseAdmin
        .from('consultation_credit_requests')
        .update({ status: 'cancelled', cancel_reason: 'replaced' })
        .eq('id', open.id)
        .eq('status', 'pending')
        .is('payment_claimed_at', null);
    }

    // Insert with a fresh reference; retry if the reference is already taken.
    let created: PaymentRequestRow | null = null;
    for (let attempt = 1; attempt <= 3 && !created; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('consultation_credit_requests')
        .insert({
          customer_id: user.id,
          requested_quantity: quote.size,
          pack_size: quote.size,
          price_inr: quote.price,
          gst_inr: quote.gst,
          amount_inr: quote.total,
          reference_code: generatePaymentReference(),
          upi_vpa: UPI_CONFIG.vpa,
        })
        .select(PAYMENT_REQUEST_COLUMNS)
        .single<PaymentRequestRow>();

      if (!error && data) {
        created = data;
        break;
      }
      const message = `${error?.message ?? ''} ${error?.details ?? ''}`;
      if (error?.code === '23505' && message.includes(REFERENCE_INDEX)) {
        continue;
      }
      if (error?.code === '23505' && message.includes(ONE_PENDING_INDEX)) {
        // Another tab created one at the same moment: return that one.
        const { data: other } = await supabaseAdmin
          .from('consultation_credit_requests')
          .select(PAYMENT_REQUEST_COLUMNS)
          .eq('customer_id', user.id)
          .eq('status', 'pending')
          .maybeSingle<PaymentRequestRow>();
        if (other && isPricedRequest(other)) {
          return NextResponse.json({ request: buildPaymentRequestView(other, customer) });
        }
      }
      console.error('Credit request insert error:', error);
      return NextResponse.json(
        { error: 'Could not start your order. Please try again.', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (!created) {
      return NextResponse.json(
        { error: 'Could not start your order. Please try again.', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    const view = buildPaymentRequestView(created, customer);

    if (customer.email) {
      const email = customer.email;
      after(async () => {
        const result = await sendPaymentRequestEmail({
          customerEmail: email,
          customerName: customer.name || 'there',
          reference: view.reference,
          packSize: view.packSize,
          price: view.price,
          gst: view.gst,
          total: view.total,
          vpa: view.vpa,
          payUrl: `${APP_URL}/buy`,
        });
        if (!result.success) {
          console.error('[buy] payment request email failed:', result.error);
        }
      });
    }

    return NextResponse.json({ request: view }, { status: 201 });
  } catch (err) {
    console.error('POST /api/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

export const GET = withRoute(async function GET() {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: requests, error } = await supabase
      .from('consultation_credit_requests')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Credit requests fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch requests', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (err) {
    console.error('GET /api/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
