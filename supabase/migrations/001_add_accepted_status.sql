-- ============================================================================
-- FURRIE DATABASE MIGRATION - Add 'accepted' consultation status
-- Version: 1.1
-- Date: 2026-02-09
-- Description: Adds 'accepted' status to consultation state machine and
--              accepted_at timestamp column for tracking when vet accepts
-- ============================================================================

-- Add accepted_at timestamp column
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update status constraint to include 'accepted'
-- First drop the existing constraint, then add the new one
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE consultations ADD CONSTRAINT consultations_status_check
  CHECK (status IN (
    'pending',
    'matching',
    'matched',
    'accepted',
    'in_progress',
    'completed',
    'missed',
    'cancelled',
    'no_vet_available'
  ));

-- Add index for cron job query performance
-- This optimizes the query: WHERE status = 'matched' AND updated_at < X
CREATE INDEX IF NOT EXISTS idx_consultations_stale_matched
  ON consultations (status, updated_at)
  WHERE status = 'matched';

-- Add comment for documentation
COMMENT ON COLUMN consultations.accepted_at IS 'Timestamp when vet explicitly accepted the consultation via /api/consultations/[id]/accept';

-- ============================================================================
-- State Machine Documentation
-- ============================================================================
-- New flow:
--   pending -> matching -> matched -> accepted -> in_progress -> completed
--                            |
--                            +-> (30s timeout) -> reassigned or no_vet_available
--
-- The 'accepted' status indicates the vet has explicitly committed to the
-- consultation via the server-side acceptance API. This prevents:
-- 1. Race conditions where two vets might accept simultaneously
-- 2. Reassignment of consultations that are already in progress
-- 3. Orphaned consultations where no one accepted
-- ============================================================================
