-- ============================================================================
-- S-1 security test s1_07_follow_up_threads: customers cannot create or extend follow-up chats (S-10 SEC-6)
-- Proves: a customer cannot create a thread or change its expiry; both sides can still read the thread
-- and send messages; the vet and the server keep their access.
--
-- How to run: Supabase > SQL Editor > New query > paste this whole file > Run.
-- Safe on production: everything happens inside ONE statement. It creates four
-- test accounts (s1-test-…@example.invalid), a pet and a consultation, checks
-- each rule while acting as those accounts, then ends with an error ON PURPOSE,
-- which undoes every change (accounts included).
--
--   Expected result:  ERROR:  S1 TEST PASSED: s1_07_follow_up_threads (N checks) …
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

  INSERT INTO public.follow_up_threads (id, consultation_id, customer_id, vet_id, pet_id, is_active, expires_at)
    VALUES ('5e1a0000-0000-4000-8000-0000000000d1', c_con, c_a, c_vet, c_pet, true, now() + interval '7 days');

  -- expect: refused
  PERFORM pg_temp.s1_check('customer creates a thread with no expiry', 'authenticated', c_a, format('INSERT INTO public.follow_up_threads (consultation_id, customer_id, vet_id, pet_id, is_active, expires_at) VALUES (%L, %L, %L, %L, true, NULL)', c_con, c_a, c_vet, c_pet), 'denied');
  PERFORM pg_temp.s1_check('customer extends own thread by a year', 'authenticated', c_a, 'UPDATE public.follow_up_threads SET expires_at = now() + interval ''365 days'' WHERE id = ''5e1a0000-0000-4000-8000-0000000000d1''', 'rows:0');
  PERFORM pg_temp.s1_check('customer reactivates own thread', 'authenticated', c_a, 'UPDATE public.follow_up_threads SET is_active = true WHERE id = ''5e1a0000-0000-4000-8000-0000000000d1''', 'rows:0');

  -- expect: allowed
  PERFORM pg_temp.s1_check('customer reads own thread', 'authenticated', c_a, 'SELECT count(*) FROM public.follow_up_threads WHERE id = ''5e1a0000-0000-4000-8000-0000000000d1''', 'count:1');
  PERFORM pg_temp.s1_check('customer sends a message (web + mobile shape)', 'authenticated', c_a, format('INSERT INTO public.follow_up_messages (thread_id, sender_id, sender_role, message_type, content) VALUES (''5e1a0000-0000-4000-8000-0000000000d1'', %L, ''customer'', ''text'', ''hello'') RETURNING *', c_a), 'rows:1');
  PERFORM pg_temp.s1_check('vet sends a message', 'authenticated', c_vet, format('INSERT INTO public.follow_up_messages (thread_id, sender_id, sender_role, message_type, content) VALUES (''5e1a0000-0000-4000-8000-0000000000d1'', %L, ''vet'', ''text'', ''hi'') RETURNING *', c_vet), 'rows:1');
  PERFORM pg_temp.s1_check('vet closes own thread', 'authenticated', c_vet, 'UPDATE public.follow_up_threads SET is_active = false WHERE id = ''5e1a0000-0000-4000-8000-0000000000d1''', 'rows:1');
  PERFORM pg_temp.s1_check('server creates a thread (/api/follow-up/thread)', 'service_role', NULL, format('INSERT INTO public.follow_up_threads (consultation_id, customer_id, vet_id, pet_id, is_active, expires_at) VALUES (%L, %L, %L, %L, true, now() + interval ''7 days'')', c_con, c_a, c_vet, c_pet), 'rows:1');

  RAISE EXCEPTION 'S1 TEST PASSED: s1_07_follow_up_threads (% checks). This error is expected: it undoes the test accounts and every change.',
    current_setting('s1.checks');
END $test$;
