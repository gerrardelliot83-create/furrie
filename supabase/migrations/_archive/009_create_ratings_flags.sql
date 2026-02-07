-- Migration: Create consultation_ratings and consultation_flags tables

-- Consultation ratings
CREATE TABLE consultation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vet_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consultation_ratings ENABLE ROW LEVEL SECURITY;

-- Consultation flags (for vet flagging issues)
CREATE TABLE consultation_flags (
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

-- Enable RLS
ALTER TABLE consultation_flags ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_consultation_ratings_consultation_id ON consultation_ratings(consultation_id);
CREATE INDEX idx_consultation_ratings_vet_id ON consultation_ratings(vet_id);
CREATE INDEX idx_consultation_ratings_rating ON consultation_ratings(rating);

CREATE INDEX idx_consultation_flags_consultation_id ON consultation_flags(consultation_id);
CREATE INDEX idx_consultation_flags_flagged_by ON consultation_flags(flagged_by);
CREATE INDEX idx_consultation_flags_admin_status ON consultation_flags(admin_status);

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

-- Trigger to update average rating on new rating
CREATE TRIGGER update_vet_rating_on_new_rating
  AFTER INSERT ON consultation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_average_rating();
