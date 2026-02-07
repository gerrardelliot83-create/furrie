-- ============================================================================
-- FURRIE DATABASE SCHEMA - Complete Migration
-- Version: 1.0
-- Run this file in Supabase SQL Editor to set up the complete database
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PART 2: UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'vet', 'admin')) DEFAULT 'customer',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- ----------------------------------------------------------------------------
-- PETS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pets (
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

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_name_trgm ON pets USING gin(name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- VET_PROFILES (extends profiles for vets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vet_profiles (
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

ALTER TABLE vet_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_vet_profiles_updated_at
  BEFORE UPDATE ON vet_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vet_profiles_is_available ON vet_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_vet_profiles_is_verified ON vet_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_vet_profiles_average_rating ON vet_profiles(average_rating DESC);

COMMENT ON COLUMN vet_profiles.availability_schedule IS
  'Format: { "monday": [{"start": "10:00", "end": "16:00"}], "tuesday": [...] }';

-- ----------------------------------------------------------------------------
-- CONSULTATIONS
-- ----------------------------------------------------------------------------

-- Function to generate consultation number
CREATE OR REPLACE FUNCTION generate_consultation_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

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

CREATE TABLE IF NOT EXISTS consultations (
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

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_consultations_customer_id ON consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_vet_id ON consultations(vet_id);
CREATE INDEX IF NOT EXISTS idx_consultations_pet_id ON consultations(pet_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(type);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_parent ON consultations(parent_consultation_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_consultations_vet_active
  ON consultations(vet_id, status)
  WHERE status IN ('matching', 'matched', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_pending
  ON consultations(scheduled_at, status)
  WHERE type = 'scheduled' AND status = 'pending';

-- ----------------------------------------------------------------------------
-- SOAP_NOTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soap_notes (
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

ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_soap_notes_updated_at
  BEFORE UPDATE ON soap_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_soap_notes_consultation_id ON soap_notes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_vet_id ON soap_notes(vet_id);
CREATE INDEX IF NOT EXISTS idx_soap_notes_created_at ON soap_notes(created_at DESC);

COMMENT ON COLUMN soap_notes.medications IS
  'Format: [{ "name": "...", "dosage": "...", "route": "...", "frequency": "...", "duration": "...", "instructions": "..." }]';

-- ----------------------------------------------------------------------------
-- PRESCRIPTIONS
-- ----------------------------------------------------------------------------

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

CREATE TABLE IF NOT EXISTS prescriptions (
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

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_vet_id ON prescriptions(vet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet_id ON prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at DESC);

-- ----------------------------------------------------------------------------
-- SACHETS (subscription/package definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sachets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- invitation, A, B, C, D, E, F
  inclusions JSONB NOT NULL,
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

ALTER TABLE sachets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sachets_updated_at
  BEFORE UPDATE ON sachets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sachets_code ON sachets(code);
CREATE INDEX IF NOT EXISTS idx_sachets_is_active ON sachets(is_active);

-- ----------------------------------------------------------------------------
-- SACHET_CODES (bulk-generated redeemable codes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sachet_codes (
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

ALTER TABLE sachet_codes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sachet_codes_sachet_id ON sachet_codes(sachet_id);
CREATE INDEX IF NOT EXISTS idx_sachet_codes_code ON sachet_codes(code);
CREATE INDEX IF NOT EXISTS idx_sachet_codes_is_redeemed ON sachet_codes(is_redeemed);

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'plus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'cancelled', 'payment_failed'
  )),
  price_computed NUMERIC(10,2),
  pricing_factors JSONB,
  sachet_id UUID REFERENCES sachets(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pet_id ON subscriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_active
  ON subscriptions(customer_id, status)
  WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  consultation_id UUID REFERENCES consultations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  cashfree_order_id TEXT UNIQUE NOT NULL,
  cashfree_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded'
  )),
  payment_method TEXT,
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_consultation_id ON payments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_cashfree_order_id ON payments(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ----------------------------------------------------------------------------
-- CONSULTATION_RATINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vet_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_ratings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consultation_ratings_consultation_id ON consultation_ratings(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_vet_id ON consultation_ratings(vet_id);
CREATE INDEX IF NOT EXISTS idx_consultation_ratings_rating ON consultation_ratings(rating);

-- Function to update vet average rating
CREATE OR REPLACE FUNCTION update_vet_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vet_profiles
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM consultation_ratings
    WHERE vet_id = NEW.vet_id
  )
  WHERE id = NEW.vet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_rating_on_new_rating
  AFTER INSERT ON consultation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_average_rating();

-- ----------------------------------------------------------------------------
-- CONSULTATION_FLAGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'beyond_teleconsultation', 'unresponsive_user', 'emergency_in_person',
    'inappropriate_behavior', 'technical_issues', 'other'
  )),
  details TEXT,
  admin_status TEXT DEFAULT 'pending' CHECK (admin_status IN ('pending', 'investigating', 'resolved')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_flags ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consultation_flags_consultation_id ON consultation_flags(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_flags_flagged_by ON consultation_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_consultation_flags_admin_status ON consultation_flags(admin_status);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp')),
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_type
  ON notifications(user_id, type, created_at DESC)
  WHERE is_read = false;

-- ----------------------------------------------------------------------------
-- VACCINATION_SCHEDULES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vaccination_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vet_id UUID REFERENCES profiles(id),
  vaccine_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vaccination_schedules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_pet_id ON vaccination_schedules(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_due_date ON vaccination_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_is_completed ON vaccination_schedules(is_completed);
CREATE INDEX IF NOT EXISTS idx_vaccination_schedules_reminder_sent ON vaccination_schedules(reminder_sent);

-- ----------------------------------------------------------------------------
-- FOLLOW_UP_THREADS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vet_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE follow_up_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_follow_up_threads_consultation_id ON follow_up_threads(consultation_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_customer_id ON follow_up_threads(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_vet_id ON follow_up_threads(vet_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_is_active ON follow_up_threads(is_active);
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_expires_at ON follow_up_threads(expires_at);
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_customer_active
  ON follow_up_threads(customer_id, is_active, expires_at)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_follow_up_threads_vet_active
  ON follow_up_threads(vet_id, is_active)
  WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- FOLLOW_UP_MESSAGES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES follow_up_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE follow_up_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_follow_up_messages_thread_id ON follow_up_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_sender_id ON follow_up_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_created_at ON follow_up_messages(created_at DESC);

-- ----------------------------------------------------------------------------
-- INCIDENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  customer_id UUID REFERENCES profiles(id),
  reported_by UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_incidents_consultation_id ON incidents(consultation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_customer_id ON incidents(customer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- ----------------------------------------------------------------------------
-- AI_QUALITY_ASSESSMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id),
  overall_score NUMERIC(3,2),
  thoroughness_score NUMERIC(3,2),
  communication_score NUMERIC(3,2),
  empathy_score NUMERIC(3,2),
  diagnostic_reasoning_score NUMERIC(3,2),
  soap_completeness_score NUMERIC(3,2),
  detailed_feedback JSONB DEFAULT '{}',
  transcript_analyzed BOOLEAN DEFAULT false,
  soap_analyzed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_quality_assessments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_assessments_consultation_id ON ai_quality_assessments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_vet_id ON ai_quality_assessments(vet_id);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_overall_score ON ai_quality_assessments(overall_score DESC);

-- Function to update vet AI quality score
CREATE OR REPLACE FUNCTION update_vet_ai_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vet_profiles
  SET ai_quality_score = (
    SELECT COALESCE(AVG(overall_score), 0)
    FROM ai_quality_assessments
    WHERE vet_id = NEW.vet_id
  )
  WHERE id = NEW.vet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vet_ai_score_on_new_assessment
  AFTER INSERT ON ai_quality_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_ai_quality_score();

-- ----------------------------------------------------------------------------
-- PRICING_CONFIG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  base_rate NUMERIC(10,2) NOT NULL,
  species_multipliers JSONB NOT NULL DEFAULT '{}',
  breed_risk_multipliers JSONB NOT NULL DEFAULT '{}',
  age_multipliers JSONB NOT NULL DEFAULT '[]',
  floor_price NUMERIC(10,2) NOT NULL,
  ceiling_price NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pricing_config_is_active ON pricing_config(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_config_effective ON pricing_config(effective_from, effective_until);

-- Ensure only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_config_single_active
  ON pricing_config(is_active)
  WHERE is_active = true;

COMMENT ON COLUMN pricing_config.species_multipliers IS
  'Format: { "dog": 1.0, "cat": 0.85 }';

COMMENT ON COLUMN pricing_config.breed_risk_multipliers IS
  'Format: { "labrador": 1.0, "persian": 1.15, ... }';

COMMENT ON COLUMN pricing_config.age_multipliers IS
  'Format: [{ "min": 0, "max": 2, "multiplier": 1.1 }, ...]';

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Vets can read customer profiles for consultations"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.customer_id = profiles.id AND c.vet_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PETS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners can read own pets"
  ON pets FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own pets"
  ON pets FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own pets"
  ON pets FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own pets"
  ON pets FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Vets can read consultation pets"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.pet_id = pets.id AND c.vet_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all pets"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- VET_PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Vets can read own vet profile"
  ON vet_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Vets can update own vet profile"
  ON vet_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Anyone can read verified vet profiles"
  ON vet_profiles FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Admins can manage vet profiles"
  ON vet_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- CONSULTATIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Customers can read own consultations"
  ON consultations FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create consultations"
  ON consultations FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Vets can read assigned consultations"
  ON consultations FOR SELECT
  USING (vet_id = auth.uid());

CREATE POLICY "Vets can update assigned consultations"
  ON consultations FOR UPDATE
  USING (vet_id = auth.uid());

CREATE POLICY "Admins can manage consultations"
  ON consultations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- SOAP_NOTES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Vets can manage own SOAP notes"
  ON soap_notes FOR ALL
  USING (vet_id = auth.uid());

CREATE POLICY "Customers can read own consultation SOAP notes"
  ON soap_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = soap_notes.consultation_id AND c.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all SOAP notes"
  ON soap_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- PRESCRIPTIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Vets can manage own prescriptions"
  ON prescriptions FOR ALL
  USING (vet_id = auth.uid());

CREATE POLICY "Customers can read own prescriptions"
  ON prescriptions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can read all prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Customers can read own payments"
  ON payments FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Customers can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- SACHETS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can read active sachets"
  ON sachets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sachets"
  ON sachets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- SACHET_CODES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read unredeemed codes"
  ON sachet_codes FOR SELECT
  USING (is_redeemed = false);

CREATE POLICY "Admins can manage sachet codes"
  ON sachet_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CONSULTATION_RATINGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Customers can create ratings for own consultations"
  ON consultation_ratings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Anyone can read ratings"
  ON consultation_ratings FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- CONSULTATION_FLAGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Vets can create flags for assigned consultations"
  ON consultation_flags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.vet_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage flags"
  ON consultation_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- VACCINATION_SCHEDULES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Pet owners can read own pet vaccinations"
  ON vaccination_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pets p
      WHERE p.id = vaccination_schedules.pet_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vets can manage vaccination schedules"
  ON vaccination_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'vet'
    )
  );

CREATE POLICY "Admins can manage vaccination schedules"
  ON vaccination_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- FOLLOW_UP_THREADS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Participants can read follow-up threads"
  ON follow_up_threads FOR SELECT
  USING (customer_id = auth.uid() OR vet_id = auth.uid());

CREATE POLICY "Admins can manage follow-up threads"
  ON follow_up_threads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- FOLLOW_UP_MESSAGES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Participants can read follow-up messages"
  ON follow_up_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM follow_up_threads t
      WHERE t.id = follow_up_messages.thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send follow-up messages"
  ON follow_up_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM follow_up_threads t
      WHERE t.id = thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
        AND t.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- INCIDENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can manage incidents"
  ON incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- AI_QUALITY_ASSESSMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Vets can read own AI assessments"
  ON ai_quality_assessments FOR SELECT
  USING (vet_id = auth.uid());

CREATE POLICY "Admins can manage AI assessments"
  ON ai_quality_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- PRICING_CONFIG POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can read active pricing config"
  ON pricing_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing config"
  ON pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================================
-- PART 5: SEED DATA
-- ============================================================================

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
  '{"labrador": 1.0, "golden_retriever": 1.05, "german_shepherd": 1.1, "pug": 1.2, "bulldog": 1.25, "persian": 1.15, "siamese": 1.0, "maine_coon": 1.1, "british_shorthair": 1.05, "indie": 0.95, "mixed": 1.0}',
  '[{"min": 0, "max": 1, "multiplier": 1.1}, {"min": 1, "max": 3, "multiplier": 0.9}, {"min": 3, "max": 7, "multiplier": 1.0}, {"min": 7, "max": 10, "multiplier": 1.15}, {"min": 10, "max": 100, "multiplier": 1.3}]',
  299.00,
  1499.00
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
