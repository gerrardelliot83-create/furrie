-- ============================================================================
-- ROLLBACK for 20260927100500_s1_credit_requests_after_l1.sql (S-1, 2026-09-27)
--
-- Restores the customer INSERT policy as file 4 left it (pinned to a plain
-- pending request). Only needed if some code still inserts credit requests
-- with the customer's session; L1's code does not.
-- ============================================================================

DROP POLICY IF EXISTS "Customers can insert own credit requests" ON public.consultation_credit_requests;
CREATE POLICY "Customers can insert own credit requests"
  ON public.consultation_credit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    AND status = 'pending'
    AND fulfilled_pack_id IS NULL
    AND fulfilled_by_admin_id IS NULL
    AND fulfilled_at IS NULL
  );

-- Verification:
-- SELECT count(*) FROM pg_policies WHERE tablename = 'consultation_credit_requests'
--    AND cmd = 'INSERT';   -- expect 1
