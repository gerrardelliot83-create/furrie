/**
 * Scheduling Helper Functions
 *
 * Utilities for computing available time slots and managing scheduled consultations.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AvailabilitySchedule } from '@/types';

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

  // 1. Get all verified, available vets with their schedules
  const { data: vets, error: vetsError } = await supabaseAdmin
    .from('vet_profiles')
    .select('id, availability_schedule')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (vetsError) {
    console.error('Error fetching vets:', vetsError);
    throw new Error('Failed to fetch available vets');
  }

  if (!vets || vets.length === 0) {
    return [];
  }

  // 2. Get all existing scheduled consultations in date range
  const { data: existingConsultations, error: consultationsError } = await supabaseAdmin
    .from('consultations')
    .select('vet_id, scheduled_at')
    .gte('scheduled_at', fromDate.toISOString())
    .lte('scheduled_at', toDate.toISOString())
    .in('status', ['pending', 'scheduled', 'in_progress']);

  if (consultationsError) {
    console.error('Error fetching existing consultations:', consultationsError);
    throw new Error('Failed to fetch existing consultations');
  }

  // 3. Build set of booked slots per vet
  const bookedSlots = new Map<string, Set<string>>();
  for (const c of existingConsultations || []) {
    if (!c.vet_id || !c.scheduled_at) continue;
    if (!bookedSlots.has(c.vet_id)) {
      bookedSlots.set(c.vet_id, new Set());
    }
    // Store as ISO string for comparison
    bookedSlots.get(c.vet_id)!.add(c.scheduled_at);
  }

  // 4. For each day in range, compute available slots
  const result: DaySlots[] = [];
  const currentDate = new Date(fromDate);
  currentDate.setHours(0, 0, 0, 0); // Start from beginning of day

  while (currentDate <= toDate) {
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

          // Skip if less than minimum lead time
          if (slotTime.getTime() - now.getTime() < MIN_LEAD_TIME_MS) continue;

          // Skip if vet already booked for this slot
          const vetBookedSlots = bookedSlots.get(vet.id);
          if (vetBookedSlots) {
            // Check if any booking overlaps with this slot
            const isBooked = Array.from(vetBookedSlots).some((bookedTime) => {
              const bookedDate = new Date(bookedTime);
              // Slots overlap if they start at the same time (within tolerance)
              return Math.abs(bookedDate.getTime() - slotTime.getTime()) < 60000; // 1 minute tolerance
            });
            if (isBooked) continue;
          }

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

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Find an available vet for a specific time slot
 *
 * Returns the vet ID if one is available, or null if no vet is available
 */
export async function findAvailableVetForSlot(
  slotDatetime: string,
  excludeVetIds: string[] = []
): Promise<string | null> {
  const slotTime = new Date(slotDatetime);
  const dayOfWeekLower = getDayOfWeekLower(slotTime);
  const slotTimeStr = formatTimeHHMM(slotTime);

  // Get all verified, available vets
  let query = supabaseAdmin
    .from('vet_profiles')
    .select('id, availability_schedule')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (excludeVetIds.length > 0) {
    query = query.not('id', 'in', `(${excludeVetIds.join(',')})`);
  }

  const { data: vets, error } = await query;

  if (error || !vets) {
    console.error('Error fetching vets for slot:', error);
    return null;
  }

  // Check each vet's availability
  for (const vet of vets) {
    const schedule = vet.availability_schedule as AvailabilitySchedule | null;
    if (!schedule) continue;

    const daySchedule = schedule[dayOfWeekLower as keyof AvailabilitySchedule] || [];

    // Check if slot time falls within any of the vet's availability blocks
    const isWithinSchedule = daySchedule.some((block) => {
      return slotTimeStr >= block.start && slotTimeStr < block.end;
    });

    if (!isWithinSchedule) continue;

    // Check if vet is already booked for this slot
    const { data: existingBooking } = await supabaseAdmin
      .from('consultations')
      .select('id')
      .eq('vet_id', vet.id)
      .eq('scheduled_at', slotDatetime)
      .in('status', ['pending', 'scheduled', 'in_progress'])
      .maybeSingle();

    if (!existingBooking) {
      // Vet is available!
      return vet.id;
    }
  }

  return null;
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
function formatDateISO(date: Date): string {
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
