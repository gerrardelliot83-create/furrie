-- Migration: Create subscriptions, sachets, and sachet_codes tables

-- Sachets table (subscription/package definitions)
CREATE TABLE sachets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- invitation, A, B, C, D, E, F
  inclusions JSONB NOT NULL, -- { plan_type, free_consultations, ... }
  list_price NUMERIC(10,2),
  is_algorithmic_pricing BOOLEAN DEFAULT false,
  validity_days INTEGER NOT NULL,
  consultation_validity_days INTEGER,
  max_discount_percent NUMERIC(5,2) DEFAULT 0,
  min_bulk_purchase INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sachets
ALTER TABLE sachets ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_sachets_updated_at
  BEFORE UPDATE ON sachets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sachet codes table (bulk-generated redeemable codes)
CREATE TABLE sachet_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sachet_id UUID NOT NULL REFERENCES sachets(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ,
  partner_name TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sachet_codes
ALTER TABLE sachet_codes ENABLE ROW LEVEL SECURITY;

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'plus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'cancelled', 'payment_failed'
  )),
  price_computed NUMERIC(10,2),
  pricing_factors JSONB, -- { species, breed, age, base_rate, multipliers }
  sachet_id UUID REFERENCES sachets(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to payments table
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_subscription
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- Indexes
CREATE INDEX idx_sachets_code ON sachets(code);
CREATE INDEX idx_sachets_is_active ON sachets(is_active);

CREATE INDEX idx_sachet_codes_sachet_id ON sachet_codes(sachet_id);
CREATE INDEX idx_sachet_codes_code ON sachet_codes(code);
CREATE INDEX idx_sachet_codes_is_redeemed ON sachet_codes(is_redeemed);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_pet_id ON subscriptions(pet_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);
