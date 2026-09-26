-- ============================================================================
-- S-1 · file 2 of 6 · S-14, S-15, S-02 (SEC-4, SEC-7):
--   (a) the anonymous role gets no direct access to any table in public;
--   (b) SECURITY DEFINER functions are no longer executable by anon/PUBLIC,
--       and consume_pack_credit / validate_invite_code become server-only;
--   (c) is_admin()/is_vet() are hardened (search_path '', fully qualified).
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- Safe with the code that is live today and with L1:
--   - nothing in the web app or the parked mobile app reads a public table
--     while signed out (every user-session query runs as `authenticated`);
--   - consume_pack_credit and validate_invite_code are only ever called with
--     the service key (book route; /api/invites/validate);
--   - trigger functions do not need EXECUTE to fire (Postgres checks EXECUTE
--     when a trigger is created, not when it runs);
--   - RLS policies call is_admin()/is_vet() as the querying role, so
--     `authenticated` keeps EXECUTE on them. Anonymous callers no longer reach
--     any policy, because they have no table privileges at all.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.consume_pack_credit(uuid, uuid)') IS NULL
     OR to_regprocedure('public.validate_invite_code(text)') IS NULL
     OR to_regprocedure('public.handle_new_user()') IS NULL
     OR to_regprocedure('public.handle_new_customer_invite()') IS NULL
     OR to_regprocedure('public.is_admin()') IS NULL
     OR to_regprocedure('public.is_vet()') IS NULL
     OR to_regprocedure('public.can_vet_see_care_attachment(text)') IS NULL THEN
    RAISE EXCEPTION 'S1: a function this file expects is missing; run 20260927100000_s1_helpers_baseline.sql first and check the snapshot';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- (a) S-14: no direct table access for anonymous callers.
--     Supabase's defaults gave `anon` every privilege on every table, so RLS was
--     the only gate, and 74 policies had no TO clause (they applied to anon too).
--     The default-privilege change stops new tables created by `postgres`
--     (SQL Editor, apply_migration) from getting anon grants again.
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- ----------------------------------------------------------------------------
-- (b) S-02 (SEC-4): consume_pack_credit(p_customer_id, …) spends ANY customer's
--     credit. Server only. Signature and body unchanged (L1 seam 1).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.consume_pack_credit(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pack_credit(uuid, uuid) TO service_role;

-- S-15: validate_invite_code is called only by /api/invites/validate with the
-- service key; a direct call would skip that route's per-IP rate limit.
REVOKE ALL ON FUNCTION public.validate_invite_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO service_role;

-- Trigger functions: nobody calls these directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_customer_invite() FROM PUBLIC, anon, authenticated;

-- handle_new_user() is SECURITY DEFINER with no search_path (advisor warning).
-- Its body already writes to public.profiles by full name; body unchanged.
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- ----------------------------------------------------------------------------
-- (c) Policy helpers. Same logic as production; search_path '' with fully
--     qualified names, and auth.uid() evaluated once per statement. They keep
--     reading profiles (Phase 1 will swap the bodies to a JWT claim).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.role = 'admin' FROM public.profiles p WHERE p.id = (SELECT auth.uid())),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vet()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.role = 'vet' FROM public.profiles p WHERE p.id = (SELECT auth.uid())),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_vet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_vet() TO authenticated, service_role;

-- Called by the storage policy "Vets can view their care plan attachments"
-- (TO authenticated). Body unchanged.
REVOKE ALL ON FUNCTION public.can_vet_see_care_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_vet_see_care_attachment(text) TO authenticated, service_role;

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection).
--
-- SELECT count(*) FROM information_schema.role_table_grants
--  WHERE grantee = 'anon' AND table_schema = 'public';
--   -- expect 0
--
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.prosecdef
--    AND has_function_privilege('anon', p.oid, 'EXECUTE');
--   -- expect 0
--
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.prosecdef
--    AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
--   -- expect 4 (can_vet_see_care_attachment, is_admin, is_vet, redeem_invite_code)
--
-- SELECT count(*) FROM pg_proc
--  WHERE oid IN ('public.consume_pack_credit(uuid,uuid)'::regprocedure,
--                'public.validate_invite_code(text)'::regprocedure)
--    AND has_function_privilege('service_role', oid, 'EXECUTE')
--    AND NOT has_function_privilege('authenticated', oid, 'EXECUTE');
--   -- expect 2
--
-- SELECT count(*) FROM pg_proc
--  WHERE oid IN ('public.handle_new_user()'::regprocedure,
--                'public.is_admin()'::regprocedure, 'public.is_vet()'::regprocedure)
--    AND proconfig IS NOT NULL;
--   -- expect 3
--
-- After the next real sign-up (the trigger still creates the profile):
-- SELECT count(*) FROM auth.users u
--  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
--   -- expect 0
-- ============================================================================
