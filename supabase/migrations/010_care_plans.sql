-- Migration 010: Care Plans for Pets
-- Vets create step-by-step care plans, pet parents follow as checklist

-- ============================================================
-- Table: care_plans
-- ============================================================
CREATE TABLE care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vet_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('preventive', 'treatment', 'nutrition', 'vaccination', 'medication', 'supplement', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Table: care_plan_steps
-- ============================================================
CREATE TABLE care_plan_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  step_type TEXT NOT NULL CHECK (step_type IN ('medication', 'supplement', 'test', 'vaccination', 'nutrition', 'exercise', 'video_check_in', 'custom')),
  step_order INTEGER NOT NULL,
  due_date DATE,
  requires_response BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: care_plan_step_responses
-- ============================================================
CREATE TABLE care_plan_step_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES care_plan_steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  response_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_care_plans_pet ON care_plans(pet_id);
CREATE INDEX idx_care_plans_vet ON care_plans(vet_id);
CREATE INDEX idx_care_plans_customer ON care_plans(customer_id);
CREATE INDEX idx_care_plans_status ON care_plans(status);
CREATE INDEX idx_care_plan_steps_plan ON care_plan_steps(care_plan_id);
CREATE INDEX idx_care_plan_steps_order ON care_plan_steps(care_plan_id, step_order);
CREATE INDEX idx_care_plan_responses_step ON care_plan_step_responses(step_id);

-- ============================================================
-- updated_at trigger for care_plans
-- ============================================================
CREATE OR REPLACE FUNCTION update_care_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER care_plans_updated_at
  BEFORE UPDATE ON care_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_care_plans_updated_at();

-- ============================================================
-- RLS: Enable
-- ============================================================
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_step_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: care_plans
-- ============================================================

-- Vets can create plans for pets they've consulted
CREATE POLICY "vets_create_plans" ON care_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    vet_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM consultations
      WHERE vet_id = auth.uid() AND pet_id = care_plans.pet_id
    )
  );

-- Vets can update their own plans
CREATE POLICY "vets_update_plans" ON care_plans
  FOR UPDATE TO authenticated
  USING (vet_id = auth.uid());

-- Participants (vet + customer) can view plans
CREATE POLICY "participants_view_plans" ON care_plans
  FOR SELECT TO authenticated
  USING (vet_id = auth.uid() OR customer_id = auth.uid());

-- Admins can manage all
CREATE POLICY "admins_manage_plans" ON care_plans
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS: care_plan_steps
-- ============================================================

-- Vets can manage steps on their plans
CREATE POLICY "vets_manage_steps" ON care_plan_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM care_plans WHERE id = care_plan_steps.care_plan_id AND vet_id = auth.uid())
  );

-- Customers can view steps on their plans
CREATE POLICY "customers_view_steps" ON care_plan_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM care_plans WHERE id = care_plan_steps.care_plan_id AND customer_id = auth.uid())
  );

-- Customers can update step status (mark complete)
CREATE POLICY "customers_complete_steps" ON care_plan_steps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM care_plans WHERE id = care_plan_steps.care_plan_id AND customer_id = auth.uid())
  );

-- Admins manage all steps
CREATE POLICY "admins_manage_steps" ON care_plan_steps
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RLS: care_plan_step_responses
-- ============================================================

-- Participants can create responses
CREATE POLICY "participants_create_responses" ON care_plan_step_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM care_plan_steps s
      JOIN care_plans p ON s.care_plan_id = p.id
      WHERE s.id = care_plan_step_responses.step_id
        AND (p.vet_id = auth.uid() OR p.customer_id = auth.uid())
    )
  );

-- Participants can view responses
CREATE POLICY "participants_view_responses" ON care_plan_step_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plan_steps s
      JOIN care_plans p ON s.care_plan_id = p.id
      WHERE s.id = care_plan_step_responses.step_id
        AND (p.vet_id = auth.uid() OR p.customer_id = auth.uid())
    )
  );

-- Admins manage all responses
CREATE POLICY "admins_manage_responses" ON care_plan_step_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
