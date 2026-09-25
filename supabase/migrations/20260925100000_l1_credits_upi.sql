-- ============================================================================
-- L1: credits — UPI purchase requests, booking with a credit in one
-- transaction, one-step admin grant, and credit back on early cancellation.
-- Launch sprint L1, 2026-09-25. Additive and idempotent: safe to run twice.
-- Run BEFORE merging the L1 pull request (the code that is live today ignores
-- everything this file adds).
--
-- Written against production as read on 2026-09-24 (furrie-launch
-- prod-snapshot): consultation_credit_requests, consultation_packs and
-- consultation_pack_uses match migrations 012 + 015 exactly.
--
-- Every function here is SECURITY INVOKER and executable by service_role
-- ONLY. The API routes call them with the service key after their own
-- authentication and ownership checks; no signed-in user or anonymous caller
-- can reach them through /rest/v1/rpc.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.consultation_credit_requests') IS NULL
     OR to_regclass('public.consultation_packs') IS NULL
     OR to_regclass('public.consultation_pack_uses') IS NULL
     OR to_regclass('public.consultations') IS NULL THEN
    RAISE EXCEPTION 'L1: a credits table is missing in this database; stop and check the snapshot';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. UPI purchase details on consultation_credit_requests
--    Rows created before L1 keep these NULL ("legacy" requests).
-- ----------------------------------------------------------------------------
ALTER TABLE public.consultation_credit_requests
  ADD COLUMN IF NOT EXISTS pack_size integer
    CONSTRAINT l1_credit_requests_pack_size_check CHECK (pack_size IN (1, 3, 5, 10)),
  ADD COLUMN IF NOT EXISTS price_inr numeric(10,2)
    CONSTRAINT l1_credit_requests_price_check CHECK (price_inr > 0),
  ADD COLUMN IF NOT EXISTS gst_inr numeric(10,2)
    CONSTRAINT l1_credit_requests_gst_check CHECK (gst_inr >= 0),
  ADD COLUMN IF NOT EXISTS amount_inr numeric(10,2)
    CONSTRAINT l1_credit_requests_amount_check CHECK (amount_inr > 0),
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS upi_vpa text,
  ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payer_utr text
    CONSTRAINT l1_credit_requests_utr_check CHECK (payer_utr ~ '^[0-9]{12}$'),
  ADD COLUMN IF NOT EXISTS bank_reference text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS l1_uq_credit_requests_reference
  ON public.consultation_credit_requests (reference_code)
  WHERE reference_code IS NOT NULL;

-- A priced request carries all of its pricing; a legacy request carries none.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.consultation_credit_requests'::regclass
      AND conname = 'l1_credit_requests_pricing_complete'
  ) THEN
    ALTER TABLE public.consultation_credit_requests
      ADD CONSTRAINT l1_credit_requests_pricing_complete CHECK (
        (reference_code IS NULL AND pack_size IS NULL AND price_inr IS NULL
          AND gst_inr IS NULL AND amount_inr IS NULL)
        OR
        (reference_code IS NOT NULL AND pack_size IS NOT NULL AND price_inr IS NOT NULL
          AND gst_inr IS NOT NULL AND amount_inr IS NOT NULL)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.consultation_credit_requests.reference_code IS
  'L1: payment reference shown to the customer and put in the UPI note (e.g. FP7K4QXM). NULL on legacy requests.';
COMMENT ON COLUMN public.consultation_credit_requests.amount_inr IS
  'L1: total the customer was asked to pay by UPI (price_inr + gst_inr).';
COMMENT ON COLUMN public.consultation_credit_requests.payment_claimed_at IS
  'L1: when the customer tapped "I''ve paid". Status stays pending until an admin verifies.';

-- One account can redeem at most one invite code (was enforced only by a
-- lookup inside redeem_invite_code, which can race). Production has 0
-- redemptions, so this cannot fail on existing rows.
CREATE UNIQUE INDEX IF NOT EXISTS l1_uq_invite_codes_redeemed_by
  ON public.invite_codes (redeemed_by_id)
  WHERE redeemed_by_id IS NOT NULL;

-- Customers created before the invite trigger existed have no code
-- (2 in production on 2026-09-24). Same logic as migration 017; idempotent.
INSERT INTO public.invite_codes (referrer_id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'customer'
  AND NOT EXISTS (SELECT 1 FROM public.invite_codes i WHERE i.referrer_id = p.id);

-- ----------------------------------------------------------------------------
-- 2. l1_schedule_with_credit — take one credit and confirm the booking in the
--    same transaction (fixes BRK-9: a credit can no longer be spent on a
--    booking that then fails to be confirmed, or the other way round).
--
--    Takes the credit that expires soonest (invite / founding credits before
--    non-expiring paid ones), then the oldest. Skips packs past expires_at
--    even before the hourly expiry cron has run.
--    Returns the pack id, or NULL when the customer has no usable credit.
--    Raises if the consultation is not a pending consultation of that
--    customer, which rolls everything back.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.l1_schedule_with_credit(
  p_customer_id uuid,
  p_consultation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pack_id uuid;
  v_rows integer;
BEGIN
  IF p_customer_id IS NULL OR p_consultation_id IS NULL THEN
    RAISE EXCEPTION 'l1_schedule_with_credit: customer and consultation are required';
  END IF;

  -- Serialise concurrent bookings by the same customer: wait for any other
  -- booking holding their packs, then choose from a fresh snapshot below.
  PERFORM 1
    FROM public.consultation_packs
   WHERE customer_id = p_customer_id
     AND status = 'active'
   FOR UPDATE;

  SELECT id INTO v_pack_id
    FROM public.consultation_packs
   WHERE customer_id = p_customer_id
     AND status = 'active'
     AND used_count < total_consultations
     AND (expires_at IS NULL OR expires_at > now())
   ORDER BY (expires_at IS NULL), expires_at, purchased_at, id
   LIMIT 1;

  IF v_pack_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.consultations
     SET status = 'scheduled',
         is_free = true
   WHERE id = p_consultation_id
     AND customer_id = p_customer_id
     AND status = 'pending';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'l1_schedule_with_credit: % is not a pending consultation of this customer',
      p_consultation_id;
  END IF;

  -- SET expressions read the old used_count, so "+ 1 >= total" means
  -- "this was the last credit".
  UPDATE public.consultation_packs
     SET used_count = used_count + 1,
         status = CASE WHEN used_count + 1 >= total_consultations THEN 'exhausted' ELSE status END
   WHERE id = v_pack_id;

  INSERT INTO public.consultation_pack_uses (pack_id, consultation_id)
  VALUES (v_pack_id, p_consultation_id);

  RETURN v_pack_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. l1_fulfil_credit_request — the admin's "payment received → grant" in one
--    step. Locks the request, requires it to be open (or a request the
--    customer replaced after paying), checks that the stored pack size and
--    amount are exactly what the price list says (so a request row written by
--    anyone other than our server can't be granted at a wrong price), creates
--    the pack at the real price and marks the request fulfilled.
--    Calling it twice returns the same pack (double-click safe).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.l1_fulfil_credit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_expected_pack_size integer,
  p_expected_price numeric,
  p_expected_amount numeric,
  p_unit_price numeric,
  p_discount_percent numeric,
  p_bank_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r public.consultation_credit_requests%ROWTYPE;
  v_pack_id uuid;
BEGIN
  IF p_request_id IS NULL OR p_admin_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'VALIDATION_ERROR');
  END IF;

  SELECT * INTO r
    FROM public.consultation_credit_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  IF r.status = 'fulfilled' THEN
    RETURN jsonb_build_object('ok', true, 'already', true,
      'pack_id', r.fulfilled_pack_id, 'customer_id', r.customer_id, 'pack_size', r.pack_size);
  END IF;

  IF NOT (r.status IN ('pending', 'contacted')
          OR (r.status = 'cancelled' AND r.cancel_reason = 'replaced')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_OPEN', 'status', r.status);
  END IF;

  IF r.reference_code IS NULL OR r.pack_size IS NULL OR r.amount_inr IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'LEGACY_REQUEST');
  END IF;

  IF r.pack_size <> p_expected_pack_size
     OR r.price_inr <> p_expected_price
     OR r.amount_inr <> p_expected_amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'AMOUNT_MISMATCH');
  END IF;

  INSERT INTO public.consultation_packs (
    customer_id, pack_size, total_consultations, unit_price, discount_percent,
    total_price, status, source, granted_by_admin_id, admin_note
  ) VALUES (
    r.customer_id, r.pack_size, r.pack_size, p_unit_price,
    greatest(0, least(100, p_discount_percent)),
    r.price_inr, 'active', 'purchase', p_admin_id,
    format('UPI %s; paid %s incl. GST %s', r.reference_code, r.amount_inr, r.gst_inr)
  )
  RETURNING id INTO v_pack_id;

  UPDATE public.consultation_credit_requests
     SET status = 'fulfilled',
         fulfilled_pack_id = v_pack_id,
         fulfilled_by_admin_id = p_admin_id,
         fulfilled_at = now(),
         payment_verified_at = now(),
         bank_reference = nullif(btrim(coalesce(p_bank_reference, '')), ''),
         cancel_reason = NULL
   WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'already', false,
    'pack_id', v_pack_id, 'customer_id', r.customer_id, 'pack_size', r.pack_size);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. l1_release_consultation_credit — give the credit back when a customer
--    cancels a credit booking in time (Terms §7.3). Only for consultations
--    already closed as cancelled; the cancel route decides whether it was in
--    time. Returns the pack id, or NULL if no credit was used. Idempotent.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.l1_release_consultation_credit(
  p_consultation_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_use_id uuid;
  v_pack_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.consultations
     WHERE id = p_consultation_id AND status = 'closed' AND outcome = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'l1_release_consultation_credit: % is not a cancelled consultation',
      p_consultation_id;
  END IF;

  SELECT id, pack_id INTO v_use_id, v_pack_id
    FROM public.consultation_pack_uses
   WHERE consultation_id = p_consultation_id
   FOR UPDATE;

  IF v_use_id IS NULL THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.consultation_pack_uses WHERE id = v_use_id;

  UPDATE public.consultation_packs
     SET used_count = used_count - 1,
         status = CASE WHEN status = 'exhausted' THEN 'active' ELSE status END
   WHERE id = v_pack_id
     AND used_count > 0;

  RETURN v_pack_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Only the server (service role) may call these functions. Supabase's
--    default privileges grant EXECUTE on new public functions to anon and
--    authenticated, so revoke explicitly. Re-running keeps these grants.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.l1_schedule_with_credit(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.l1_schedule_with_credit(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.l1_fulfil_credit_request(uuid, uuid, integer, numeric, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.l1_fulfil_credit_request(uuid, uuid, integer, numeric, numeric, numeric, numeric, text) TO service_role;

REVOKE ALL ON FUNCTION public.l1_release_consultation_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.l1_release_consultation_credit(uuid) TO service_role;

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection; Gerard
-- can also paste them into a New query). Expected results in comments.
--
-- SELECT count(*) FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'consultation_credit_requests'
--    AND column_name IN ('pack_size','price_inr','gst_inr','amount_inr','reference_code',
--      'upi_vpa','payment_claimed_at','payer_utr','bank_reference','payment_verified_at','cancel_reason');
--   -- expect 11
--
-- SELECT proname, prosecdef,
--        has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated_can,
--        has_function_privilege('anon', oid, 'EXECUTE') AS anon_can,
--        has_function_privilege('service_role', oid, 'EXECUTE') AS service_can
--   FROM pg_proc WHERE proname LIKE 'l1\_%' ORDER BY 1;
--   -- expect 3 rows (l1_fulfil_credit_request, l1_release_consultation_credit,
--   -- l1_schedule_with_credit): prosecdef false, authenticated_can false,
--   -- anon_can false, service_can true
--
-- SELECT count(*) FROM pg_indexes
--  WHERE indexname IN ('l1_uq_credit_requests_reference', 'l1_uq_invite_codes_redeemed_by');
--   -- expect 2
--
-- SELECT count(*) FROM public.profiles p WHERE p.role = 'customer'
--    AND NOT EXISTS (SELECT 1 FROM public.invite_codes i WHERE i.referrer_id = p.id);
--   -- expect 0
-- ============================================================================
