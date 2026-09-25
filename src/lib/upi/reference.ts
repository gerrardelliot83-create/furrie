import 'server-only';

import { randomInt } from 'node:crypto';

/**
 * Payment references look like "FP7K4QXM": "FP" + 6 characters from an
 * alphabet without look-alikes (no 0/O, 1/I/L), so customers can read them
 * out and type them into a UPI note without mistakes. 31^6 ≈ 887 million
 * combinations; uniqueness is also enforced by a database index.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePaymentReference(): string {
  let out = 'FP';
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export const PAYMENT_REFERENCE_PATTERN = /^FP[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
