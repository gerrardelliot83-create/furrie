/**
 * POST /api/consultation-requests/[id]/claim
 *
 * The customer says they have paid (L1, 2026-09-25).
 *   Body: { utr?: string }  — the 12-digit UPI transaction ID, optional.
 *
 * Marks the request as claimed (it stays 'pending' until an admin has found
 * the payment and granted) and alerts ops by email with a link to the
 * request in the admin portal. Nothing is granted here. Calling it again is
 * safe: the first claim time is kept, a UTR can be added later, and ops are
 * alerted only the first time.
 */

import { NextResponse, after } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPaymentClaimedOpsEmail } from '@/lib/email';
import { adminRequestUrl } from '@/lib/upi/whatsapp';
import {
  PAYMENT_REQUEST_COLUMNS,
  buildPaymentRequestView,
  isPricedRequest,
  type PaymentRequestRow,
} from '@/lib/credits/paymentView';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/utils/rate-limit';
import { withRoute } from '@/server/handler';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST = withRoute(async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateCheck = checkRateLimit(`claim:${getClientIp(request)}`, RATE_LIMITS.payment);
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

    const { id } = await params;
    if (!UUID.test(id)) {
      return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { utr?: unknown };
    let utr: string | null = null;
    if (typeof body.utr === 'string' && body.utr.trim() !== '') {
      const digits = body.utr.replace(/\s+/g, '');
      if (!/^[0-9]{12}$/.test(digits)) {
        return NextResponse.json(
          { error: 'The UPI transaction ID is the 12-digit number in your UPI app. Leave it empty if you can\'t find it.', code: 'INVALID_UTR' },
          { status: 400 }
        );
      }
      utr = digits;
    }

    const { data: row } = await supabaseAdmin
      .from('consultation_credit_requests')
      .select(PAYMENT_REQUEST_COLUMNS)
      .eq('id', id)
      .maybeSingle<PaymentRequestRow>();

    // Someone else's request looks exactly like a missing one.
    if (!row || row.customer_id !== user.id || !isPricedRequest(row)) {
      return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (row.status !== 'pending') {
      return NextResponse.json(
        { error: 'This order is already closed.', code: 'NOT_OPEN', status: row.status },
        { status: 409 }
      );
    }

    const firstClaim = !row.payment_claimed_at;
    const claimedAt = row.payment_claimed_at ?? new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('consultation_credit_requests')
      .update({
        payment_claimed_at: claimedAt,
        payer_utr: utr ?? row.payer_utr,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select(PAYMENT_REQUEST_COLUMNS)
      .single<PaymentRequestRow>();

    if (updateError || !updated) {
      console.error('Claim update failed:', updateError);
      return NextResponse.json(
        { error: 'Could not save that. Please try again.', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single();
    const customer = { name: profile?.full_name ?? null, email: profile?.email ?? user.email ?? null };
    const view = buildPaymentRequestView(updated, customer);

    // Alert ops the first time, or again when a UTR arrives later.
    if (firstClaim || (utr && utr !== row.payer_utr)) {
      after(async () => {
        const result = await sendPaymentClaimedOpsEmail({
          reference: view.reference,
          packSize: view.packSize,
          total: view.total,
          customerName: customer.name || 'Customer',
          customerEmail: customer.email || '—',
          customerPhone: profile?.phone ?? null,
          utr: view.utr,
          requestedAt: view.createdAt,
          claimedAt,
          adminUrl: adminRequestUrl(view.reference),
        });
        if (!result.success) {
          console.error('[claim] ops alert failed:', result.error);
        }
      });
    }

    return NextResponse.json({ request: view });
  } catch (err) {
    console.error('POST /api/consultation-requests/[id]/claim error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
