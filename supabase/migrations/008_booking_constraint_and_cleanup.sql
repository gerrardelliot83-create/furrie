-- Migration 008: Booking constraint, prescribing patterns, treatment records, medication submissions
-- Sprint 3: Multi-vet matching hardening + SOAP intelligence + AI/ML data capture

-- =============================================================================
-- PART 1: Clean up stale indexes and add unique booking constraint
-- =============================================================================

-- Drop stale index from migration 002 (references dead 'in_progress' status)
DROP INDEX IF EXISTS idx_consultations_slots_booked;

-- Drop existing non-unique index from migration 004 (will be replaced with unique)
DROP INDEX IF EXISTS idx_consultations_booking_conflicts;

-- Create UNIQUE partial index to prevent double-booking at database level
CREATE UNIQUE INDEX idx_consultations_no_double_booking
  ON consultations (vet_id, scheduled_at)
  WHERE status IN ('pending', 'scheduled', 'active');

-- =============================================================================
-- PART 2: Vet prescribing patterns (species-aware autocomplete)
-- =============================================================================

CREATE TABLE vet_prescribing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_species TEXT NOT NULL CHECK (pet_species IN ('dog', 'cat')),
  diagnosis TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  route TEXT,
  frequency TEXT,
  duration TEXT,
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Species-aware unique key: same vet prescribing same med for same diagnosis in different species = 2 rows
CREATE UNIQUE INDEX idx_vet_prescribing_unique
  ON vet_prescribing_patterns (vet_id, pet_species, diagnosis, medication_name);

CREATE INDEX idx_vet_prescribing_vet ON vet_prescribing_patterns (vet_id);
CREATE INDEX idx_vet_prescribing_species ON vet_prescribing_patterns (vet_id, pet_species);
CREATE INDEX idx_vet_prescribing_diagnosis ON vet_prescribing_patterns (vet_id, pet_species, diagnosis);
CREATE INDEX idx_vet_prescribing_usage ON vet_prescribing_patterns (vet_id, use_count DESC);

ALTER TABLE vet_prescribing_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vets can read own prescribing patterns"
  ON vet_prescribing_patterns FOR SELECT USING (vet_id = auth.uid());
CREATE POLICY "Vets can insert own prescribing patterns"
  ON vet_prescribing_patterns FOR INSERT WITH CHECK (vet_id = auth.uid());
CREATE POLICY "Vets can update own prescribing patterns"
  ON vet_prescribing_patterns FOR UPDATE USING (vet_id = auth.uid());
CREATE POLICY "Admins can manage all prescribing patterns"
  ON vet_prescribing_patterns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- PART 3: Consultation treatment records (AI/ML training data - fully denormalized)
-- =============================================================================

CREATE TABLE consultation_treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References (for joins when needed)
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),

  -- Pet context (SNAPSHOT at time of consultation - not live data)
  pet_species TEXT NOT NULL,
  pet_breed TEXT,
  pet_weight_kg NUMERIC(5,2),
  pet_age_months INTEGER,
  pet_gender TEXT,
  pet_is_neutered BOOLEAN,
  pet_known_allergies TEXT[],
  pet_existing_conditions TEXT[],

  -- Presenting complaint context
  chief_complaint TEXT,
  symptom_categories TEXT[],

  -- Diagnosis
  provisional_diagnosis TEXT NOT NULL,
  differential_diagnoses TEXT[],
  diagnosis_category TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  is_diagnosis_from_list BOOLEAN DEFAULT false,

  -- Prescribed treatment (one medication per row)
  medication_name TEXT NOT NULL,
  medication_category TEXT,
  dosage TEXT,
  route TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  is_medication_from_list BOOLEAN DEFAULT false,

  -- Clinical measurements at time of consultation
  vital_signs JSONB,
  body_condition_score TEXT,

  -- Outcome context
  consultation_outcome TEXT CHECK (consultation_outcome IN ('success', 'missed', 'cancelled', 'failed')),
  follow_up_required BOOLEAN,
  in_person_visit_recommended BOOLEAN,
  in_person_urgency TEXT CHECK (in_person_urgency IN ('low', 'medium', 'high', 'emergency')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes optimized for ML query patterns
CREATE INDEX idx_treatment_records_species ON consultation_treatment_records (pet_species);
CREATE INDEX idx_treatment_records_species_breed ON consultation_treatment_records (pet_species, pet_breed);
CREATE INDEX idx_treatment_records_species_diagnosis ON consultation_treatment_records (pet_species, provisional_diagnosis);
CREATE INDEX idx_treatment_records_diagnosis ON consultation_treatment_records (provisional_diagnosis);
CREATE INDEX idx_treatment_records_medication ON consultation_treatment_records (medication_name);
CREATE INDEX idx_treatment_records_vet ON consultation_treatment_records (vet_id);
CREATE INDEX idx_treatment_records_consultation ON consultation_treatment_records (consultation_id);
CREATE INDEX idx_treatment_records_breed_diagnosis ON consultation_treatment_records (pet_breed, provisional_diagnosis);
CREATE INDEX idx_treatment_records_age_range ON consultation_treatment_records (pet_species, pet_age_months);

ALTER TABLE consultation_treatment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vets can read own treatment records"
  ON consultation_treatment_records FOR SELECT USING (vet_id = auth.uid());
CREATE POLICY "Admins can manage all treatment records"
  ON consultation_treatment_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
-- INSERT via service role (admin client) only - no direct vet insert

-- =============================================================================
-- PART 4: Medication submissions (Admin curation queue)
-- =============================================================================

CREATE TABLE medication_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('medication', 'diagnosis')),
  name TEXT NOT NULL,
  category TEXT,
  species TEXT CHECK (species IS NULL OR species IN ('dog', 'cat', 'both')),
  additional_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medication_submissions_status ON medication_submissions (status);
CREATE INDEX idx_medication_submissions_type ON medication_submissions (type, status);

ALTER TABLE medication_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vets can read own submissions"
  ON medication_submissions FOR SELECT USING (submitted_by = auth.uid());
CREATE POLICY "Vets can create submissions"
  ON medication_submissions FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Admins can manage all submissions"
  ON medication_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
