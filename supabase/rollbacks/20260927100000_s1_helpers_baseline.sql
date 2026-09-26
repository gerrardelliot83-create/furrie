-- ============================================================================
-- ROLLBACK for 20260927100000_s1_helpers_baseline.sql (S-1, 2026-09-27)
--
-- Intentionally does nothing. File 1 only creates the three helpers where they
-- are missing; on production they already existed, so there is nothing to undo.
-- Dropping is_admin(), is_vet() or can_vet_see_care_attachment() would break
-- every RLS and storage policy that calls them. To undo file 2's hardening, run
-- rollbacks/20260927100100_s1_anon_and_functions.sql instead.
-- ============================================================================
SELECT 'nothing to roll back for s1_helpers_baseline' AS note;
