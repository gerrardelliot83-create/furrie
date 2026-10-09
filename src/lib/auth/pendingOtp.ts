/**
 * "We sent a code to <email> at <time>", kept for this browser tab (CX-1).
 *
 * On a phone, fetching the code from the mail app can reload the sign-in
 * tab. The form kept its step only in React state, so the person landed back
 * on the email step, and asking again within 60 seconds hit the rate limit.
 * The form now saves this after sending a code and goes straight back to the
 * code boxes after a reload.
 *
 * sessionStorage: one tab, gone when the tab closes. Every access is wrapped,
 * because private browsing or blocked storage can throw; the form then just
 * works as it did before.
 */

export const PENDING_OTP_STORAGE_KEY = 'furrie_otp_pending';

/**
 * How long after sending we still return to the code boxes. Past this the
 * person starts again at the email step (the code may have expired anyway).
 */
export const PENDING_OTP_MAX_AGE_MS = 30 * 60 * 1000;

export interface PendingOtp {
  email: string;
  sentAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function tabStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePendingOtp(email: string, now: number = Date.now(), storage: StorageLike | null = tabStorage()): void {
  try {
    storage?.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify({ email, sentAt: now }));
  } catch {
    // Private mode or full storage: a reload goes back to the email step.
  }
}

export function clearPendingOtp(storage: StorageLike | null = tabStorage()): void {
  try {
    storage?.removeItem(PENDING_OTP_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The code we sent from this tab, if it is recent enough to go back to. */
export function readPendingOtp(now: number = Date.now(), storage: StorageLike | null = tabStorage()): PendingOtp | null {
  try {
    const raw = storage?.getItem(PENDING_OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOtp> | null;
    const valid =
      typeof parsed?.email === 'string' &&
      parsed.email.includes('@') &&
      typeof parsed.sentAt === 'number' &&
      now - parsed.sentAt <= PENDING_OTP_MAX_AGE_MS &&
      parsed.sentAt <= now + 60_000; // a clock change, not a future send
    if (!valid) {
      storage?.removeItem(PENDING_OTP_STORAGE_KEY);
      return null;
    }
    return { email: parsed.email as string, sentAt: parsed.sentAt as number };
  } catch {
    return null;
  }
}
