-- ============================================================================
-- S-1 · file 3 of 6 · S-01 (SEC-5): a signed-in user can no longer change
-- their own profiles.role, is_active or email.
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- Before: policy "Users can update own profile" (UPDATE, USING auth.uid() = id)
-- plus a table-wide UPDATE grant, so any customer could run
--   update profiles set role = 'admin' where id = <self>
-- through the public API and pass every admin check (verifyAdmin, middleware
-- and every admin RLS policy read profiles.role).
--
-- After: `authenticated` may UPDATE only these columns of its own row:
--   full_name, phone, avatar_url, pincode, expo_push_token, updated_at
-- which are exactly what /api/profile and /api/vet/profile write with the
-- user's session (the only user-session writers of profiles in the web and
-- mobile code). Role, is_active and email are changed only by the admin API
-- with the service key, which is unaffected.
--
-- Postgres note: revoking a table-level privilege also removes that privilege
-- from every column, so REVOKE-then-GRANT gives the same result on every run.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'S1: public.profiles is missing; stop and check the snapshot';
  END IF;
END $$;

REVOKE UPDATE, INSERT, DELETE, TRUNCATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url, pincode, expo_push_token, updated_at)
  ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection).
--
-- SELECT count(*) FROM information_schema.column_privileges
--  WHERE table_schema = 'public' AND table_name = 'profiles'
--    AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
--   -- expect 6
--
-- SELECT count(*) FROM information_schema.column_privileges
--  WHERE table_schema = 'public' AND table_name = 'profiles'
--    AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
--    AND column_name IN ('role', 'is_active', 'email', 'id');
--   -- expect 0
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'public' AND tablename = 'profiles'
--    AND policyname = 'Users can update own profile'
--    AND roles = '{authenticated}' AND with_check IS NOT NULL;
--   -- expect 1
-- ============================================================================
