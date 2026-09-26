-- ============================================================================
-- ROLLBACK for 20260927100300_s1_write_rules.sql (S-1, 2026-09-27)
--
-- WARNING: this RE-OPENS SEC-6 (customers can insert free consultations, vets
-- can rewrite any consultation field or verify themselves, customers can
-- extend follow-up chats). Use only if file 4 broke a vet or customer flow, and
-- tell the CTO first. Restores production's definitions of 2026-09-27.
-- If file 6 has run, roll it back first (reverse order).
-- ============================================================================

-- consultations
DROP TRIGGER IF EXISTS s1_guard_consultation_update ON public.consultations;
DROP FUNCTION IF EXISTS public.s1_guard_consultation_update();

DROP POLICY IF EXISTS "Customers can create consultations" ON public.consultations;
CREATE POLICY "Customers can create consultations"
  ON public.consultations
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- vet_profiles
REVOKE UPDATE ON public.vet_profiles FROM authenticated;   -- also clears the column grants
GRANT UPDATE, INSERT, DELETE, TRUNCATE ON public.vet_profiles TO authenticated;

-- care_plan_steps
DROP TRIGGER IF EXISTS s1_guard_care_plan_step_update ON public.care_plan_steps;
DROP FUNCTION IF EXISTS public.s1_guard_care_plan_step_update();

-- follow_up_threads
DROP POLICY IF EXISTS "Customers can create follow-up threads" ON public.follow_up_threads;
CREATE POLICY "Customers can create follow-up threads"
  ON public.follow_up_threads
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own follow-up threads" ON public.follow_up_threads;
CREATE POLICY "Customers can update own follow-up threads"
  ON public.follow_up_threads
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- consultation_credit_requests: the original, unpinned policy
DROP POLICY IF EXISTS "Customers can insert own credit requests" ON public.consultation_credit_requests;
CREATE POLICY "Customers can insert own credit requests"
  ON public.consultation_credit_requests
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Verification:
-- SELECT count(*) FROM pg_trigger WHERE tgname LIKE 's1\_guard\_%';           -- expect 0
-- SELECT count(*) FROM pg_policies WHERE policyname IN (
--   'Customers can create consultations', 'Customers can create follow-up threads',
--   'Customers can update own follow-up threads', 'Customers can insert own credit requests');  -- expect 4
