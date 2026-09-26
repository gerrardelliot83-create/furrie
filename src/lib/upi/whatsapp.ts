import { formatInr, packLabel } from '@/lib/pricing/packs';
import { ADMIN_PORTAL_URL, PAYMENT_SUPPORT } from './config';

/**
 * The "Send payment details on WhatsApp" link. Opens WhatsApp to the Furrie
 * payments number with the details typed in; the customer can attach their
 * payment screenshot before sending. The admin link at the end opens this
 * request in the admin portal — it needs an admin sign-in and grants nothing
 * by itself (Gerard, 2026-09-25).
 */
export function buildPaymentWhatsAppLink(params: {
  reference: string;
  packSize: number;
  amount: number;
  customerName?: string | null;
  customerEmail?: string | null;
  utr?: string | null;
}): string {
  const lines = [
    "Hi Furrie, I've paid for consultations.",
    `Reference: ${params.reference}`,
    `Pack: ${packLabel(params.packSize)}`,
    `Amount: ${formatInr(params.amount)}`,
  ];
  if (params.customerName) lines.push(`Name: ${params.customerName}`);
  if (params.customerEmail) lines.push(`Email: ${params.customerEmail}`);
  if (params.utr) lines.push(`UPI transaction ID: ${params.utr}`);
  lines.push('', `For Furrie: ${adminRequestUrl(params.reference)}`);
  return `https://wa.me/${PAYMENT_SUPPORT.whatsappDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function adminRequestUrl(reference: string): string {
  return `${ADMIN_PORTAL_URL}/credit-requests?ref=${encodeURIComponent(reference)}`;
}

export function paymentCallLink(): string {
  return `tel:${PAYMENT_SUPPORT.phoneE164}`;
}
