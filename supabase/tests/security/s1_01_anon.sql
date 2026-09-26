-- ============================================================================
-- S-1 security test s1_01_anon: no anonymous access to any table (S-14)
-- Proves: signed-out callers are refused on every table in public, and on tables created later;
-- signed-in users and the server still work.
--
-- How to run: Supabase > SQL Editor > New query > paste this whole file > Run.
-- Safe on production: everything happens inside ONE statement. It creates four
-- test accounts (s1-test-…@example.invalid), a pet and a consultation, checks
-- each rule while acting as those accounts, then ends with an error ON PURPOSE,
-- which undoes every change (accounts included).
--
--   Expected result:  ERROR:  S1 TEST PASSED: s1_01_anon (N checks) …
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

  -- expect: anon is refused on every table in public
  DECLARE r record;
  BEGIN
    FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1 LOOP
      PERFORM pg_temp.s1_check('anon reads ' || r.relname, 'anon', NULL,
        format('SELECT count(*) FROM public.%I', r.relname), 'denied');
    END LOOP;
  END;
  PERFORM pg_temp.s1_check('anon inserts a consultation', 'anon', NULL, format('INSERT INTO public.consultations (customer_id, pet_id, type, status) VALUES (%L, %L, ''scheduled'', ''scheduled'')', c_a, c_pet), 'denied');
  PERFORM pg_temp.s1_check('anon reads ratings (was USING true)', 'anon', NULL, 'SELECT count(*) FROM public.consultation_ratings', 'denied');
  PERFORM pg_temp.s1_check('anon reads verified vet profiles (VCI number)', 'anon', NULL, 'SELECT count(*) FROM public.vet_profiles WHERE is_verified', 'denied');

  -- expect: a table created after this file gets no anonymous grant (default privileges)
  CREATE TABLE public.s1_probe_table (id int);
  PERFORM pg_temp.s1_check('anon reads a table created later', 'anon', NULL, 'SELECT count(*) FROM public.s1_probe_table', 'denied');
  PERFORM pg_temp.s1_check('signed-in user reads a table created later (RLS off, default grant kept)', 'authenticated', c_a, 'SELECT count(*) FROM public.s1_probe_table', 'count:0');

  -- expect: signed-in users and the server are unaffected
  PERFORM pg_temp.s1_check('customer A reads own profile', 'authenticated', c_a, format('SELECT count(*) FROM public.profiles WHERE id = %L', c_a), 'count:1');
  PERFORM pg_temp.s1_check('customer A reads own pets', 'authenticated', c_a, format('SELECT count(*) FROM public.pets WHERE owner_id = %L', c_a), 'count:1');
  PERFORM pg_temp.s1_check('server reads profiles', 'service_role', NULL, format('SELECT count(*) FROM public.profiles WHERE id IN (%L, %L)', c_a, c_b), 'count:2');

  RAISE EXCEPTION 'S1 TEST PASSED: s1_01_anon (% checks). This error is expected: it undoes the test accounts and every change.',
    current_setting('s1.checks');
END $test$;
