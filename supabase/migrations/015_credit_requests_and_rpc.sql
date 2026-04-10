-- ============================================================================
-- FURRIE DATABASE MIGRATION - Credit Requests + Atomic Pack Deduction
-- Version: 15.0
-- Date: 2026-04-10
--
-- PURPOSE:
--   (a) Add `source` and `granted_by_admin_id` columns to consultation_packs
--       so packs created via admin grant are distinguishable from purchases.
--   (b) Relax the pack_size CHECK to allow arbitrary admin grants (1–100).
--   (c) Create `consultation_credit_requests` table for customers to
--       request more consultations offline (soft-launch flow — payments
--       hidden, team coordinates offline, admin grants credits).
--   (d) Create `consume_pack_credit()` RPC that atomically finds and
--       deducts a credit from the customer's oldest active pack using
--       SELECT ... FOR UPDATE SKIP LOCKED. This fixes the existing race
--       condition where two concurrent bookings can both read the same
--       pack and both succeed.
--
-- SCHEMA HARMONY:
--   - consultation_packs: additive columns + relaxed CHECK
--   - consultation_credit_requests: NEW table
--   - consume_pack_credit(): NEW function (SECURITY DEFINER)
--   - No columns dropped, no data mutated
-- ============================================================================


-- ============================================================================
-- STEP 1: Extend consultation_packs for admin grants
-- ============================================================================

-- Source tracking: where did this pack come from?
ALTER TABLE consultation_packs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'purchase'
    CHECK (source IN ('purchase', 'admin_grant', 'promo', 'refund', 'invite', 'invite_reward'));

-- Who granted it (NULL for self-purchase)
ALTER TABLE consultation_packs
  ADD COLUMN IF NOT EXISTS granted_by_admin_id UUID REFERENCES profiles(id);

-- Optional admin note
ALTER TABLE consultation_packs
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Relax pack_size: admin grants can be any positive int up to 100
ALTER TABLE consultation_packs DROP CONSTRAINT IF EXISTS consultation_packs_pack_size_check;
ALTER TABLE consultation_packs ADD CONSTRAINT consultation_packs_pack_size_check
  CHECK (pack_size > 0 AND pack_size <= 100);


-- ============================================================================
-- STEP 2: Create consultation_credit_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultation_credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0 AND requested_quantity <= 50),
  preferred_contact TEXT CHECK (preferred_contact IN ('phone', 'email', 'whatsapp')),
  contact_phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'contacted', 'fulfilled', 'cancelled'
  )),
  fulfilled_pack_id UUID REFERENCES consultation_packs(id),
  fulfilled_by_admin_id UUID REFERENCES profiles(id),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE consultation_credit_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_credit_requests_updated_at
  BEFORE UPDATE ON consultation_credit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- At most 1 pending request per customer at a time (prevents spam)
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_pending_request_per_customer
  ON consultation_credit_requests(customer_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_credit_requests_customer
  ON consultation_credit_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_credit_requests_status
  ON consultation_credit_requests(status);

-- Fulfilled requests MUST have a linked pack
ALTER TABLE consultation_credit_requests ADD CONSTRAINT fulfilled_requires_pack
  CHECK (status != 'fulfilled' OR fulfilled_pack_id IS NOT NULL);


-- ============================================================================
-- STEP 3: RLS for consultation_credit_requests
-- ============================================================================

-- Customers can insert their own requests
CREATE POLICY "Customers can insert own credit requests"
  ON consultation_credit_requests FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can read their own requests
CREATE POLICY "Customers can read own credit requests"
  ON consultation_credit_requests FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Admins can manage all credit requests"
  ON consultation_credit_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================================
-- STEP 4: consume_pack_credit() — atomic credit deduction RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION consume_pack_credit(
  p_customer_id UUID,
  p_consultation_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack_id UUID;
  v_used_count INTEGER;
  v_total INTEGER;
BEGIN
  -- Atomically pick the oldest active pack with remaining credits.
  -- FOR UPDATE SKIP LOCKED prevents two concurrent calls from picking
  -- the same row: the second caller will see the next available pack
  -- (or NULL if none remain).
  SELECT id, used_count, total_consultations
    INTO v_pack_id, v_used_count, v_total
    FROM consultation_packs
    WHERE customer_id = p_customer_id
      AND status = 'active'
      AND (total_consultations - used_count) > 0
    ORDER BY purchased_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF v_pack_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Increment used_count; auto-exhaust if all credits consumed.
  UPDATE consultation_packs
    SET used_count = v_used_count + 1,
        status = CASE
          WHEN v_used_count + 1 >= v_total THEN 'exhausted'
          ELSE status
        END
    WHERE id = v_pack_id;

  -- Record which consultation used this credit.
  -- The UNIQUE constraint on consultation_id prevents double-use.
  INSERT INTO consultation_pack_uses (pack_id, consultation_id)
    VALUES (v_pack_id, p_consultation_id);

  RETURN v_pack_id;
END;
$$;

COMMENT ON FUNCTION consume_pack_credit IS
  'Atomically finds the oldest active pack with credits and deducts one. Returns the pack_id on success, NULL if no credits available. Uses FOR UPDATE SKIP LOCKED for concurrency safety.';


-- ============================================================================
-- STEP 5: Documentation
-- ============================================================================

COMMENT ON TABLE consultation_credit_requests IS
  'Customer requests for more consultation credits (offline purchase flow during soft launch). Max 1 pending request per customer.';

COMMENT ON COLUMN consultation_packs.source IS
  'Origin of the pack: purchase (customer bought), admin_grant (admin assigned), promo (promotional), refund (credit-back), invite (from invite code), invite_reward (from referral reward).';

COMMENT ON COLUMN consultation_packs.granted_by_admin_id IS
  'UUID of the admin who granted the pack. NULL for self-purchases.';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
