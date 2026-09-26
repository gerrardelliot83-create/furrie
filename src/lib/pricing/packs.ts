/**
 * Consultation pack prices — the single source of truth.
 *
 * Every screen, API route, email and the Terms page read prices from here, so
 * a price change is one edit. The listed price is the full amount the customer
 * pays: no GST is added on top (Gerard, 2026-09-27, for compliance; this
 * replaces "GST on top" of 2026-09-25). The amount a customer is asked to pay
 * by UPI is `quotePack(size).total`, always computed on the server.
 */

export const PACK_SIZES = [1, 3, 5, 10] as const;
export type PurchasablePackSize = (typeof PACK_SIZES)[number];

/** Price per pack in rupees: what the customer pays. */
const PACK_PRICES_INR: Record<PurchasablePackSize, number> = {
  1: 499,
  3: 1399,
  5: 2199,
  10: 3999,
};

/**
 * Tax added on top of the pack price. Zero: prices are all-inclusive and we
 * don't collect GST for now. Orders created while it was 18% keep their stored
 * GST, which is why screens still show a GST line when an order has one.
 */
export const GST_RATE = 0;

export const SINGLE_CONSULTATION_PRICE_INR = PACK_PRICES_INR[1];

export interface PackQuote {
  size: PurchasablePackSize;
  /** Pack price. */
  price: number;
  /** Tax on top of the price (0 while GST_RATE is 0). */
  gst: number;
  /** What the customer pays: price + gst. */
  total: number;
  /** Price per consultation, rounded to the rupee for display. */
  perConsultation: number;
  /** Saving against buying single consultations. */
  savingVsSingle: number;
  /** Discount against single consultations, in percent (2 dp). */
  discountPercent: number;
}

const roundPaise = (n: number) => Math.round(n * 100) / 100;

export function isPurchasablePackSize(value: unknown): value is PurchasablePackSize {
  return typeof value === 'number' && (PACK_SIZES as readonly number[]).includes(value);
}

export function quotePack(size: PurchasablePackSize): PackQuote {
  const price = PACK_PRICES_INR[size];
  // Whole rupees, so the UPI amount is easy to type and to match in the bank.
  const total = Math.round(price * (1 + GST_RATE));
  const listPrice = SINGLE_CONSULTATION_PRICE_INR * size;
  return {
    size,
    price,
    gst: roundPaise(total - price),
    total,
    perConsultation: Math.round(price / size),
    savingVsSingle: listPrice - price,
    discountPercent: roundPaise((1 - price / listPrice) * 100),
  };
}

export const PACK_QUOTES: readonly PackQuote[] = PACK_SIZES.map(quotePack);

/** "₹1,399" for whole rupees, "₹1,650.82" otherwise. */
export function formatInr(amount: number): string {
  const whole = Number.isInteger(amount);
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function packLabel(size: number): string {
  return size === 1 ? '1 consultation' : `${size} consultations`;
}
