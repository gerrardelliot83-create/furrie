-- ============================================================================
-- S-1 · file 4 of 6 · SEC-6 write rules:
--   S-03 customers can no longer INSERT consultations directly;
--   S-07 a signed-in user who is not an admin (in practice the assigned vet)
--        may change only the status, outcome, end time and duration of a
--        consultation;
--   S-08 a vet can no longer set is_verified, ratings, counts or VCI details;
--   S-09 a pet parent can only tick a care-plan step, not rewrite it;
--   S-10 customers can no longer create or extend follow-up threads;
--   S-11 a direct credit-request insert must be a plain 'pending' request.
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- Safe with the code that is live today (L1 + L1.1) and with the parked
-- mobile app. Every write below was checked against every user-session write
-- in both repositories:
--   - consultations are inserted only by the booking route, with the service
--     key; the vet's direct writes are SOAPForm / ConsultationDetailTabs
--     (status, outcome, ended_at, updated_at, duration_minutes), the extend
--     route (duration_minutes, was_extended, updated_at) and the mobile vet
--     app (status 'closed', outcome success|missed|failed) - all still allowed;
--   - vet_profiles: VetStatusToggle (is_available), WeeklyScheduleEditor
--     (availability_schedule), /api/vet/profile (specializations,
--     years_of_experience, availability_schedule) - all still allowed;
--   - care-plan steps: the pet parent's only write is /complete (status,
--     completed_at); the vet's writes are unchanged;
--   - follow-up threads are created only by /api/follow-up/thread with the
--     service key; nothing updates them with a user session;
--   - credit requests: L1 inserts with the service key; file 6 drops the
--     customer INSERT policy entirely.
-- Server code (service key), cron jobs, the SQL Editor and SECURITY DEFINER /
-- service-role functions are not affected by the two triggers.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.consultations') IS NULL
     OR to_regclass('public.vet_profiles') IS NULL
     OR to_regclass('public.care_plan_steps') IS NULL
     OR to_regclass('public.care_plans') IS NULL
     OR to_regclass('public.follow_up_threads') IS NULL
     OR to_regclass('public.consultation_credit_requests') IS NULL THEN
    RAISE EXCEPTION 'S1: a table this file expects is missing; stop and check the snapshot';
  END IF;
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'S1: public.is_admin() is missing; run files 1 and 2 first';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- S-03: customers could insert a consultation with any status, vet, price or
-- is_free flag and skip the credit check. Bookings go through the server.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can create consultations" ON public.consultations;

-- ----------------------------------------------------------------------------
-- S-07: guard on UPDATE by a signed-in, non-admin user (in practice: the
-- assigned vet through "Vets can update assigned consultations").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.s1_guard_consultation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_editable CONSTANT text[] := ARRAY[
    'status', 'outcome', 'ended_at', 'updated_at', 'duration_minutes', 'was_extended'
  ];
BEGIN
  -- The server (service key), cron, the SQL Editor and SECURITY DEFINER
  -- functions run as other roles and are trusted.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF (SELECT public.is_admin()) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_editable) IS DISTINCT FROM (to_jsonb(OLD) - v_editable) THEN
    RAISE EXCEPTION 'S1: only the status, outcome, end time and duration of a consultation can be changed here'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status IN ('scheduled', 'active') AND NEW.status = 'closed') THEN
    RAISE EXCEPTION 'S1: a consultation can only be closed from scheduled or active (was %, asked %)',
      OLD.status, NEW.status
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.outcome IS DISTINCT FROM OLD.outcome
     AND NOT (NEW.status = 'closed' AND NEW.outcome IN ('success', 'missed', 'failed')) THEN
    RAISE EXCEPTION 'S1: outcome % is not allowed here', NEW.outcome
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.s1_guard_consultation_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.s1_guard_consultation_update() TO service_role;

DROP TRIGGER IF EXISTS s1_guard_consultation_update ON public.consultations;
CREATE TRIGGER s1_guard_consultation_update
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.s1_guard_consultation_update();

-- ----------------------------------------------------------------------------
-- S-08: vets may change only their availability, schedule, specialisations and
-- years of experience. Verification, ratings, counts and VCI details are set by
-- the admin API (service key) and by triggers.
-- ----------------------------------------------------------------------------
REVOKE UPDATE, INSERT, DELETE, TRUNCATE ON public.vet_profiles FROM authenticated;
GRANT UPDATE (is_available, availability_schedule, specializations, years_of_experience, updated_at)
  ON public.vet_profiles TO authenticated;

-- ----------------------------------------------------------------------------
-- S-09: on a care-plan step, anyone who is not the plan's vet, an admin or the
-- server may only move `status` between pending and completed and set
-- `completed_at`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.s1_guard_care_plan_step_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_parent_editable CONSTANT text[] := ARRAY['status', 'completed_at'];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF (SELECT public.is_admin()) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.care_plans cp
     WHERE cp.id = OLD.care_plan_id
       AND cp.vet_id = (SELECT auth.uid())
  ) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_parent_editable) IS DISTINCT FROM (to_jsonb(OLD) - v_parent_editable)
     OR NEW.status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'S1: only the vet can change a care-plan step; the pet parent can only mark it done'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.s1_guard_care_plan_step_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.s1_guard_care_plan_step_update() TO service_role;

DROP TRIGGER IF EXISTS s1_guard_care_plan_step_update ON public.care_plan_steps;
CREATE TRIGGER s1_guard_care_plan_step_update
  BEFORE UPDATE ON public.care_plan_steps
  FOR EACH ROW EXECUTE FUNCTION public.s1_guard_care_plan_step_update();

-- ----------------------------------------------------------------------------
-- S-10: customers could create a thread with any vet and no expiry, or extend
-- and reactivate their own thread (unpaid chat with a vet).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can create follow-up threads" ON public.follow_up_threads;
DROP POLICY IF EXISTS "Customers can update own follow-up threads" ON public.follow_up_threads;

-- ----------------------------------------------------------------------------
-- S-11: pin a direct customer insert to a plain pending request. Altered in
-- place, and only if the policy still exists, so running this file again after
-- file 6 (which drops the policy) does not bring it back.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'consultation_credit_requests'
       AND policyname = 'Customers can insert own credit requests'
  ) THEN
    ALTER POLICY "Customers can insert own credit requests"
      ON public.consultation_credit_requests
      TO authenticated
      WITH CHECK (
        customer_id = (SELECT auth.uid())
        AND status = 'pending'
        AND fulfilled_pack_id IS NULL
        AND fulfilled_by_admin_id IS NULL
        AND fulfilled_at IS NULL
      );
  END IF;
END $$;

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection).
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'public'
--    AND policyname IN ('Customers can create consultations',
--                       'Customers can create follow-up threads',
--                       'Customers can update own follow-up threads');
--   -- expect 0
--
-- SELECT count(*) FROM pg_trigger
--  WHERE tgname IN ('s1_guard_consultation_update', 's1_guard_care_plan_step_update')
--    AND NOT tgisinternal AND tgenabled = 'O';
--   -- expect 2
--
-- SELECT count(*) FROM information_schema.column_privileges
--  WHERE table_schema = 'public' AND table_name = 'vet_profiles'
--    AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
--   -- expect 5
--
-- SELECT count(*) FROM pg_proc
--  WHERE proname IN ('s1_guard_consultation_update', 's1_guard_care_plan_step_update')
--    AND NOT prosecdef
--    AND NOT has_function_privilege('authenticated', oid, 'EXECUTE');
--   -- expect 2
--
-- SELECT count(*) FROM pg_policies
--  WHERE tablename = 'consultation_credit_requests' AND cmd = 'INSERT'
--    AND with_check LIKE '%pending%';
--   -- expect 0 once file 6 has run (1 between files 4 and 6)
-- ============================================================================
