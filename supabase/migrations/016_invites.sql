-- ============================================================================
-- FURRIE DATABASE MIGRATION - Viral Invite System
-- Version: 16.0
-- Date: 2026-04-10
--
-- PURPOSE: Each customer gets 1 sharable invite code on signup. When a
-- new pet parent signs up with a valid code, the invitee receives 1 free
-- consultation. The referrer receives 1 free consultation after the
-- invitee completes their first consultation (prevents fake-signup abuse).
--
-- SCHEMA:
--   - invite_codes: one row per invite, linked to referrer
--   - generate_invite_code(): produces 8-char alphanumeric codes
--   - handle_new_customer_invite(): trigger that auto-creates 1 invite
--     on new customer profile insertion
--   - validate_invite_code(): SECURITY DEFINER RPC for pre-signup checks
--
-- SCHEMA HARMONY:
--   - invite_codes is a NEW table (no conflict)
--   - Uses profiles FK for referrer and redeemed_by
--   - Uses consultation_packs FK for referrer_reward_pack
--   - No existing tables modified
-- ============================================================================


-- ============================================================================
-- STEP 1: generate_invite_code() — 8-char base32 code
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I/O/0/1 to avoid confusion
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  -- Format as XXXX-XXXX for readability
  RETURN substr(result, 1, 4) || '-' || substr(result, 5, 4);
END;
$$;


-- ============================================================================
-- STEP 2: invite_codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT generate_invite_code(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'redeemed', 'revoked')),
  redeemed_by_id UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ,
  -- Referrer reward: granted when the invitee completes first consultation
  referrer_rewarded_at TIMESTAMPTZ,
  referrer_reward_pack_id UUID REFERENCES consultation_packs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invite_codes_referrer ON invite_codes(referrer_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_status ON invite_codes(status);
CREATE INDEX IF NOT EXISTS idx_invite_codes_redeemed_by ON invite_codes(redeemed_by_id)
  WHERE redeemed_by_id IS NOT NULL;


-- ============================================================================
-- STEP 3: RLS policies
-- ============================================================================

-- Referrer can read their own invites
CREATE POLICY "Customers can read own invites"
  ON invite_codes FOR SELECT
  USING (referrer_id = auth.uid());

-- Admins manage all
CREATE POLICY "Admins can manage all invites"
  ON invite_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================================
-- STEP 4: Auto-create invite on new customer signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_customer_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    -- Attempt to create; silently skip if it somehow fails (e.g., code collision retry)
    BEGIN
      INSERT INTO invite_codes (referrer_id)
      VALUES (NEW.id);
    EXCEPTION WHEN unique_violation THEN
      -- Code collision — retry once with a new code
      INSERT INTO invite_codes (code, referrer_id)
      VALUES (generate_invite_code(), NEW.id);
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_customer_invite
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_customer_invite();


-- ============================================================================
-- STEP 5: validate_invite_code() — SECURITY DEFINER RPC for pre-signup
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invite_codes%ROWTYPE;
  v_referrer_name TEXT;
BEGIN
  SELECT * INTO v_invite
    FROM invite_codes
    WHERE code = upper(trim(p_code))
    LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid invite code');
  END IF;

  IF v_invite.status != 'available' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This invite has already been used');
  END IF;

  SELECT split_part(full_name, ' ', 1)
    INTO v_referrer_name
    FROM profiles
    WHERE id = v_invite.referrer_id;

  RETURN jsonb_build_object(
    'valid', true,
    'referrerFirstName', coalesce(v_referrer_name, 'A friend')
  );
END;
$$;


-- ============================================================================
-- STEP 6: Documentation
-- ============================================================================

COMMENT ON TABLE invite_codes IS
  'Viral invite codes — each customer gets 1 on signup. Invitee gets 1 free consultation, referrer gets 1 after invitee completes their first consultation.';

COMMENT ON FUNCTION generate_invite_code IS
  '8-char alphanumeric code formatted as XXXX-XXXX. Excludes confusing chars I/O/0/1.';

COMMENT ON FUNCTION validate_invite_code IS
  'SECURITY DEFINER RPC for pre-signup invite validation. Returns {valid: bool, referrerFirstName?: string, reason?: string}. Does not require auth.';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
