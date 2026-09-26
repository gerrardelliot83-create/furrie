-- ============================================================================
-- ROLLBACK for 20260925100000_l1_credits_upi.sql (L1, 2026-09-25)
--
-- Run only if the L1 pull request has been reverted (or never merged) and the
-- functions must go. Removes the three functions and the two indexes.
--
-- Deliberately KEEPS the new consultation_credit_requests columns and their
-- constraints: once customers have made UPI requests, those columns hold the
-- record of what they were asked to pay. Dropping them would delete payment
-- records. The pre-L1 code ignores them, so leaving them is harmless.
-- The two invite codes backfilled for old customers are also kept (harmless).
-- ============================================================================
DROP FUNCTION IF EXISTS public.l1_schedule_with_credit(uuid, uuid);
DROP FUNCTION IF EXISTS public.l1_fulfil_credit_request(uuid, uuid, integer, numeric, numeric, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.l1_release_consultation_credit(uuid);
DROP INDEX IF EXISTS public.l1_uq_invite_codes_redeemed_by;
-- l1_uq_credit_requests_reference is kept with the columns it protects.

-- Verification:
-- SELECT count(*) FROM pg_proc WHERE proname IN
--   ('l1_schedule_with_credit','l1_fulfil_credit_request','l1_release_consultation_credit');
--   -- expect 0
