-- ============================================================================
-- S-1 security test s1_02_functions: definer functions locked down (S-02 SEC-4, S-15)
-- Proves: nobody but the server can spend a credit or validate an invite directly; trigger functions
-- cannot be called; is_admin()/is_vet() still answer correctly for signed-in users; sign-up still works.
--
-- How to run: Supabase > SQL Editor > New query > paste this whole file > Run.
-- Safe on production: everything happens inside ONE statement. It creates four
-- test accounts (s1-test-…@example.invalid), a pet and a consultation, checks
-- each rule while acting as those accounts, then ends with an error ON PURPOSE,
-- which undoes every change (accounts included).
--
--   Expected result:  ERROR:  S1 TEST PASSED: s1_02_functions (N checks) …
--   A broken rule:    ERROR:  S1 TEST FAILED: <which check> (…)
-- ============================================================================
DO $test$
DECLARE
  c_a     CONSTANT uuid := '5e1a0000-0000-4000-8000-00000000000a';  -- customer A
  c_b     CONSTANT uuid := '5e1a0000-0000-4000-8000-00000000000b';  -- customer B
  c_vet   CONSTANT uuid := '5e1a0000-0000-4000-8000-00000000000c';  -- vet
  c_admin CONSTANT uuid := '5e1a0000-0000-4000-8000-00000000000d';  -- admin
  c_pet   CONSTANT uuid := '5e1a0000-0000-4000-8000-0000000000e1';  -- customer A's pet
  c_con   CONSTANT uuid := '5e1a0000-0000-4000-8000-0000000000f1';  -- A's scheduled consultation with the vet
BEGIN
  PERFORM set_config('s1.checks', '0', true);

  -- s1_check(label, role, user, sql, expect): runs sql as role/user, then undoes
  -- its effect. expect = 'denied' | 'rows:N' | 'count:N'.
  CREATE FUNCTION pg_temp.s1_check(p_label text, p_role text, p_user uuid, p_sql text, p_expect text)
  RETURNS void LANGUAGE plpgsql AS $f$
  DECLARE
    n bigint;
    v_denied boolean := false;
    v_err text;
  BEGIN
    BEGIN
      PERFORM set_config('request.jwt.claims',
        CASE WHEN p_user IS NULL THEN json_build_object('role', p_role)::text
             ELSE json_build_object('sub', p_user, 'role', p_role)::text END, true);
      PERFORM set_config('role', p_role, true);
      IF p_expect LIKE 'count:%' THEN
        EXECUTE p_sql INTO n;
      ELSE
        EXECUTE p_sql;
        GET DIAGNOSTICS n = ROW_COUNT;
      END IF;
      RAISE EXCEPTION USING ERRCODE = 'S1RLB', MESSAGE = n::text;   -- undo, keep n
    EXCEPTION
      WHEN SQLSTATE 'S1RLB' THEN n := SQLERRM::bigint;
      WHEN insufficient_privilege THEN v_denied := true; v_err := SQLERRM;
    END;
    IF p_expect = 'denied' THEN
      IF NOT v_denied THEN
        RAISE EXCEPTION 'S1 TEST FAILED: % (expected a refusal; it was allowed, % rows)', p_label, n;
      END IF;
    ELSE
      IF v_denied THEN
        RAISE EXCEPTION 'S1 TEST FAILED: % (expected %; it was refused: %)', p_label, p_expect, v_err;
      END IF;
      IF n <> split_part(p_expect, ':', 2)::bigint THEN
        RAISE EXCEPTION 'S1 TEST FAILED: % (expected %, got %)', p_label, p_expect, n;
      END IF;
    END IF;
    PERFORM set_config('s1.checks', (current_setting('s1.checks')::int + 1)::text, true);
  END $f$;

  -- Test accounts. The sign-up trigger creates their profiles.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (c_a,     's1-test-customer-a@example.invalid', '{"full_name":"S1 Test Customer A"}'),
    (c_b,     's1-test-customer-b@example.invalid', '{"full_name":"S1 Test Customer B"}'),
    (c_vet,   's1-test-vet@example.invalid',        '{"full_name":"S1 Test Vet"}'),
    (c_admin, 's1-test-admin@example.invalid',      '{"full_name":"S1 Test Admin"}');
  UPDATE public.profiles SET role = 'vet'   WHERE id = c_vet;
  UPDATE public.profiles SET role = 'admin' WHERE id = c_admin;
  INSERT INTO public.vet_profiles (id, qualifications, vci_registration_number, is_verified, is_available)
    VALUES (c_vet, 'BVSc (S1 test)', 'S1-TEST-VCI', true, false);
  INSERT INTO public.pets (id, owner_id, name, species, breed, gender)
    VALUES (c_pet, c_a, 'S1 Test Pet', 'dog', 'Indie', 'male');
  INSERT INTO public.consultations (id, customer_id, vet_id, pet_id, type, status, scheduled_at)
    VALUES (c_con, c_a, c_vet, c_pet, 'scheduled', 'scheduled', now() + interval '30 days');

  INSERT INTO public.consultation_packs (customer_id, pack_size, total_consultations, unit_price, discount_percent, total_price, source)
    VALUES (c_a, 1, 1, 0, 0, 0, 'admin_grant');

  -- expect: SEC-4 refused for anonymous and signed-in callers, allowed for the server
  PERFORM pg_temp.s1_check('anon spends customer A''s credit', 'anon', NULL, format('SELECT public.consume_pack_credit(%L, %L)', c_a, c_con), 'denied');
  PERFORM pg_temp.s1_check('customer B spends customer A''s credit', 'authenticated', c_b, format('SELECT public.consume_pack_credit(%L, %L)', c_a, c_con), 'denied');
  PERFORM pg_temp.s1_check('server spends a credit', 'service_role', NULL, format('SELECT public.consume_pack_credit(%L, %L)', c_a, c_con), 'rows:1');

  -- expect: validate_invite_code is server-only
  PERFORM pg_temp.s1_check('anon validates an invite code directly', 'anon', NULL, 'SELECT public.validate_invite_code(''ABC123'')', 'denied');
  PERFORM pg_temp.s1_check('signed-in user validates an invite code directly', 'authenticated', c_b, 'SELECT public.validate_invite_code(''ABC123'')', 'denied');
  PERFORM pg_temp.s1_check('server validates an invite code', 'service_role', NULL, 'SELECT public.validate_invite_code(''ABC123'')', 'rows:1');

  -- expect: trigger functions can't be called directly
  PERFORM pg_temp.s1_check('anon calls handle_new_user()', 'anon', NULL, 'SELECT public.handle_new_user()', 'denied');
  PERFORM pg_temp.s1_check('signed-in user calls handle_new_customer_invite()', 'authenticated', c_b, 'SELECT public.handle_new_customer_invite()', 'denied');

  -- expect: policy helpers refused for anon, correct for signed-in users
  PERFORM pg_temp.s1_check('anon calls is_admin()', 'anon', NULL, 'SELECT public.is_admin()', 'denied');
  PERFORM pg_temp.s1_check('anon calls can_vet_see_care_attachment()', 'anon', NULL, 'SELECT public.can_vet_see_care_attachment(''x/y/z'')', 'denied');
  PERFORM pg_temp.s1_check('is_admin() true for the admin', 'authenticated', c_admin, 'SELECT count(*) FROM (SELECT 1) x WHERE public.is_admin()', 'count:1');
  PERFORM pg_temp.s1_check('is_admin() false for a customer', 'authenticated', c_a, 'SELECT count(*) FROM (SELECT 1) x WHERE public.is_admin()', 'count:0');
  PERFORM pg_temp.s1_check('is_vet() true for the vet', 'authenticated', c_vet, 'SELECT count(*) FROM (SELECT 1) x WHERE public.is_vet()', 'count:1');
  PERFORM pg_temp.s1_check('is_vet() false for the admin', 'authenticated', c_admin, 'SELECT count(*) FROM (SELECT 1) x WHERE public.is_vet()', 'count:0');
  PERFORM pg_temp.s1_check('admin policy still works: admin reads all test profiles', 'authenticated', c_admin, format('SELECT count(*) FROM public.profiles WHERE id IN (%L, %L, %L)', c_a, c_b, c_vet), 'count:3');

  -- expect: the sign-up trigger still fires for the role that inserts users
  --         (only where this session may act as supabase_auth_admin, e.g. the local test database)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')
     AND pg_has_role(session_user, 'supabase_auth_admin', 'MEMBER') THEN
    PERFORM pg_temp.s1_check('sign-up as the auth service creates a profile', 'supabase_auth_admin', NULL, 'INSERT INTO auth.users (id, email) VALUES (''5e1a0000-0000-4000-8000-0000000000aa'', ''s1-test-signup@example.invalid'')', 'rows:1');
  END IF;
  INSERT INTO auth.users (id, email) VALUES ('5e1a0000-0000-4000-8000-0000000000ab', 's1-test-signup2@example.invalid');
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '5e1a0000-0000-4000-8000-0000000000ab') THEN
    RAISE EXCEPTION 'S1 TEST FAILED: sign-up trigger did not create a profile';
  END IF;
  PERFORM set_config('s1.checks', (current_setting('s1.checks')::int + 1)::text, true);

  RAISE EXCEPTION 'S1 TEST PASSED: s1_02_functions (% checks). This error is expected: it undoes the test accounts and every change.',
    current_setting('s1.checks');
END $test$;
