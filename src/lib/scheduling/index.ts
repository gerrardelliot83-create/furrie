/**
 * Scheduling Helper Functions
 *
 * Utilities for computing available time slots and managing scheduled consultations.
 */

import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { istDateKey, istDayRange } from '@/lib/time/ist';
import type { AvailabilitySchedule } from '@/types';
import {
  OVERLAP_LOOKBACK_MS,
  SLOT_MINUTES,
  appointmentsOverlap,
  occupiedMinutes,
  slotFitsBlocks,
} from './slotFit';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ['pending', 'scheduled', 'active'];

interface Booking {
  vet_id: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
}

/** True when this vet has an open booking overlapping [startMs, startMs + one slot). */
function vetIsBusy(bookings: readonly Booking[], vetId: string, startMs: number): boolean {
  return bookings.some(
    (booking) =>
      booking.vet_id === vetId &&
      !!booking.scheduled_at &&
      appointmentsOverlap(
        new Date(booking.scheduled_at).getTime(),
        occupiedMinutes(booking.duration_minutes),
        startMs,
        SLOT_MINUTES
      )
  );
}

// IST timezone offset
const IST_OFFSET = '+05:30';

// Slot duration in minutes
const SLOT_DURATION_MINUTES = 30;

// Minimum lead time before booking (in milliseconds)
const MIN_LEAD_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Join window (how early/late participants can join)
const JOIN_WINDOW_BEFORE_MS = 5 * 60 * 1000; // 5 minutes before
const JOIN_WINDOW_AFTER_MS = 45 * 60 * 1000; // 45 minutes after

// Missed consultation threshold
const MISSED_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes after scheduled time

export interface AvailableSlot {
  start: string; // "10:00"
  end: string; // "10:30"
  datetime: string; // ISO string with timezone
}

export interface DaySlots {
  date: string; // "2026-02-09"
  dayOfWeek: string; // "Sunday"
  times: AvailableSlot[];
}

/**
 * Drop vets whose account an admin deactivated (profiles.is_active = false,
 * C-03). Agent S blocks their sign-in; this keeps them out of slot listing
 * and matching. Throws if the check itself fails, so an error is never
 * read as "all active".
 */
async function onlyActiveVets<T extends { id: string }>(vets: T[]): Promise<T[]> {
  if (vets.length === 0) return vets;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, is_active')
    .in(
      'id',
      vets.map((vet) => vet.id)
    );
  if (error) {
    throw new Error(`Failed to check vet accounts: ${error.message}`);
  }
  const active = new Set((data ?? []).filter((p) => p.is_active !== false).map((p) => p.id));
  return vets.filter((vet) => active.has(vet.id));
}

export interface ComputeSlotsOptions {
  fromDate?: Date;
  toDate?: Date;
  excludeVetId?: string; // For follow-ups, may want specific vet
}

/**
 * Compute available appointment slots across all available vets
 *
 * Algorithm:
 * 1. Get all verified, available vets with their schedules
 * 2. For each day in range, expand vet schedules into 30-minute slots
 * 3. Remove slots that are already booked
 * 4. Remove slots in the past or within minimum lead time
 * 5. Merge all vet slots (we don't expose which vet)
 * 6. Return unique, sorted slots
 */
export async function computeAvailableSlots(
  options: ComputeSlotsOptions = {}
): Promise<DaySlots[]> {
  const now = new Date();
  const fromDate = options.fromDate || new Date(now.getTime() + MIN_LEAD_TIME_MS);
  const toDate = options.toDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // 1. Get all verified, available vets with their schedules (active accounts only)
  const { data: vetRows, error: vetsError } = await supabaseAdmin
    .from('vet_profiles')
    .select('id, availability_schedule')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (vetsError) {
    console.error('Error fetching vets:', vetsError);
    throw new Error('Failed to fetch available vets');
  }

  const vets = await onlyActiveVets(vetRows ?? []);

  if (!vets || vets.length === 0) {
    return [];
  }

  // 2. Open bookings that could overlap the range (including ones that
  //    started up to 3 hours before it and may still be running)
  const { data: existingConsultations, error: consultationsError } = await supabaseAdmin
    .from('consultations')
    .select('vet_id, scheduled_at, duration_minutes')
    .gte('scheduled_at', new Date(fromDate.getTime() - OVERLAP_LOOKBACK_MS).toISOString())
    .lte('scheduled_at', toDate.toISOString())
    .in('status', OPEN_STATUSES);

  if (consultationsError) {
    console.error('Error fetching existing consultations:', consultationsError);
    throw new Error('Failed to fetch existing consultations');
  }
  const bookings: Booking[] = existingConsultations ?? [];

  // 3. For each India day in range (the server runs in UTC), compute slots
  const result: DaySlots[] = [];
  const lastDateKey = istDateKey(toDate);

  for (
    let dayStart = istDayRange(fromDate).start;
    istDateKey(dayStart) <= lastDateKey;
    dayStart = new Date(dayStart.getTime() + DAY_MS)
  ) {
    const currentDate = dayStart;
    const dayOfWeekLower = getDayOfWeekLower(currentDate);
    const dateString = formatDateISO(currentDate);
    const daySlots: Map<string, AvailableSlot> = new Map();

    for (const vet of vets) {
      const schedule = vet.availability_schedule as AvailabilitySchedule | null;
      if (!schedule) continue;

      const daySchedule = schedule[dayOfWeekLower as keyof AvailabilitySchedule] || [];

      for (const block of daySchedule) {
        // Expand block into 30-min slots
        const slots = expandBlockToSlots(dateString, block.start, block.end);

        for (const slot of slots) {
          const slotTime = new Date(slot.datetime);

          // Skip if in the past
          if (slotTime <= now) continue;

          // Skip if less than minimum lead time, or outside the requested range
          if (slotTime.getTime() - now.getTime() < MIN_LEAD_TIME_MS) continue;
          if (slotTime < fromDate || slotTime > toDate) continue;

          // Skip if any open booking of this vet overlaps the slot (D-06)
          if (vetIsBusy(bookings, vet.id, slotTime.getTime())) continue;

          // Add to available slots (use datetime as key for deduplication)
          daySlots.set(slot.datetime, slot);
        }
      }
    }

    if (daySlots.size > 0) {
      result.push({
        date: dateString,
        dayOfWeek: getDayOfWeekName(currentDate),
        times: Array.from(daySlots.values()).sort((a, b) => a.start.localeCompare(b.start)),
      });
    }
  }

  return result;
}

/**
 * Find an available vet for a specific time slot with load balancing
 *
 * Algorithm:
 * 1. Get all verified, available, active vets with their schedules and ratings
 * 2. Keep vets whose schedule holds the WHOLE slot, on its 30-minute grid
 * 3. Exclude vets with any open booking overlapping the slot (not only one
 *    at the same instant). A failed bookings query means "no vet", never
 *    "free" (D-06)
 * 4. Count each candidate's consultations on that India day (load metric)
 * 5. Sort: Standard = by that day's count ascending (least busy first)
 *         Priority (Plus) = by average_rating descending, then count ascending
 * 6. Return top-ranked vet
 *
 * Two queries for all vets together (no per-vet queries). Signature is kept:
 * the booking route (L1) calls it.
 */
export async function findAvailableVetForSlot(
  slotDatetime: string,
  excludeVetIds: string[] = [],
  isPriority = false
): Promise<string | null> {
  const slotTime = new Date(slotDatetime);
  const dayOfWeekLower = getDayOfWeekLower(slotTime);
  const slotTimeStr = formatTimeHHMM(slotTime);

  // Get all verified, available vets with rating data
  let query = supabaseAdmin
    .from('vet_profiles')
    .select('id, availability_schedule, consultation_count, average_rating')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (excludeVetIds.length > 0) {
    query = query.not('id', 'in', `(${excludeVetIds.join(',')})`);
  }

  const { data: vetRows, error } = await query;

  if (error || !vetRows) {
    console.error('Error fetching vets for slot:', error);
    return null;
  }

  let vets: typeof vetRows;
  try {
    vets = await onlyActiveVets(vetRows);
  } catch (activeError) {
    console.error('Error checking vet accounts for slot:', activeError);
    return null;
  }

  if (Number.isNaN(slotTime.getTime())) return null;

  // Vets whose schedule holds the whole slot, on its grid
  const scheduled = vets.filter((vet) => {
    const schedule = vet.availability_schedule as AvailabilitySchedule | null;
    const daySchedule = schedule?.[dayOfWeekLower as keyof AvailabilitySchedule] || [];
    return slotFitsBlocks(slotTimeStr, daySchedule);
  });
  if (scheduled.length === 0) return null;

  const vetIds = scheduled.map((vet) => vet.id);
  const slotMs = slotTime.getTime();

  // Open bookings that could overlap the slot. An error here must not read
  // as "free" — that is how double bookings happen.
  const { data: nearby, error: bookingsError } = await supabaseAdmin
    .from('consultations')
    .select('vet_id, scheduled_at, duration_minutes')
    .in('vet_id', vetIds)
    .in('status', OPEN_STATUSES)
    .gte('scheduled_at', new Date(slotMs - OVERLAP_LOOKBACK_MS).toISOString())
    .lt('scheduled_at', new Date(slotMs + SLOT_MINUTES * 60_000).toISOString());

  if (bookingsError) {
    console.error('Error checking bookings for slot:', bookingsError);
    Sentry.captureException(new Error(`findAvailableVetForSlot bookings query: ${bookingsError.message}`), {
      tags: { area: 'scheduling' },
    });
    return null;
  }

  const free = scheduled.filter((vet) => !vetIsBusy(nearby ?? [], vet.id, slotMs));
  if (free.length === 0) return null;

  // Load metric: consultations on the slot's India day (ranking only)
  const day = istDayRange(slotTime);
  const { data: dayRows, error: loadError } = await supabaseAdmin
    .from('consultations')
    .select('vet_id')
    .in(
      'vet_id',
      free.map((vet) => vet.id)
    )
    .gte('scheduled_at', day.start.toISOString())
    .lt('scheduled_at', day.end.toISOString())
    .in('status', [...OPEN_STATUSES, 'closed']);
  if (loadError) {
    console.error('Error counting vet load (ranking falls back to rating/order):', loadError);
  }
  const load = new Map<string, number>();
  for (const row of dayRows ?? []) {
    if (row.vet_id) load.set(row.vet_id, (load.get(row.vet_id) ?? 0) + 1);
  }

  const candidates = free.map((vet) => ({
    id: vet.id,
    averageRating: vet.average_rating || 0,
    todayCount: load.get(vet.id) ?? 0,
  }));

  // Sort based on priority mode
  if (isPriority) {
    // Plus users: best-rated vet first, then least busy
    candidates.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return a.todayCount - b.todayCount;
    });
  } else {
    // Standard: least busy vet first (load balancing)
    candidates.sort((a, b) => a.todayCount - b.todayCount);
  }

  return candidates[0].id;
}

/**
 * Check if a participant can join a consultation based on scheduled time
 */
export function canJoinConsultation(scheduledAt: string): {
  canJoin: boolean;
  reason?: string;
  minutesUntilStart?: number;
  minutesSinceStart?: number;
} {
  const now = new Date();
  const scheduledTime = new Date(scheduledAt);
  const diffMs = scheduledTime.getTime() - now.getTime();

  // Too early (more than 5 minutes before)
  if (diffMs > JOIN_WINDOW_BEFORE_MS) {
    const minutesUntil = Math.ceil(diffMs / 60000);
    return {
      canJoin: false,
      reason: `Consultation starts in ${minutesUntil} minutes. You can join 5 minutes before the scheduled time.`,
      minutesUntilStart: minutesUntil,
    };
  }

  // Too late (more than 45 minutes after)
  if (diffMs < -JOIN_WINDOW_AFTER_MS) {
    return {
      canJoin: false,
      reason: 'This consultation has expired. Please book a new appointment.',
    };
  }

  // Within join window
  const minutesSinceStart = Math.floor(-diffMs / 60000);
  return {
    canJoin: true,
    minutesSinceStart: Math.max(0, minutesSinceStart),
    minutesUntilStart: Math.max(0, Math.ceil(diffMs / 60000)),
  };
}

/**
 * Check if a consultation should be marked as missed
 */
export function shouldMarkAsMissed(scheduledAt: string, startedAt: string | null): boolean {
  // If already started, not missed
  if (startedAt) return false;

  const now = new Date();
  const scheduledTime = new Date(scheduledAt);
  const timeSinceScheduled = now.getTime() - scheduledTime.getTime();

  return timeSinceScheduled > MISSED_THRESHOLD_MS;
}

// ============================================================================
// Helper Functions
// ============================================================================

// IST timezone identifier for Intl APIs
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Expand a time block (e.g., 10:00-16:00) into 30-minute slots
 */
function expandBlockToSlots(date: string, startTime: string, endTime: string): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (true) {
    const nextMin = currentMin + SLOT_DURATION_MINUTES;
    const nextHour = currentHour + Math.floor(nextMin / 60);
    const actualNextMin = nextMin % 60;

    // Check if next slot end would exceed end time
    if (nextHour > endHour || (nextHour === endHour && actualNextMin > endMin)) {
      break;
    }

    const start = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const end = `${String(nextHour).padStart(2, '0')}:${String(actualNextMin).padStart(2, '0')}`;

    slots.push({
      start,
      end,
      datetime: `${date}T${start}:00${IST_OFFSET}`,
    });

    currentHour = nextHour;
    currentMin = actualNextMin;
  }

  return slots;
}

/**
 * Get lowercase day of week name in IST timezone
 * IMPORTANT: Uses explicit timezone to work correctly on servers running in UTC
 */
function getDayOfWeekLower(date: Date): string {
  const dayName = date.toLocaleDateString('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
  });
  return dayName.toLowerCase();
}

/**
 * Get capitalized day of week name in IST timezone
 */
function getDayOfWeekName(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
  });
}

/**
 * Format date as YYYY-MM-DD in IST timezone
 * IMPORTANT: Uses explicit timezone to work correctly on servers running in UTC
 */
export function formatDateISO(date: Date): string {
  // Use Intl.DateTimeFormat to get date parts in IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Returns YYYY-MM-DD format
}

/**
 * Format time as HH:MM in IST timezone
 * IMPORTANT: Uses explicit timezone to work correctly on servers running in UTC
 *
 * Example: If server is UTC and input is "2026-02-09T10:00:00+05:30" (10 AM IST)
 * - date.getHours() would return 4 (UTC time) - WRONG
 * - This function returns "10:00" (IST time) - CORRECT
 */
function formatTimeHHMM(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

// Export constants for use elsewhere
export const SCHEDULING_CONSTANTS = {
  SLOT_DURATION_MINUTES,
  MIN_LEAD_TIME_MS,
  JOIN_WINDOW_BEFORE_MS,
  JOIN_WINDOW_AFTER_MS,
  MISSED_THRESHOLD_MS,
  IST_OFFSET,
};
