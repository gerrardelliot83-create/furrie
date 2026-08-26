-- ============================================================================
-- 021: redeem_invite_code() — atomic, idempotent invite redemption
-- ============================================================================
--
-- Replaces the multi-step sequence in POST /api/invites/redeem, which marked
-- the invite redeemed, then inserted the pack, then hand-rolled a compensating
-- "revert the invite" update when the insert failed. That compensation was
-- itself unguarded — if it failed, the invite was left burned with no pack
-- granted and the customer silently lost a free consultation.
--
-- Both writes now happen in one transaction, so a failing insert rolls the
-- invite update back with it and no compensation is needed.
--
-- Identity comes from auth.uid(), never from a parameter: this function grants
-- credits, so a caller must not be able to name the account being credited.
-- Callers pass a user-scoped client (cookie or bearer) — see getRequestUser().
--
-- Idempotent: re-redeeming the same code as the same user returns success
-- rather than ALREADY_REDEEMED, so the server can retry safely now that
-- redemption runs on first authenticated render instead of from a
-- fire-and-forget browser fetch.
--
-- Returns JSONB:
--   { "ok": true,  "credits_granted": 1, "expires_at": "...", "already": bool }
--   { "ok": false, "reason": "INVALID_CODE" | "SELF_REFERRAL"
--                          | "ALREADY_REDEEMED" | "ALREADY_USED_INVITE"
--                          | "VALIDATION_ERROR" | "AUTH_REQUIRED" }
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite invite_codes%ROWTYPE;
  v_other_redemption UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'AUTH_REQUIRED');
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'VALIDATION_ERROR');
  END IF;

  -- Lock the invite row for the rest of the transaction so two concurrent
  -- redemptions serialise instead of both passing the status check.
  SELECT * INTO v_invite
    FROM invite_codes
   WHERE code = upper(btrim(p_code))
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_CODE');
  END IF;

  IF v_invite.referrer_id = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'SELF_REFERRAL');
  END IF;

  -- Already redeemed by this same user — treat as success so retries are safe.
  IF v_invite.redeemed_by_id = v_user_id THEN
    SELECT expires_at INTO v_expires_at
      FROM consultation_packs
     WHERE customer_id = v_user_id
       AND source = 'invite'
     ORDER BY purchased_at DESC
     LIMIT 1;

    RETURN jsonb_build_object(
      'ok', true,
      'credits_granted', 1,
      'expires_at', v_expires_at,
      'already', true
    );
  END IF;

  IF v_invite.status <> 'available' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_REDEEMED');
  END IF;

  -- One invite per account, ever.
  SELECT id INTO v_other_redemption
    FROM invite_codes
   WHERE redeemed_by_id = v_user_id
   LIMIT 1;

  IF v_other_redemption IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_USED_INVITE');
  END IF;

  v_expires_at := now() + INTERVAL '60 days';

  UPDATE invite_codes
     SET status = 'redeemed',
         redeemed_by_id = v_user_id,
         redeemed_at = now()
   WHERE id = v_invite.id;

  INSERT INTO consultation_packs (
    customer_id, pack_size, total_consultations, unit_price,
    discount_percent, total_price, status, source, expires_at
  ) VALUES (
    v_user_id, 1, 1, 0, 100, 0, 'active', 'invite', v_expires_at
  );

  RETURN jsonb_build_object(
    'ok', true,
    'credits_granted', 1,
    'expires_at', v_expires_at,
    'already', false
  );
END;
$$;

-- SECURITY DEFINER functions are executable by PUBLIC by default. This one
-- writes credits, so only a signed-in caller may invoke it. It is still safe
-- for any authenticated user to call: the account credited is always their own
-- auth.uid(), which they cannot forge.
REVOKE ALL ON FUNCTION redeem_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION redeem_invite_code(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT) TO service_role;

COMMENT ON FUNCTION redeem_invite_code(TEXT) IS
  'Atomically redeems an invite code for auth.uid() and grants a 1-credit, '
  '60-day consultation pack. Idempotent for the same user + code.';
