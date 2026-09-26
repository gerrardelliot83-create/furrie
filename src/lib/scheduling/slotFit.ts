/**
 * Slot rules for listing and matching (D-06). Pure. Times of day are India
 * time "HH:MM" strings as stored in vet_profiles.availability_schedule.
 */
import type { TimeSlot } from '@/types';

export const SLOT_MINUTES = 30;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * The whole slot [start, start + 30 min) lies inside one of the day's blocks
 * AND on that block's 30-minute grid (so 11:45 in a 10:00–12:00 block, or
 * 10:15 in a 10:00 block, is not a slot). The grid rule keeps every booking
 * at an exact slot start, so the unique (vet_id, scheduled_at) index also
 * stops two overlapping bookings racing each other.
 */
export function slotFitsBlocks(slotStart: string, blocks: readonly TimeSlot[]): boolean {
  const start = toMinutes(slotStart);
  return blocks.some((block) => {
    const blockStart = toMinutes(block.start);
    const blockEnd = toMinutes(block.end);
    return start >= blockStart && start + SLOT_MINUTES <= blockEnd && (start - blockStart) % SLOT_MINUTES === 0;
  });
}

/** How long a booked consultation occupies the vet: its duration, never less than one slot. */
export function occupiedMinutes(durationMinutes: number | null | undefined): number {
  return Math.max(durationMinutes ?? SLOT_MINUTES, SLOT_MINUTES);
}

/** Two appointments overlap (start instants in ms, lengths in minutes). */
export function appointmentsOverlap(
  aStartMs: number,
  aMinutes: number,
  bStartMs: number,
  bMinutes: number
): boolean {
  return aStartMs < bStartMs + bMinutes * 60_000 && bStartMs < aStartMs + aMinutes * 60_000;
}

/** Look this far back for bookings that may still run into a slot. */
export const OVERLAP_LOOKBACK_MS = 3 * 60 * 60 * 1000;
