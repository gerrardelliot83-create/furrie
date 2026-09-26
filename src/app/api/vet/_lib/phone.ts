/**
 * One phone format for vets (C-12): the admin form suggested "+919876543210"
 * while the vet's own profile only accepted 10 digits, so a number the admin
 * saved couldn't be re-saved by the vet. Both now accept +91 / 91 / 0
 * prefixes, spaces and dashes, and store the 10-digit Indian mobile number.
 *
 * Returns the 10 digits, or null if it isn't a valid Indian mobile number.
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const INVALID_PHONE_MESSAGE = 'Please enter a valid 10-digit Indian mobile number';
