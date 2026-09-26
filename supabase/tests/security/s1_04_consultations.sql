-- ============================================================================
-- S-1 security test s1_04_consultations: consultation write rules (S-03, S-07 SEC-6)
-- Proves: customers cannot insert consultations; the vet can complete / close / extend exactly as the
-- web and mobile apps do, but cannot change anything else or reopen; admins and the server are unaffected.
--
-- How to run: Supabase > SQL Editor > New query > paste this whole file > Run.
-- Safe on production: everything happens inside ONE statement. It creates four
-- test accounts (s1-test-…@example.invalid), a pet and a consultation, checks
-- each rule while acting as those accounts, then ends with an error ON PURPOSE,
-- which undoes every change (accounts included).
--
--   Expected result:  ERROR:  S1 TEST PASSED: s1_04_consultations (N checks) …
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

  INSERT INTO public.consultations (id, customer_id, vet_id, pet_id, type, status, outcome, scheduled_at, ended_at)
    VALUES ('5e1a0000-0000-4000-8000-0000000000f2', c_a, c_vet, c_pet, 'scheduled', 'closed', 'success',
            now() - interval '30 days', now() - interval '30 days');

  -- expect: refused (S-03)
  PERFORM pg_temp.s1_check('customer inserts a free scheduled consultation', 'authenticated', c_a, format('INSERT INTO public.consultations (customer_id, vet_id, pet_id, type, status, is_free, scheduled_at) VALUES (%L, %L, %L, ''scheduled'', ''scheduled'', true, now() + interval ''31 days'')', c_a, c_vet, c_pet), 'denied');
  PERFORM pg_temp.s1_check('customer updates own consultation directly', 'authenticated', c_a, format('UPDATE public.consultations SET status = ''closed'', outcome = ''cancelled'' WHERE id = %L', c_con), 'rows:0');
  PERFORM pg_temp.s1_check('customer B reads A''s consultation', 'authenticated', c_b, format('SELECT count(*) FROM public.consultations WHERE id = %L', c_con), 'count:0');

  -- expect: allowed for the assigned vet (today's web + mobile shapes)
  PERFORM pg_temp.s1_check('vet completes (SOAPForm shape)', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''closed'', outcome = ''success'', ended_at = now(), updated_at = now(), duration_minutes = 25 WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('vet completes (ConsultationDetailTabs shape)', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''closed'', outcome = ''success'', ended_at = now(), updated_at = now() WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('vet closes as missed (mobile vet app shape)', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''closed'', outcome = ''missed'' WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('vet closes as failed (mobile vet app shape)', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''closed'', outcome = ''failed'' WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('vet extends (extend route shape)', 'authenticated', c_vet, format('UPDATE public.consultations SET duration_minutes = 45, was_extended = true, updated_at = now() WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('vet re-completes an already closed consultation', 'authenticated', c_vet, 'UPDATE public.consultations SET status = ''closed'', outcome = ''success'', ended_at = now(), updated_at = now() WHERE id = ''5e1a0000-0000-4000-8000-0000000000f2''', 'rows:1');

  -- expect: refused for the vet (S-07)
  PERFORM pg_temp.s1_check('vet moves the consultation to customer B', 'authenticated', c_vet, format('UPDATE public.consultations SET customer_id = %L WHERE id = %L', c_b, c_con), 'denied');
  PERFORM pg_temp.s1_check('vet reassigns it to another vet', 'authenticated', c_vet, format('UPDATE public.consultations SET vet_id = %L WHERE id = %L', c_admin, c_con), 'denied');
  PERFORM pg_temp.s1_check('vet sets amount_paid', 'authenticated', c_vet, format('UPDATE public.consultations SET amount_paid = 0 WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet sets is_free', 'authenticated', c_vet, format('UPDATE public.consultations SET is_free = true WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet sets payment_id', 'authenticated', c_vet, format('UPDATE public.consultations SET payment_id = %L WHERE id = %L', c_a, c_con), 'denied');
  PERFORM pg_temp.s1_check('vet sets daily_room_name', 'authenticated', c_vet, format('UPDATE public.consultations SET daily_room_name = ''furrie-other'' WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet sets recording_url', 'authenticated', c_vet, format('UPDATE public.consultations SET recording_url = ''https://x'' WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet moves the appointment time', 'authenticated', c_vet, format('UPDATE public.consultations SET scheduled_at = now() WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet starts it (scheduled -> active)', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''active'' WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet closes it as cancelled', 'authenticated', c_vet, format('UPDATE public.consultations SET status = ''closed'', outcome = ''cancelled'' WHERE id = %L', c_con), 'denied');
  PERFORM pg_temp.s1_check('vet reopens a closed consultation', 'authenticated', c_vet, 'UPDATE public.consultations SET status = ''active'' WHERE id = ''5e1a0000-0000-4000-8000-0000000000f2''', 'denied');

  -- expect: admins (signed in) and the server are unaffected
  PERFORM pg_temp.s1_check('admin (signed in) edits any field', 'authenticated', c_admin, format('UPDATE public.consultations SET amount_paid = 1 WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('server edits any field', 'service_role', NULL, format('UPDATE public.consultations SET status = ''active'', started_at = now() WHERE id = %L', c_con), 'rows:1');
  PERFORM pg_temp.s1_check('server inserts a consultation (booking route)', 'service_role', NULL, format('INSERT INTO public.consultations (customer_id, vet_id, pet_id, type, status, scheduled_at) VALUES (%L, %L, %L, ''scheduled'', ''pending'', now() + interval ''32 days'')', c_a, c_vet, c_pet), 'rows:1');

  RAISE EXCEPTION 'S1 TEST PASSED: s1_04_consultations (% checks). This error is expected: it undoes the test accounts and every change.',
    current_setting('s1.checks');
END $test$;
