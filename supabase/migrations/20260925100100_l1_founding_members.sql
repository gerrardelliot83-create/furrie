-- ============================================================================
-- L1: founding members — the one free consultation promised to people on the
-- furrie.in waitlist. Launch sprint L1, 2026-09-25. Additive and idempotent.
-- Run BEFORE merging the L1 pull request.
--
-- The waitlist lives in a different Supabase project from the app (verified
-- 2026-09-24), so the list arrives here at cut-over as a CSV import; see
-- supabase/ops/l1_founding_cutover.sql. Until then this table is empty and
-- the claim function grants nothing.
--
-- Server-only: RLS on and no policies, so only the service role can read or
-- write it. The claim function is executable by service_role only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.founding_members (
  email text PRIMARY KEY
    CONSTRAINT founding_members_email_normalised CHECK (email = lower(btrim(email)) AND email <> ''),
  source text NOT NULL DEFAULT 'waitlist',
  listed_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  granted_customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_pack_id uuid REFERENCES public.consultation_packs(id) ON DELETE SET NULL,
  granted_at timestamptz
);

ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.founding_members IS
  'L1: emails promised a free first consultation (furrie.in waitlist). Server-only (RLS, no policies). One grant per email, ever.';

-- ----------------------------------------------------------------------------
-- l1_claim_founding_credit — if this customer's own email (read from
-- profiles, never from the caller) is on the list and not yet granted, give
-- one 1-credit pack valid for 60 days (Gerard, 2026-09-25) and record it.
-- Returns the pack id (also when it was granted earlier), or NULL.
-- Called on a new customer's first dashboard view, and by the cut-over script
-- for customers who already had an account.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.l1_claim_founding_credit(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_member public.founding_members%ROWTYPE;
  v_pack_id uuid;
BEGIN
  SELECT lower(btrim(email)) INTO v_email
    FROM public.profiles
   WHERE id = p_user_id AND role = 'customer';

  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_member
    FROM public.founding_members
   WHERE email = v_email
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_member.granted_at IS NOT NULL THEN
    RETURN v_member.granted_pack_id;
  END IF;

  INSERT INTO public.consultation_packs (
    customer_id, pack_size, total_consultations, unit_price, discount_percent,
    total_price, status, source, admin_note, expires_at
  ) VALUES (
    p_user_id, 1, 1, 0, 100, 0, 'active', 'promo', 'founding_member',
    now() + interval '60 days'
  )
  RETURNING id INTO v_pack_id;

  UPDATE public.founding_members
     SET granted_customer_id = p_user_id,
         granted_pack_id = v_pack_id,
         granted_at = now()
   WHERE email = v_email;

  RETURN v_pack_id;
END;
$$;

REVOKE ALL ON FUNCTION public.l1_claim_founding_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.l1_claim_founding_credit(uuid) TO service_role;

-- ============================================================================
-- Verification (expected results in comments):
--
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.founding_members'::regclass;
--   -- expect true
-- SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'founding_members';
--   -- expect 0
-- SELECT has_function_privilege('authenticated', 'public.l1_claim_founding_credit(uuid)', 'EXECUTE'),
--        has_function_privilege('service_role', 'public.l1_claim_founding_credit(uuid)', 'EXECUTE');
--   -- expect false, true
-- SELECT count(*) FROM public.founding_members;
--   -- expect 0 until the cut-over import
-- ============================================================================
