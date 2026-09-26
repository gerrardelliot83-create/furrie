/**
 * Weekly-hours helpers for the schedule editor, the readiness checklist and
 * the admin Vets page (C-06). Pure. Times are India time "HH:MM" strings, as
 * stored in vet_profiles.availability_schedule.
 */
import type { AvailabilitySchedule, TimeSlot } from '@/types';

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

const DAY_ABBR: Record<WeekDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const MIN_BLOCK_MINUTES = 30;

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** The first problem with one day's blocks, as the editor shows it, or null. */
export function dayBlocksError(slots: readonly TimeSlot[]): string | null {
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (minutes(slot.end) - minutes(slot.start) < MIN_BLOCK_MINUTES) {
      return `Block ${i + 1} must be at least ${MIN_BLOCK_MINUTES} minutes.`;
    }
    for (let j = i + 1; j < slots.length; j++) {
      const other = slots[j];
      if (slot.start < other.end && other.start < slot.end) {
        return `Block ${i + 1} overlaps with Block ${j + 1}. Please adjust the times.`;
      }
    }
  }
  return null;
}

/** True when at least one day has at least one block. */
export function hasWeeklyHours(schedule: AvailabilitySchedule | null | undefined): boolean {
  if (!schedule) return false;
  return WEEK_DAYS.some((day) => (schedule[day]?.length ?? 0) > 0);
}

/**
 * "Mon–Fri 10:00–18:00 · Sat 10:00–14:00", merging neighbouring days with
 * the same hours; "Not set" when there are none.
 */
export function summarizeWeeklyHours(schedule: AvailabilitySchedule | null | undefined): string {
  if (!hasWeeklyHours(schedule)) return 'Not set';

  const hoursOf = (day: WeekDay) =>
    [...(schedule?.[day] ?? [])]
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((slot) => `${slot.start}–${slot.end}`)
      .join(', ');

  const parts: string[] = [];
  let i = 0;
  while (i < WEEK_DAYS.length) {
    const hours = hoursOf(WEEK_DAYS[i]);
    if (!hours) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < WEEK_DAYS.length && hoursOf(WEEK_DAYS[j + 1]) === hours) j++;
    const days =
      j === i
        ? DAY_ABBR[WEEK_DAYS[i]]
        : j === i + 1
          ? `${DAY_ABBR[WEEK_DAYS[i]]}, ${DAY_ABBR[WEEK_DAYS[j]]}`
          : `${DAY_ABBR[WEEK_DAYS[i]]}–${DAY_ABBR[WEEK_DAYS[j]]}`;
    parts.push(`${days} ${hours}`);
    i = j + 1;
  }
  return parts.join(' · ');
}
