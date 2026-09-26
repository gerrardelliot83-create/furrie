-- ============================================================================
-- S-1 · file 6 of 6 · S-11 / L1 seam 3: customers no longer insert credit
-- requests with their own session.
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- Since L1 (PR #53, live 2026-09-26) every credit request is created by
-- /api/consultation-requests with the service key after its own checks. The
-- customer INSERT policy only served the pre-L1 flow, and with L1's payment
-- columns it would let a customer insert a "paid" request directly.
--
-- Guard: stops unless L1's SQL is in this database (a stand-in for "L1 is
-- deployed", which SQL cannot see).
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'l1_fulfil_credit_request'
  ) THEN
    RAISE EXCEPTION 'S1: L1''s SQL (20260925100000_l1_credits_upi) is not in this database; do not run this file until L1 is live';
  END IF;
END $$;

DROP POLICY IF EXISTS "Customers can insert own credit requests" ON public.consultation_credit_requests;

-- ============================================================================
-- Verification (the CTO runs this through the read-only connection).
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'consultation_credit_requests'
--    AND cmd = 'INSERT';
--   -- expect 0   (admins keep "Admins can manage all credit requests", cmd ALL)
-- ============================================================================
