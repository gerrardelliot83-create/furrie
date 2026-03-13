-- ============================================================================
-- FURRIE DATABASE MIGRATION - Consultation Packs
-- Version: 12.0
-- Date: 2026-03-13
--
-- PURPOSE: Add consultation packs system allowing customers to purchase
-- bundles of consultations at discounted rates (3, 5, or 10 packs).
--
-- PRICING:
--   Single consultation: 299 INR
--   Pack of 3:  299 x 3 = 897  - 10% discount = 807 INR
--   Pack of 5:  299 x 5 = 1495 - 25% discount = 1121 INR (rounded)
--   Pack of 10: 299 x 10 = 2990 - 50% discount = 1495 INR
--
-- SCHEMA HARMONY:
--   - consultation_packs is a NEW table (no conflict with existing tables)
--   - consultation_pack_uses is a NEW table (no conflict)
--   - payments table referenced via FK (payment_id) - no schema change to payments
--   - consultations table referenced via FK in pack_uses - no schema change
--   - profiles table referenced via FK (customer_id) - no schema change
--   - Packs are SEPARATE from subscriptions (different payment model)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create consultation_packs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultation_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_size INTEGER NOT NULL CHECK (pack_size IN (3, 5, 10)),
  total_consultations INTEGER NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  remaining_count INTEGER GENERATED ALWAYS AS (total_consultations - used_count) STORED,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 299.00,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'exhausted', 'expired', 'cancelled'
  )),
  payment_id UUID REFERENCES payments(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_packs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_consultation_packs_updated_at
  BEFORE UPDATE ON consultation_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Constraint: used_count cannot exceed total_consultations
ALTER TABLE consultation_packs ADD CONSTRAINT consultation_packs_used_not_exceeding_total
  CHECK (used_count <= total_consultations);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultation_packs_customer_id
  ON consultation_packs(customer_id);

CREATE INDEX IF NOT EXISTS idx_consultation_packs_status
  ON consultation_packs(status);

CREATE INDEX IF NOT EXISTS idx_consultation_packs_customer_active
  ON consultation_packs(customer_id, status, purchased_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_consultation_packs_expires_at
  ON consultation_packs(expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

-- ============================================================================
-- STEP 2: Create consultation_pack_uses table
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultation_pack_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES consultation_packs(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultation_pack_uses_pack_id
  ON consultation_pack_uses(pack_id);

CREATE INDEX IF NOT EXISTS idx_consultation_pack_uses_consultation_id
  ON consultation_pack_uses(consultation_id);

-- ============================================================================
-- STEP 3: Row Level Security Policies
-- ============================================================================

-- consultation_packs policies
CREATE POLICY "Customers can read own packs"
  ON consultation_packs FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all packs"
  ON consultation_packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- consultation_pack_uses policies
ALTER TABLE consultation_pack_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own pack uses"
  ON consultation_pack_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultation_packs cp
      WHERE cp.id = consultation_pack_uses.pack_id
        AND cp.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all pack uses"
  ON consultation_pack_uses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 4: Documentation comments
-- ============================================================================
COMMENT ON TABLE consultation_packs IS
  'Consultation credit packs purchased by customers. Pack sizes: 3 (10% off), 5 (25% off), 10 (50% off). Unit price: 299 INR.';

COMMENT ON COLUMN consultation_packs.remaining_count IS
  'Computed column: total_consultations - used_count. Always in sync.';

COMMENT ON COLUMN consultation_packs.status IS
  'Pack status: active (credits available), exhausted (all used), expired (past validity), cancelled (admin action)';

COMMENT ON TABLE consultation_pack_uses IS
  'Tracks which consultation used which pack credit. UNIQUE on consultation_id ensures one credit per consultation.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
