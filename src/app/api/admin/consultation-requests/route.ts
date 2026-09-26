/**
 * /api/admin/consultation-requests — admin side of UPI purchases (L1).
 *
 * GET ?tab=claimed|awaiting|fulfilled|cancelled|all&q=…&ref=FP…
 *   claimed   — customer says paid, waiting for us (default)
 *   awaiting  — order created, not marked paid
 *   ref       — just that order (the link in WhatsApp messages and ops emails)
 *   q         — search reference, UPI transaction ID, name, email or phone
 *
 * PATCH { requestId, action }
 *   'grant'   — payment found: one transaction creates the pack at the real
 *               price and closes the order (l1_fulfil_credit_request). The
 *               amount must match the current price list. Double-click safe.
 *               Body may carry bankReference. Customer gets an email + in-app
 *               notification; the grant is audit-logged.
 *   'cancel'  — payment not found / other reason. Body: reason,
 *               notifyCustomer (email only for 'payment_not_found').
 *   'contact' — legacy (pre-L1) requests only: mark contacted.
 *
 * Admin only (cookie session + profiles.role = 'admin').
 */

import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendCreditsReadyEmail, sendPaymentNotFoundEmail } from '@/lib/email';
import { isPurchasablePackSize, packLabel, quotePack } from '@/lib/pricing/packs';
import { APP_URL, PAYMENT_SUPPORT } from '@/lib/upi/config';
import { withRoute } from '@/server/handler';

const LIST_COLUMNS = `
  id, customer_id, requested_quantity, preferred_contact, contact_phone, note, status,
  pack_size, price_inr, gst_inr, amount_inr, reference_code, upi_vpa,
  payment_claimed_at, payer_utr, bank_reference, payment_verified_at, cancel_reason,
  fulfilled_pack_id, fulfilled_at, created_at, updated_at,
  profiles!consultation_credit_requests_customer_id_fkey ( id, full_name, email, phone )
`;

const CANCEL_REASONS = ['payment_not_found', 'customer_asked', 'duplicate', 'other'] as const;
type CancelReason = (typeof CANCEL_REASONS)[number];

interface RequestRow {
  id: string;
  customer_id: string;
  requested_quantity: number;
  status: string;
  pack_size: number | null;
  price_inr: number | string | null;
  gst_inr: number | string | null;
  amount_inr: number | string | null;
  reference_code: string | null;
  payment_claimed_at: string | null;
  payer_utr: string | null;
  created_at: string;
  profiles: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
  [key: string]: unknown;
}

export const GET = withRoute(async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'claimed';
    const ref = searchParams.get('ref')?.trim().toUpperCase() || null;
    const q = searchParams.get('q')?.trim().toLowerCase() || null;

    let query = supabaseAdmin
      .from('consultation_credit_requests')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(200);

    if (ref) {
      query = query.eq('reference_code', ref);
    } else if (tab === 'claimed') {
      query = query.eq('status', 'pending').not('payment_claimed_at', 'is', null);
    } else if (tab === 'awaiting') {
      query = query.in('status', ['pending', 'contacted']).is('payment_claimed_at', null);
    } else if (tab === 'fulfilled' || tab === 'cancelled') {
      query = query.eq('status', tab);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Admin credit requests fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch requests', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    let rows = (data || []) as unknown as RequestRow[];
    if (q) {
      rows = rows.filter((r) =>
        [r.reference_code, r.payer_utr, r.profiles?.full_name, r.profiles?.email, r.profiles?.phone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    // Oldest claim first on the "customer says paid" tab: first come, first served.
    if (tab === 'claimed' && !ref) {
      rows.sort((a, b) => String(a.payment_claimed_at).localeCompare(String(b.payment_claimed_at)));
    }

    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error('GET /api/admin/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

interface PatchBody {
  requestId?: string;
  action?: string;
  bankReference?: string;
  reason?: string;
  notifyCustomer?: boolean;
}

export const PATCH = withRoute(async function PATCH(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (auth.error) return auth.error;
    const adminId = auth.user.id;

    const body = (await request.json().catch(() => ({}))) as PatchBody;
    if (!body.requestId) {
      return NextResponse.json(
        { error: 'requestId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from('consultation_credit_requests')
      .select(LIST_COLUMNS)
      .eq('id', body.requestId)
      .maybeSingle();

    if (fetchErr || !req) {
      return NextResponse.json({ error: 'Request not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    const row = req as unknown as RequestRow;
    const customer = row.profiles;

    switch (body.action) {
      case 'grant': {
        if (!isPurchasablePackSize(row.pack_size) || !row.reference_code) {
          return NextResponse.json(
            {
              error: 'This request was made before online payment. Use Users → Assign Pack if the customer paid.',
              code: 'LEGACY_REQUEST',
            },
            { status: 400 }
          );
        }
        const quote = quotePack(row.pack_size);
        const bankReference =
          typeof body.bankReference === 'string' ? body.bankReference.trim().slice(0, 100) : null;

        const { data: result, error: rpcError } = await supabaseAdmin.rpc('l1_fulfil_credit_request', {
          p_request_id: row.id,
          p_admin_id: adminId,
          p_expected_pack_size: quote.size,
          p_expected_price: quote.price,
          p_expected_amount: quote.total,
          p_unit_price: Math.round((quote.price / quote.size) * 100) / 100,
          p_discount_percent: quote.discountPercent,
          p_bank_reference: bankReference ?? undefined,
        });

        if (rpcError) {
          console.error('l1_fulfil_credit_request failed:', rpcError);
          return NextResponse.json(
            { error: 'Could not grant. Nothing was changed. Please try again.', code: 'DB_ERROR' },
            { status: 500 }
          );
        }

        const r = result as { ok: boolean; reason?: string; already?: boolean; pack_id?: string };
        if (!r.ok) {
          const messages: Record<string, string> = {
            NOT_OPEN: 'This order is closed and cannot be granted.',
            AMOUNT_MISMATCH:
              "This order's amount doesn't match the current price list. Check the payment and use Users → Assign Pack instead.",
            LEGACY_REQUEST: 'This request was made before online payment. Use Users → Assign Pack.',
            NOT_FOUND: 'Request not found.',
          };
          return NextResponse.json(
            { error: messages[r.reason ?? ''] ?? 'Could not grant.', code: r.reason ?? 'GRANT_FAILED' },
            { status: 409 }
          );
        }

        if (!r.already) {
          after(async () => {
            await logAdminAction({
              adminId,
              action: 'grant_credits_upi',
              targetType: 'credit_request',
              targetId: row.id,
              details: {
                reference: row.reference_code,
                customerId: row.customer_id,
                packSize: quote.size,
                amount: quote.total,
                packId: r.pack_id,
                bankReference,
                utr: row.payer_utr,
              },
            });
            await createNotification({
              user_id: row.customer_id,
              type: 'credits_added',
              title: 'Your consultations are ready',
              body: `${packLabel(quote.size)} added to your account. You can book now.`,
              channel: 'in_app',
              data: { packId: r.pack_id, reference: row.reference_code },
            });
            if (customer?.email) {
              const sent = await sendCreditsReadyEmail({
                customerEmail: customer.email,
                customerName: customer.full_name || 'there',
                packSize: quote.size,
                reference: row.reference_code as string,
                bookUrl: `${APP_URL}/connect`,
              });
              if (!sent.success) console.error('[admin grant] credits email failed:', sent.error);
            }
          });
        }

        return NextResponse.json({
          granted: true,
          already: !!r.already,
          packId: r.pack_id,
          message: r.already
            ? 'Already granted earlier — nothing changed.'
            : `${packLabel(quote.size)} granted to ${customer?.full_name || 'the customer'}.`,
        });
      }

      case 'cancel': {
        if (!['pending', 'contacted'].includes(row.status)) {
          return NextResponse.json(
            { error: 'Only open requests can be cancelled', code: 'INVALID_TRANSITION' },
            { status: 400 }
          );
        }
        const reason: CancelReason = (CANCEL_REASONS as readonly string[]).includes(body.reason ?? '')
          ? (body.reason as CancelReason)
          : 'other';

        const { data: cancelled, error: updateErr } = await supabaseAdmin
          .from('consultation_credit_requests')
          .update({ status: 'cancelled', cancel_reason: reason })
          .eq('id', row.id)
          .in('status', ['pending', 'contacted'])
          .select('id')
          .maybeSingle();

        if (updateErr || !cancelled) {
          return NextResponse.json(
            { error: 'Could not cancel (it may have just been granted). Refresh and check.', code: 'DB_ERROR' },
            { status: 409 }
          );
        }

        const notify =
          body.notifyCustomer === true &&
          reason === 'payment_not_found' &&
          !!row.reference_code &&
          !!customer?.email;

        after(async () => {
          await logAdminAction({
            adminId,
            action: 'cancel_credit_request',
            targetType: 'credit_request',
            targetId: row.id,
            details: { reference: row.reference_code, customerId: row.customer_id, reason, notified: notify },
          });
          if (notify && customer?.email) {
            const sent = await sendPaymentNotFoundEmail({
              customerEmail: customer.email,
              customerName: customer.full_name || 'there',
              reference: row.reference_code as string,
              total: Number(row.amount_inr),
              supportDisplay: PAYMENT_SUPPORT.display,
              buyUrl: `${APP_URL}/buy`,
            });
            if (!sent.success) console.error('[admin cancel] email failed:', sent.error);
          }
        });

        return NextResponse.json({ cancelled: true, notified: notify });
      }

      case 'contact': {
        if (row.status !== 'pending' || row.reference_code) {
          return NextResponse.json(
            { error: 'Only legacy pending requests can be marked contacted', code: 'INVALID_TRANSITION' },
            { status: 400 }
          );
        }
        await supabaseAdmin
          .from('consultation_credit_requests')
          .update({ status: 'contacted' })
          .eq('id', row.id)
          .eq('status', 'pending');
        return NextResponse.json({ contacted: true });
      }

      default:
        return NextResponse.json(
          { error: 'action must be one of: grant, cancel, contact', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('PATCH /api/admin/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
