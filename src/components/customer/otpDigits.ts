/**
 * What a change in one OTP box means for all the boxes (CX-1).
 *
 * Each box used to keep only the last character typed into it, so a whole
 * code put into one box by iOS "From Mail", an Android keyboard suggestion
 * or autofill left a single digit and the sign-in dead-ended. A whole code in
 * any box now fills every box; one typed digit still fills just its box.
 */

export interface OtpInputChange {
  /** The digits before the change, one per box ('' for an empty box). */
  digits: string[];
  /** The box that changed. */
  index: number;
  /** That box's value after the change, as the browser reports it. */
  rawValue: string;
  /** Caret position in that box after the change (selectionStart), if known. */
  caret: number | null;
  /** Number of boxes. */
  length: number;
}

export interface OtpInputResult {
  digits: string[];
  /** The box to focus next. */
  focusIndex: number;
}

/** Returns null when the change should be ignored (a non-digit was typed). */
export function applyOtpInput({ digits, index, rawValue, caret, length }: OtpInputChange): OtpInputResult | null {
  const next = Array.from({ length }, (_, i) => digits[i] ?? '');
  const previous = next[index];
  const incoming = rawValue.replace(/\D/g, '');

  if (!incoming) {
    if (rawValue) return null; // a letter or symbol: keep the box as it was
    next[index] = '';
    return { digits: next, focusIndex: index };
  }

  // A whole code: fill every box, whichever box it went into.
  if (incoming.length >= length) {
    let code = incoming.slice(0, length);
    if (incoming.length === length + 1 && previous && caret !== null && rawValue === incoming) {
      // Inserted next to the box's old digit instead of replacing it.
      if (caret === incoming.length && incoming.startsWith(previous)) code = incoming.slice(1);
      else if (incoming.endsWith(previous)) code = incoming.slice(0, length);
    }
    return { digits: code.split(''), focusIndex: length - 1 };
  }

  if (incoming.length === 1) {
    next[index] = incoming;
    return { digits: next, focusIndex: Math.min(index + 1, length - 1) };
  }

  // Two digits where the box had one: a digit typed beside the old one
  // (the old one wasn't selected). Keep the new one, as before.
  if (incoming.length === 2 && previous && rawValue === incoming) {
    const typedAfter = incoming[0] === previous && (caret === null || caret === 2);
    const typedBefore = incoming[1] === previous && caret === 1;
    if (typedAfter || typedBefore) {
      next[index] = typedAfter ? incoming[1] : incoming[0];
      return { digits: next, focusIndex: Math.min(index + 1, length - 1) };
    }
  }

  // Part of a code: spread it from this box onwards.
  for (let i = 0; i < incoming.length && index + i < length; i++) {
    next[index + i] = incoming[i];
  }
  return { digits: next, focusIndex: Math.min(index + incoming.length, length - 1) };
}
