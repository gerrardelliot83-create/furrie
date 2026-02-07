-- Migration: Create consultations table

-- Function to generate consultation number
CREATE OR REPLACE FUNCTION generate_consultation_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(consultation_number FROM 14 FOR 3) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM consultations
  WHERE consultation_number LIKE 'FUR-' || date_part || '-%';

  new_number := 'FUR-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_number TEXT UNIQUE NOT NULL DEFAULT generate_consultation_number(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vet_id UUID REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  type TEXT NOT NULL CHECK (type IN ('direct_connect', 'scheduled', 'follow_up')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'matching', 'matched', 'in_progress', 'completed',
    'missed', 'cancelled', 'no_vet_available'
  )),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  was_extended BOOLEAN DEFAULT false,
  concern_text TEXT,
  symptom_categories TEXT[] DEFAULT '{}',
  is_follow_up BOOLEAN DEFAULT false,
  parent_consultation_id UUID REFERENCES consultations(id),
  follow_up_expires_at TIMESTAMPTZ,
  daily_room_name TEXT,
  daily_room_url TEXT,
  recording_id TEXT,
  recording_url TEXT,
  payment_id UUID,
  amount_paid NUMERIC(10,2),
  is_priority BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_consultations_customer_id ON consultations(customer_id);
CREATE INDEX idx_consultations_vet_id ON consultations(vet_id);
CREATE INDEX idx_consultations_pet_id ON consultations(pet_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_type ON consultations(type);
CREATE INDEX idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX idx_consultations_parent ON consultations(parent_consultation_id);
