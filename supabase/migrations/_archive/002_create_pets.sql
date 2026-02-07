-- Migration: Create pets table

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed TEXT NOT NULL,
  date_of_birth DATE,
  approximate_age_months INTEGER,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  weight_kg NUMERIC(5,2),
  is_neutered BOOLEAN DEFAULT false,
  color_markings TEXT,
  microchip_number TEXT,
  known_allergies TEXT[] DEFAULT '{}',
  existing_conditions TEXT[] DEFAULT '{}',
  current_medications JSONB DEFAULT '[]',
  diet_type TEXT,
  diet_details TEXT,
  vaccination_history JSONB DEFAULT '[]',
  photo_urls TEXT[] DEFAULT '{}',
  medical_docs_urls TEXT[] DEFAULT '{}',
  primary_vet_contact TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_pets_species ON pets(species);
CREATE INDEX idx_pets_created_at ON pets(created_at DESC);
