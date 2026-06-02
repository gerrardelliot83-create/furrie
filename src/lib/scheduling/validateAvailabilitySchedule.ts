/**
 * Validation for a vet's weekly availability schedule.
 *
 * Shared shape (stored in vet_profiles.availability_schedule JSONB):
 *   { [day]: { start: string; end: string }[] }
 * where day is a lowercase weekday key and start/end are 24h "HH:MM".
 *
 * This is the server-side gate for PATCH /api/vet/profile (mobile editor).
 * It MUST stay strict: malformed times here would silently corrupt the
 * customer-facing slot computation in `computeAvailableSlots`
 * (see src/lib/scheduling/index.ts), which does `start.split(':')` and
 * lexical "HH:MM" comparisons with no further guarding.
 */
import type { AvailabilitySchedule, TimeSlot } from '@/types';

const VALID_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

// 24h zero-padded HH:MM. Rejects "9:00", "24:00", "25:99".
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

type ValidationResult =
  | { valid: true; value: AvailabilitySchedule }
  | { valid: false; error: string };

/**
 * Validate and normalize an availability schedule supplied by a client.
 *
 * Behaviour:
 * - Must be a plain object (not null/array/primitive).
 * - Unknown day keys are rejected.
 * - Each day value must be an array; [] means "unavailable that day".
 * - Each slot must be { start, end } with both 24h "HH:MM" and start < end.
 * - Slots within a day must not overlap each other.
 * - Each stored slot is normalized to { start, end } only (junk keys stripped).
 * - Slot order within a day is preserved as sent.
 */
export function validateAvailabilitySchedule(input: unknown): ValidationResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'availabilitySchedule must be an object' };
  }

  const result: AvailabilitySchedule = {};

  for (const [day, slots] of Object.entries(input as Record<string, unknown>)) {
    if (!(VALID_DAYS as readonly string[]).includes(day)) {
      return { valid: false, error: `Invalid day key: "${day}"` };
    }
    if (!Array.isArray(slots)) {
      return { valid: false, error: `${day} must be an array of time slots` };
    }

    const normalized: TimeSlot[] = [];
    for (const slot of slots) {
      if (slot === null || typeof slot !== 'object' || Array.isArray(slot)) {
        return { valid: false, error: `${day} slots must be objects with start and end` };
      }
      const { start, end } = slot as Record<string, unknown>;
      if (
        typeof start !== 'string' ||
        typeof end !== 'string' ||
        !HHMM.test(start) ||
        !HHMM.test(end)
      ) {
        return { valid: false, error: `${day} slot times must be 24h HH:MM strings` };
      }
      // Lexical comparison is correct for zero-padded HH:MM.
      if (start >= end) {
        return { valid: false, error: `${day} slot start must be before end (${start}-${end})` };
      }
      normalized.push({ start, end });
    }

    // Reject slots that overlap each other within the same day. This is a
    // single-vet data-hygiene check; it does NOT affect cross-vet slot
    // availability, which is merged + deduped separately in computeAvailableSlots.
    const sorted = [...normalized].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        return { valid: false, error: `${day} has overlapping time slots` };
      }
    }

    result[day as keyof AvailabilitySchedule] = normalized;
  }

  return { valid: true, value: result };
}
