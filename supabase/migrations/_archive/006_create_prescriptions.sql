-- Migration: Create prescriptions table

-- Function to generate prescription number
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(prescription_number FROM 17 FOR 3) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM prescriptions
  WHERE prescription_number LIKE 'FUR-RX-' || date_part || '-%';

  new_number := 'FUR-RX-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number TEXT UNIQUE NOT NULL DEFAULT generate_prescription_number(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  soap_note_id UUID NOT NULL REFERENCES soap_notes(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  pdf_url TEXT,
  medications JSONB NOT NULL DEFAULT '[]',
  dietary_recommendations TEXT,
  lifestyle_recommendations TEXT,
  warning_signs TEXT,
  follow_up_recommendation TEXT,
  in_person_advisory TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX idx_prescriptions_vet_id ON prescriptions(vet_id);
CREATE INDEX idx_prescriptions_customer_id ON prescriptions(customer_id);
CREATE INDEX idx_prescriptions_pet_id ON prescriptions(pet_id);
CREATE INDEX idx_prescriptions_created_at ON prescriptions(created_at DESC);
