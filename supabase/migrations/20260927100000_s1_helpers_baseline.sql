-- ============================================================================
-- S-1 · file 1 of 6 · S-20 (DB-1): baseline for the policy helpers that
-- production has but no migration file defined.
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- is_admin(), is_vet() and can_vet_see_care_attachment(text) exist in
-- production (created by hand; RLS policies and a storage policy call them) but
-- in no file in this folder, so a database rebuilt from this folder would fail
-- at the first policy that uses them. The definitions below are copied from
-- production (pg_get_functiondef, read on 2026-09-27; identical to
-- furrie-launch prod-snapshot A2, 2026-09-24).
--
-- Each function is created ONLY IF IT IS MISSING. On production this file
-- changes nothing, and running it again after file 2 (which hardens
-- is_admin()/is_vet()) cannot undo that hardening. Grants are set by file 2.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.care_plan_steps') IS NULL
     OR to_regclass('public.care_plans') IS NULL THEN
    RAISE EXCEPTION 'S1: profiles / care_plan_steps / care_plans missing in this database; stop and check the snapshot';
  END IF;

  IF to_regprocedure('public.is_admin()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE SECURITY DEFINER
      SET search_path TO 'public'
      AS $body$
        SELECT COALESCE(
          (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
          false
        );
      $body$
    $fn$;
  END IF;

  IF to_regprocedure('public.is_vet()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_vet()
      RETURNS boolean
      LANGUAGE sql
      STABLE SECURITY DEFINER
      SET search_path TO 'public'
      AS $body$
        SELECT COALESCE(
          (SELECT role = 'vet' FROM profiles WHERE id = auth.uid()),
          false
        );
      $body$
    $fn$;
  END IF;

  IF to_regprocedure('public.can_vet_see_care_attachment(text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.can_vet_see_care_attachment(file_path text)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public', 'pg_temp'
      AS $body$
      DECLARE
        v_step_id uuid;
      BEGIN
        v_step_id := (string_to_array(file_path, '/'))[2]::uuid;
        RETURN EXISTS (
          SELECT 1 FROM care_plan_steps cps
          JOIN care_plans cp ON cp.id = cps.care_plan_id
          WHERE cps.id = v_step_id
            AND cp.vet_id = auth.uid()
        );
      EXCEPTION
        WHEN others THEN
          -- Malformed path or invalid uuid: deny.
          RETURN false;
      END;
      $body$
    $fn$;
  END IF;
END $$;

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection).
--
-- SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public'
--    AND p.proname IN ('is_admin', 'is_vet', 'can_vet_see_care_attachment')
--    AND p.prosecdef;
--   -- expect 3
-- ============================================================================
