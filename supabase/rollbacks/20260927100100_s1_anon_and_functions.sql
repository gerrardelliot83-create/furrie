-- ============================================================================
-- ROLLBACK for 20260927100100_s1_anon_and_functions.sql (S-1, 2026-09-27)
--
-- WARNING: this RE-OPENS SEC-4 (anyone can spend another customer's credit) and
-- anonymous table access. Use only if file 2 broke something, and tell the CTO
-- first. Restores the grants, function bodies and default privileges that
-- production had on 2026-09-27.
-- ============================================================================

-- (a) anonymous table access, as Supabase's defaults had it
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

-- (b) function grants back to PUBLIC / anon / authenticated
GRANT EXECUTE ON FUNCTION public.consume_pack_credit(uuid, uuid) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_customer_invite() TO PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.handle_new_user() RESET search_path;

-- (c) helper bodies exactly as production had them
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT COALESCE(
      (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
      false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_vet()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT COALESCE(
      (SELECT role = 'vet' FROM profiles WHERE id = auth.uid()),
      false
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_vet() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_vet_see_care_attachment(text) TO PUBLIC, anon, authenticated, service_role;

-- Verification:
-- SELECT count(*) FROM information_schema.role_table_grants
--  WHERE grantee = 'anon' AND table_schema = 'public';            -- expect > 0
-- SELECT has_function_privilege('anon', 'public.consume_pack_credit(uuid,uuid)', 'EXECUTE');  -- expect true
