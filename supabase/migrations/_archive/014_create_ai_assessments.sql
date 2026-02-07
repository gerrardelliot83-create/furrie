-- Migration: Create ai_quality_assessments table

CREATE TABLE ai_quality_assessments (
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

-- Enable Row Level Security
ALTER TABLE ai_quality_assessments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_ai_assessments_consultation_id ON ai_quality_assessments(consultation_id);
CREATE INDEX idx_ai_assessments_vet_id ON ai_quality_assessments(vet_id);
CREATE INDEX idx_ai_assessments_overall_score ON ai_quality_assessments(overall_score DESC);

-- Function to update vet ai quality score
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

-- Trigger to update AI quality score
CREATE TRIGGER update_vet_ai_score_on_new_assessment
  AFTER INSERT ON ai_quality_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_vet_ai_quality_score();
