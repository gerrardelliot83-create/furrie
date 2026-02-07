-- Migration: Create vaccination_schedules table

CREATE TABLE vaccination_schedules (
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

-- Enable Row Level Security
ALTER TABLE vaccination_schedules ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_vaccination_schedules_pet_id ON vaccination_schedules(pet_id);
CREATE INDEX idx_vaccination_schedules_due_date ON vaccination_schedules(due_date);
CREATE INDEX idx_vaccination_schedules_is_completed ON vaccination_schedules(is_completed);
CREATE INDEX idx_vaccination_schedules_reminder_sent ON vaccination_schedules(reminder_sent);
