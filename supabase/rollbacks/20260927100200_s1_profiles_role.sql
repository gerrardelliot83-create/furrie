-- ============================================================================
-- ROLLBACK for 20260927100200_s1_profiles_role.sql (S-1, 2026-09-27)
--
-- WARNING: this RE-OPENS SEC-5 (any signed-in customer can make themselves an
-- admin). Use only if file 3 broke profile saving, and tell the CTO first.
-- Restores the table-wide grants and the original policy.
-- ============================================================================

REVOKE UPDATE ON public.profiles FROM authenticated;   -- also clears the column grants
GRANT UPDATE, INSERT, DELETE, TRUNCATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Verification:
-- SELECT has_table_privilege('authenticated', 'public.profiles', 'UPDATE');   -- expect true
-- SELECT count(*) FROM pg_policies WHERE tablename = 'profiles'
--    AND policyname = 'Users can update own profile' AND roles = '{public}';  -- expect 1
