import 'server-only';

import { buildUpiLink } from '@/lib/upi/link';
import { upiQrDataUri } from '@/lib/upi/qr';
import { buildPaymentWhatsAppLink, paymentCallLink } from '@/lib/upi/whatsapp';
import { PAYMENT_SUPPORT, UPI_CONFIG } from '@/lib/upi/config';

/** Columns of consultation_credit_requests the pay screen needs. */
export const PAYMENT_REQUEST_COLUMNS =
  'id, customer_id, status, reference_code, pack_size, price_inr, gst_inr, amount_inr, upi_vpa, payment_claimed_at, payer_utr, created_at';

export interface PaymentRequestRow {
  id: string;
  customer_id: string;
  status: string;
  reference_code: string | null;
  pack_size: number | null;
  price_inr: number | string | null;
  gst_inr: number | string | null;
  amount_inr: number | string | null;
  upi_vpa: string | null;
  payment_claimed_at: string | null;
  payer_utr: string | null;
  created_at: string;
}

/** Everything the pay screen shows, computed on the server. */
export interface PaymentRequestView {
  id: string;
  reference: string;
  packSize: number;
  price: number;
  gst: number;
  total: number;
  vpa: string;
  upiLink: string;
  qrDataUri: string;
  whatsappUrl: string;
  callUrl: string;
  supportDisplay: string;
  claimedAt: string | null;
  utr: string | null;
  createdAt: string;
}

export function isPricedRequest(row: PaymentRequestRow): boolean {
  return !!row.reference_code && row.pack_size !== null && row.amount_inr !== null;
}

export function buildPaymentRequestView(
  row: PaymentRequestRow,
  customer: { name?: string | null; email?: string | null }
): PaymentRequestView {
  if (!isPricedRequest(row)) {
    throw new Error('buildPaymentRequestView: legacy request has no price');
  }
  const reference = row.reference_code as string;
  const packSize = row.pack_size as number;
  const total = Number(row.amount_inr);
  const vpa = row.upi_vpa || UPI_CONFIG.vpa;
  const upiLink = buildUpiLink({ amount: total, reference, vpa });
  return {
    id: row.id,
    reference,
    packSize,
    price: Number(row.price_inr),
    gst: Number(row.gst_inr),
    total,
    vpa,
    upiLink,
    qrDataUri: upiQrDataUri(upiLink),
    whatsappUrl: buildPaymentWhatsAppLink({
      reference,
      packSize,
      amount: total,
      customerName: customer.name,
      customerEmail: customer.email,
      utr: row.payer_utr,
    }),
    callUrl: paymentCallLink(),
    supportDisplay: PAYMENT_SUPPORT.display,
    claimedAt: row.payment_claimed_at,
    utr: row.payer_utr,
    createdAt: row.created_at,
  };
}
