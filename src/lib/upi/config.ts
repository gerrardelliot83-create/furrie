/**
 * Where customers send UPI payments, and how they reach us about them.
 *
 * Today this is the founder's personal UPI ID. Moving to a business/merchant
 * UPI later is a change here (or the UPI_VPA environment variable) only.
 * Nothing in this file is secret: all of it is shown on the pay screen.
 */

const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

function vpaFromEnv(): string {
  const fromEnv = process.env.UPI_VPA?.trim();
  return fromEnv && VPA_PATTERN.test(fromEnv) ? fromEnv : 'furrie.pay@axl';
}

export const UPI_CONFIG = {
  /** UPI ID payments go to. */
  vpa: vpaFromEnv(),
  /** Payee label put in the UPI link (the payer's app shows the bank name). */
  payeeName: 'Furrie',
} as const;

/**
 * Support line for payments: WhatsApp and phone (Gerard, 2026-09-25).
 * Digits only, with country code, as wa.me and tel: expect.
 */
export const PAYMENT_SUPPORT = {
  phoneE164: '+918977922442',
  whatsappDigits: '918977922442',
  display: '+91 89779 22442',
} as const;

export const ADMIN_PORTAL_URL = 'https://admin.furrie.in';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.furrie.in';

export function isValidVpa(vpa: string): boolean {
  return VPA_PATTERN.test(vpa);
}

/**
 * What the pay screen promises about when credits arrive. Deliberately
 * without hours until Gerard confirms who checks the bank and when
 * (open question, 2026-09-25) — never promise a time we can't keep.
 */
export const PAYMENT_CHECK_PROMISE =
  'We check payments through the day and add your consultations as soon as we find yours. You will get an email when they are ready.';
