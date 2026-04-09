-- ============================================================================
-- FURRIE DATABASE MIGRATION - Treatment Plan Builder
-- Version: 14.0
-- Date: 2026-04-09
--
-- PURPOSE: Extend the existing `prescriptions` table with section-oriented
-- columns so vets can build richer, editable "Treatment Plans" via a new
-- builder UI. This is an additive migration — no columns are dropped,
-- no data is mutated, no constraints tightened.
--
-- The "prescriptions" table name is retained (cosmetic rename to
-- "Treatment Plan" has already been completed across all user-facing
-- surfaces). This migration only adds new section columns, a version
-- counter, a history of previous PDF URLs, and a finalized_at timestamp.
--
-- SCHEMA HARMONY:
--   - Purely additive: all new columns default to safe empty values
--   - Existing rows remain valid (no NOT NULL without default)
--   - No changes to RLS policies (inherited from migration 000)
--   - No changes to triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Section-oriented columns for the builder
-- ----------------------------------------------------------------------------

-- Clinical observations narrative (vet-editable, optional, supplements SOAP)
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS observations TEXT;

-- Structured list of recommended lab / diagnostic tests.
-- Shape per element: { name, urgency, rationale, instructions }
-- urgency ∈ 'routine' | 'urgent' | 'stat'
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS lab_tests JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Vet-editable diet & nutrition section. If set, takes precedence over
-- `dietary_recommendations` (which is copied from the SOAP notes).
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS diet_nutrition TEXT;

-- Vet-editable home-care / lifestyle notes. Supplements
-- `lifestyle_recommendations` copied from SOAP notes.
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS home_care TEXT;

-- Follow-up block broken out from the SOAP-derived `follow_up_recommendation`.
-- Shape: { timeframe, mode, notes } where mode ∈ 'teleconsult' | 'in_person' | 'none'
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS follow_up JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Free-form additional sections the vet wants to include.
-- Shape per element: { title, body, order }
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS custom_sections JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- Version history & finalization tracking
-- ----------------------------------------------------------------------------

-- Previous PDF URLs kept when the vet regenerates after finalizing.
-- Each element: { url, finalized_at, version }
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS previous_pdf_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Monotonic version counter (bumped on each regenerate).
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Timestamp of the latest finalize. NULL while in draft.
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

-- Existing prescriptions have no partial index for "active draft per
-- consultation" — we add one to make the builder's GET-by-consultation fast.
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_status
  ON prescriptions(consultation_id, status);

-- ----------------------------------------------------------------------------
-- Column comments (documentation for future type regenerations)
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN prescriptions.observations IS
  'Vet-editable narrative of clinical observations and findings. Shown as the Observations section of the Treatment Plan.';

COMMENT ON COLUMN prescriptions.lab_tests IS
  'Array of recommended diagnostic tests: [{ name, urgency, rationale, instructions }]. urgency ∈ routine|urgent|stat.';

COMMENT ON COLUMN prescriptions.diet_nutrition IS
  'Vet-authored diet & nutrition guidance. Overrides dietary_recommendations (copied from SOAP) when non-empty.';

COMMENT ON COLUMN prescriptions.home_care IS
  'Vet-authored home care / lifestyle guidance. Supplements lifestyle_recommendations from SOAP.';

COMMENT ON COLUMN prescriptions.follow_up IS
  'Follow-up block: { timeframe, mode: teleconsult|in_person|none, notes }.';

COMMENT ON COLUMN prescriptions.custom_sections IS
  'Optional free-form sections: [{ title, body, order }]. Rendered at the end of the Treatment Plan.';

COMMENT ON COLUMN prescriptions.previous_pdf_urls IS
  'History of PDF URLs kept when the vet regenerates after finalizing. [{ url, finalized_at, version }].';

COMMENT ON COLUMN prescriptions.version IS
  'Monotonic version counter. Incremented each time a finalized plan is regenerated.';

COMMENT ON COLUMN prescriptions.finalized_at IS
  'Timestamp of the most recent finalize. NULL while the plan is in draft.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
