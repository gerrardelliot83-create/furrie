-- ============================================================================
-- FURRIE DATABASE MIGRATION - Consolidate Consultation Statuses
-- Version: 4.0
-- Date: 2026-02-12
--
-- PURPOSE: Consolidate 10 consultation statuses into 4 statuses + outcome field
--
-- OLD STATUSES: pending, matching, matched, accepted, scheduled, in_progress,
--               completed, missed, cancelled, no_vet_available
--
-- NEW STATUSES: pending, scheduled, active, closed
-- NEW OUTCOME:  success, missed, cancelled, failed (for closed status)
--
-- MAPPING:
--   pending       -> pending
--   matching      -> scheduled
--   matched       -> scheduled
--   accepted      -> scheduled
--   scheduled     -> scheduled (unchanged)
--   in_progress   -> active
--   completed     -> closed + outcome='success'
--   missed        -> closed + outcome='missed'
--   cancelled     -> closed + outcome='cancelled'
--   no_vet_available -> closed + outcome='failed'
-- ============================================================================

-- ============================================================================
-- STEP 1: Add outcome column
-- ============================================================================
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS outcome TEXT;

-- Add constraint for valid outcome values
ALTER TABLE consultations ADD CONSTRAINT consultations_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('success', 'missed', 'cancelled', 'failed'));

-- ============================================================================
-- STEP 2: Migrate existing data (BEFORE changing status constraint)
-- Order matters: update rows that need outcome FIRST, then do simple renames
-- ============================================================================

-- Terminal statuses that need outcome
UPDATE consultations
SET outcome = 'success', status = 'closed'
WHERE status = 'completed';

UPDATE consultations
SET outcome = 'missed', status = 'closed'
WHERE status = 'missed';

UPDATE consultations
SET outcome = 'cancelled', status = 'closed'
WHERE status = 'cancelled';

UPDATE consultations
SET outcome = 'failed', status = 'closed'
WHERE status = 'no_vet_available';

-- Simple status renames (no outcome needed)
UPDATE consultations
SET status = 'active'
WHERE status = 'in_progress';

UPDATE consultations
SET status = 'scheduled'
WHERE status IN ('matching', 'matched', 'accepted');

-- ============================================================================
-- STEP 3: Update status constraint to new values
-- ============================================================================
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE consultations ADD CONSTRAINT consultations_status_check
  CHECK (status IN ('pending', 'scheduled', 'active', 'closed'));

-- ============================================================================
-- STEP 4: Add constraint - closed status MUST have an outcome
-- ============================================================================
ALTER TABLE consultations ADD CONSTRAINT consultations_closed_outcome_required
  CHECK (status != 'closed' OR outcome IS NOT NULL);

-- ============================================================================
-- STEP 5: Update indexes for new query patterns
-- ============================================================================

-- Drop deprecated indexes that reference old statuses
DROP INDEX IF EXISTS idx_consultations_stale_matched;
DROP INDEX IF EXISTS idx_consultations_vet_active;

-- Create new indexes for common queries
-- Index for vet's upcoming schedule (scheduled and active consultations)
CREATE INDEX IF NOT EXISTS idx_consultations_vet_schedule
  ON consultations (vet_id, scheduled_at, status)
  WHERE status IN ('scheduled', 'active');

-- Index for outcome queries (e.g., count successful consultations)
CREATE INDEX IF NOT EXISTS idx_consultations_outcome
  ON consultations (outcome)
  WHERE status = 'closed';

-- Index for conflict checking in scheduling
CREATE INDEX IF NOT EXISTS idx_consultations_booking_conflicts
  ON consultations (vet_id, scheduled_at)
  WHERE status IN ('pending', 'scheduled', 'active');

-- ============================================================================
-- STEP 6: Add documentation comments
-- ============================================================================
COMMENT ON COLUMN consultations.status IS
  'Consultation status: pending (awaiting payment), scheduled (ready for call), active (call in progress), closed (ended)';

COMMENT ON COLUMN consultations.outcome IS
  'Outcome when status=closed: success (completed normally), missed (no-show), cancelled (customer cancelled), failed (technical failure or no vet)';

-- ============================================================================
-- STATE MACHINE DOCUMENTATION (Updated)
-- ============================================================================
--
-- NEW SIMPLIFIED FLOW:
--   pending -> scheduled -> active -> closed
--       |          |                     ^
--       |          +---------------------+ (with outcome)
--       +--------------------------------+
--
-- Status Transitions:
--   pending   -> scheduled (after payment)
--   pending   -> closed    (cancelled before payment, outcome='cancelled')
--   scheduled -> active    (first participant joins)
--   scheduled -> closed    (cancelled or missed, outcome='cancelled'|'missed')
--   active    -> closed    (call ends, outcome='success')
--
-- Outcome Values (only when status='closed'):
--   success   - Call completed normally
--   missed    - No-show (neither party joined within window)
--   cancelled - Customer cancelled before call
--   failed    - Technical failure or no vet available (legacy data)
--
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
