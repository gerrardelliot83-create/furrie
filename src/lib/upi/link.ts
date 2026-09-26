import { UPI_CONFIG, isValidVpa } from './config';

/**
 * Build a standard UPI payment link (NPCI "upi://pay" deep link). On a phone
 * it opens GPay / PhonePe / Paytm with payee, amount and note filled in; on a
 * computer the same string is shown as a QR code.
 *
 * Built by hand rather than with URLSearchParams: some UPI apps mis-read "+"
 * for spaces and an encoded "@" in the payee address.
 */
export function buildUpiLink(params: { amount: number; reference: string; vpa?: string }): string {
  const vpa = params.vpa ?? UPI_CONFIG.vpa;
  if (!isValidVpa(vpa)) {
    throw new Error('buildUpiLink: invalid UPI ID');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('buildUpiLink: invalid amount');
  }
  if (!/^[A-Z0-9]{4,20}$/.test(params.reference)) {
    throw new Error('buildUpiLink: invalid reference');
  }
  return (
    `upi://pay?pa=${vpa}` +
    `&pn=${encodeURIComponent(UPI_CONFIG.payeeName)}` +
    `&am=${params.amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${params.reference}`
  );
}
