-- Migration: Create soap_notes table
-- SOAP: Subjective, Objective, Assessment, Plan

CREATE TABLE soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id),

  -- Subjective
  chief_complaint TEXT,
  history_present_illness TEXT,
  behavior_changes TEXT,
  appetite_changes TEXT,
  activity_level_changes TEXT,
  diet_info TEXT,
  previous_treatments TEXT,
  environmental_factors TEXT,
  other_pets_household TEXT,

  -- Objective
  general_appearance TEXT,
  body_condition_score TEXT,
  visible_physical_findings TEXT,
  respiratory_pattern TEXT,
  gait_mobility TEXT,
  vital_signs JSONB,
  referenced_media_urls TEXT[] DEFAULT '{}',

  -- Assessment
  provisional_diagnosis TEXT,
  differential_diagnoses TEXT[] DEFAULT '{}',
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  teleconsultation_limitations TEXT,

  -- Plan
  medications JSONB DEFAULT '[]',
  dietary_recommendations TEXT,
  lifestyle_modifications TEXT,
  home_care_instructions TEXT,
  warning_signs TEXT,
  follow_up_timeframe TEXT,
  in_person_visit_recommended BOOLEAN DEFAULT false,
  in_person_urgency TEXT CHECK (in_person_urgency IN ('low', 'medium', 'high', 'emergency')),
  referral_specialist TEXT,
  additional_diagnostics TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_soap_notes_updated_at
  BEFORE UPDATE ON soap_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_soap_notes_consultation_id ON soap_notes(consultation_id);
CREATE INDEX idx_soap_notes_vet_id ON soap_notes(vet_id);
CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at DESC);

-- Comment on medications structure
COMMENT ON COLUMN soap_notes.medications IS
  'Format: [{ "name": "...", "dosage": "...", "route": "...", "frequency": "...", "duration": "...", "instructions": "..." }]';
