-- Migration: Create pricing_config table for algorithmic pricing

CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  base_rate NUMERIC(10,2) NOT NULL, -- Base monthly rate in INR
  species_multipliers JSONB NOT NULL DEFAULT '{}', -- { "dog": 1.0, "cat": 0.85 }
  breed_risk_multipliers JSONB NOT NULL DEFAULT '{}', -- { "labrador": 1.1, "persian": 1.2 }
  age_multipliers JSONB NOT NULL DEFAULT '[]', -- [{ "min": 0, "max": 2, "multiplier": 0.9 }, ...]
  floor_price NUMERIC(10,2) NOT NULL, -- Minimum price
  ceiling_price NUMERIC(10,2) NOT NULL, -- Maximum price
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies
-- Anyone can read active pricing config
CREATE POLICY "Anyone can read active pricing config"
  ON pricing_config FOR SELECT
  USING (is_active = true);

-- Admins can manage pricing config
CREATE POLICY "Admins can manage pricing config"
  ON pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_pricing_config_is_active ON pricing_config(is_active);
CREATE INDEX idx_pricing_config_effective ON pricing_config(effective_from, effective_until);

-- Ensure only one active config at a time
CREATE UNIQUE INDEX idx_pricing_config_single_active
  ON pricing_config(is_active)
  WHERE is_active = true;

-- Insert default pricing configuration
INSERT INTO pricing_config (
  name,
  is_active,
  base_rate,
  species_multipliers,
  breed_risk_multipliers,
  age_multipliers,
  floor_price,
  ceiling_price
) VALUES (
  'Default Pricing',
  true,
  499.00,
  '{"dog": 1.0, "cat": 0.85}',
  '{"labrador": 1.0, "golden_retriever": 1.05, "german_shepherd": 1.1, "pug": 1.2, "bulldog": 1.25, "persian": 1.15, "siamese": 1.0, "maine_coon": 1.1, "british_shorthair": 1.05}',
  '[{"min": 0, "max": 1, "multiplier": 1.1}, {"min": 1, "max": 3, "multiplier": 0.9}, {"min": 3, "max": 7, "multiplier": 1.0}, {"min": 7, "max": 10, "multiplier": 1.15}, {"min": 10, "max": 100, "multiplier": 1.3}]',
  299.00,
  1499.00
);

-- Comments explaining the structure
COMMENT ON COLUMN pricing_config.species_multipliers IS
  'Format: { "dog": 1.0, "cat": 0.85 }';

COMMENT ON COLUMN pricing_config.breed_risk_multipliers IS
  'Format: { "labrador": 1.0, "persian": 1.15, ... } - Based on breed health risk factors';

COMMENT ON COLUMN pricing_config.age_multipliers IS
  'Format: [{ "min": 0, "max": 2, "multiplier": 1.1 }, ...] - Age in years, with associated multiplier';
