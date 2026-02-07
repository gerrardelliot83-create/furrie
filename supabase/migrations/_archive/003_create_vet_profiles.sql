-- Migration: Create vet_profiles table
-- Additional vet-specific data extending profiles

CREATE TABLE vet_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  qualifications TEXT NOT NULL,
  vci_registration_number TEXT NOT NULL,
  state_council_registration TEXT,
  specializations TEXT[] DEFAULT '{}',
  years_of_experience INTEGER,
  degree_certificate_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT false,
  availability_schedule JSONB DEFAULT '{}',
  consultation_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  ai_quality_score NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vet_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_vet_profiles_updated_at
  BEFORE UPDATE ON vet_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_vet_profiles_is_available ON vet_profiles(is_available);
CREATE INDEX idx_vet_profiles_is_verified ON vet_profiles(is_verified);
CREATE INDEX idx_vet_profiles_average_rating ON vet_profiles(average_rating DESC);

-- Comment on availability_schedule structure
COMMENT ON COLUMN vet_profiles.availability_schedule IS
  'Format: { "monday": [{"start": "10:00", "end": "16:00"}], "tuesday": [...] }';
