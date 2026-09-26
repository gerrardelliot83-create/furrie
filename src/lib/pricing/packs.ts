/**
 * Consultation pack prices — the single source of truth.
 *
 * Every screen, API route, email and the Terms page read prices from here, so
 * a price change is one edit. Prices are before GST; GST is added on top
 * (Gerard, 2026-09-25). The amount a customer is asked to pay by UPI is
 * `quotePack(size).total`, always computed on the server.
 */

export const PACK_SIZES = [1, 3, 5, 10] as const;
export type PurchasablePackSize = (typeof PACK_SIZES)[number];

/** Price per pack in rupees, before GST. */
const PACK_PRICES_INR: Record<PurchasablePackSize, number> = {
  1: 499,
  3: 1399,
  5: 2199,
  10: 3999,
};

/** GST added on top of the pack price. */
export const GST_RATE = 0.18;

/**
 * The total is rounded to whole rupees so the UPI amount is easy to type and
 * to match in the bank statement; the GST line absorbs the rounding.
 */
const ROUND_TOTAL_TO_RUPEE = true;

export const SINGLE_CONSULTATION_PRICE_INR = PACK_PRICES_INR[1];

export interface PackQuote {
  size: PurchasablePackSize;
  /** Pack price before GST. */
  price: number;
  gst: number;
  /** What the customer pays: price + GST. */
  total: number;
  /** Pre-GST price per consultation, rounded to the rupee for display. */
  perConsultation: number;
  /** Pre-GST saving against buying single consultations. */
  savingVsSingle: number;
  /** Pre-GST discount against single consultations, in percent (2 dp). */
  discountPercent: number;
}

const roundPaise = (n: number) => Math.round(n * 100) / 100;

export function isPurchasablePackSize(value: unknown): value is PurchasablePackSize {
  return typeof value === 'number' && (PACK_SIZES as readonly number[]).includes(value);
}

export function quotePack(size: PurchasablePackSize): PackQuote {
  const price = PACK_PRICES_INR[size];
  const exactTotal = price * (1 + GST_RATE);
  const total = ROUND_TOTAL_TO_RUPEE ? Math.round(exactTotal) : roundPaise(exactTotal);
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
