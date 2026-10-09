-- ============================================================================
-- VC-1b · record that someone pressed Join.
-- 2026-10-09. Idempotent: safe to run twice. Apply BEFORE merging the
-- fix/vc1b-outcomes branch (its code reads and writes these columns).
--
-- Why: Daily only shows who reached the video call. A pet parent stuck on a
-- camera-permission prompt, an in-app browser or a bad network never reaches
-- it, so "the vet was there and the pet parent wasn't" looked like the pet
-- parent didn't come. These columns say who pressed Join, so such a call is
-- closed as 'failed' (ops email) instead of 'missed', and the vet can't
-- record "didn't come" for a pet parent who tried.
--
-- Written only by POST /api/consultations/[id]/join with the service key, the
-- first time each person presses Join (guarded: IS NULL). No backfill: older
-- consultations keep NULL ("unknown"), and the rules treat NULL as "did not
-- press Join", exactly as before this file.
--
-- Client sessions can't write them: s1_guard_consultation_update
-- (20260927100300_s1_write_rules.sql) lets a signed-in non-admin change only
-- status, outcome, ended_at, updated_at, duration_minutes and was_extended;
-- any other column changing (these included) raises. The service role and
-- admins are exempt. There is no INSERT policy on consultations for non-admins
-- (S-03). So the guard needs no change.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS customer_join_requested_at timestamptz NULL;

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS vet_join_requested_at timestamptz NULL;

COMMENT ON COLUMN public.consultations.customer_join_requested_at IS
  'VC-1b: when the pet parent first pressed Join (the join route issued a call ticket). Set once by the server; NULL = never pressed, or before 2026-10.';

COMMENT ON COLUMN public.consultations.vet_join_requested_at IS
  'VC-1b: when the vet first pressed Join (the join route issued a call ticket). Set once by the server; NULL = never pressed, or before 2026-10.';

-- ============================================================================
-- Verification (the CTO runs this through the read-only connection).
--
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'consultations'
--    AND column_name IN ('customer_join_requested_at', 'vet_join_requested_at');
--   -- expect 2 rows: timestamp with time zone, YES
--
-- SELECT count(*) FROM pg_trigger
--  WHERE tgname = 's1_guard_consultation_update' AND NOT tgisinternal AND tgenabled = 'O';
--   -- expect 1 (the guard that keeps client sessions off these columns)
-- ============================================================================

-- ============================================================================
-- Rollback (run only after the VC-1b code is reverted; it reads these columns).
--
-- ALTER TABLE public.consultations DROP COLUMN IF EXISTS customer_join_requested_at;
-- ALTER TABLE public.consultations DROP COLUMN IF EXISTS vet_join_requested_at;
-- ============================================================================
