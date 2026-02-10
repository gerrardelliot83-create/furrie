-- ============================================================================
-- FURRIE DATABASE MIGRATION - Scheduling-Based Consultations
-- Version: 2.0
-- Date: 2026-02-09
--
-- IMPORTANT: This migration is ADDITIVE and NON-DESTRUCTIVE
-- - Does NOT remove any existing columns or statuses
-- - All existing data remains valid
-- - Old code continues to work while new code uses scheduling
-- ============================================================================

-- ============================================================================
-- STEP 1: Add 'scheduled' status to the constraint
-- This preserves ALL existing statuses (including 'accepted' from migration 001)
-- ============================================================================

-- Drop existing constraint (may be from original schema or migration 001)
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

-- Recreate with ALL statuses - old AND new
-- This ensures backwards compatibility with existing data
ALTER TABLE consultations ADD CONSTRAINT consultations_status_check
  CHECK (status IN (
    -- Original statuses (from 000_complete_schema.sql)
    'pending',
    'matching',
    'matched',
    'in_progress',
    'completed',
    'missed',
    'cancelled',
    'no_vet_available',
    -- Added in migration 001
    'accepted',
    -- NEW for scheduling flow
    'scheduled'
  ));

-- ============================================================================
-- STEP 2: Add new columns for scheduling support
-- Using IF NOT EXISTS to be idempotent
-- ============================================================================

-- Track when the Daily.co room was created (for just-in-time room creation)
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS room_created_at TIMESTAMPTZ;

-- Track reminder notification status to prevent duplicate sends
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;

ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS reminder_15m_sent BOOLEAN DEFAULT false;

-- ============================================================================
-- STEP 3: Add indexes for scheduling queries
-- Using IF NOT EXISTS to be idempotent
-- ============================================================================

-- Index for finding upcoming scheduled consultations
-- Used by: customer dashboard, vet dashboard, reminder cron
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_upcoming
  ON consultations (scheduled_at, status)
  WHERE status = 'scheduled';

-- Index for vet's daily schedule queries
-- Used by: vet dashboard today's schedule
CREATE INDEX IF NOT EXISTS idx_consultations_vet_schedule
  ON consultations (vet_id, scheduled_at, status)
  WHERE status IN ('scheduled', 'in_progress');

-- Index for finding consultations that need reminders
-- Used by: reminder cron job
CREATE INDEX IF NOT EXISTS idx_consultations_reminders
  ON consultations (scheduled_at, reminder_1h_sent, reminder_15m_sent, status)
  WHERE status = 'scheduled';

-- Index for available slots computation
-- Used by: available-slots API to find booked slots
CREATE INDEX IF NOT EXISTS idx_consultations_slots_booked
  ON consultations (vet_id, scheduled_at)
  WHERE status IN ('scheduled', 'in_progress', 'pending');

-- ============================================================================
-- STEP 4: Add documentation comments
-- ============================================================================

COMMENT ON COLUMN consultations.scheduled_at IS
  'The scheduled appointment time for type=scheduled consultations. Customer selects this during booking.';

COMMENT ON COLUMN consultations.room_created_at IS
  'Timestamp when Daily.co room was created. Rooms are now created just-in-time when first participant joins.';

COMMENT ON COLUMN consultations.reminder_1h_sent IS
  'Whether the 1-hour reminder notification has been sent. Prevents duplicate reminders.';

COMMENT ON COLUMN consultations.reminder_15m_sent IS
  'Whether the 15-minute reminder notification has been sent. Prevents duplicate reminders.';

-- ============================================================================
-- STATE MACHINE DOCUMENTATION (Updated for Scheduling)
-- ============================================================================
--
-- NEW SCHEDULING FLOW:
--   pending -> scheduled -> in_progress -> completed
--       |          |
--       |          +-> missed (no-show after 10 min past scheduled_at)
--       |          +-> cancelled (customer or admin cancels)
--       +-> cancelled (before payment completes)
--
-- The 'scheduled' status indicates:
--   1. Payment has been completed
--   2. A specific time slot has been booked (scheduled_at is set)
--   3. A vet has been assigned (vet_id is set)
--   4. Both parties are waiting for the appointment time
--
-- Join window: 5 minutes before to 45 minutes after scheduled_at
-- Room creation: Just-in-time when first participant calls /join endpoint
-- Missed: Marked by cron job if no one joins within 10 min of scheduled_at
--
-- LEGACY MATCHING FLOW (still supported for existing data):
--   pending -> matching -> matched -> accepted -> in_progress -> completed
--
-- Both flows are valid. The 'type' column indicates which flow:
--   - type='scheduled' uses the new scheduling flow
--   - type='direct_connect' uses the legacy matching flow (deprecated for new consultations)
--
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE - NO DATA MODIFIED
-- ============================================================================
