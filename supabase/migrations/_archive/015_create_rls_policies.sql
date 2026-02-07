-- Migration: Create Row Level Security (RLS) policies for all tables

-- ============================================
-- PROFILES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PETS
-- ============================================
-- Owners can CRUD their own pets
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

-- Vets can read pets for their consultations
CREATE POLICY "Vets can read consultation pets"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.pet_id = pets.id
        AND c.vet_id = auth.uid()
    )
  );

-- Admins can read all pets
CREATE POLICY "Admins can read all pets"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- VET_PROFILES
-- ============================================
-- Vets can read and update their own vet profile
CREATE POLICY "Vets can read own vet profile"
  ON vet_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Vets can update own vet profile"
  ON vet_profiles FOR UPDATE
  USING (id = auth.uid());

-- Customers can read verified vet profiles
CREATE POLICY "Anyone can read verified vet profiles"
  ON vet_profiles FOR SELECT
  USING (is_verified = true);

-- Admins can CRUD all vet profiles
CREATE POLICY "Admins can manage vet profiles"
  ON vet_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- CONSULTATIONS
-- ============================================
-- Customers can read their own consultations
CREATE POLICY "Customers can read own consultations"
  ON consultations FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create consultations
CREATE POLICY "Customers can create consultations"
  ON consultations FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Vets can read assigned consultations
CREATE POLICY "Vets can read assigned consultations"
  ON consultations FOR SELECT
  USING (vet_id = auth.uid());

-- Vets can update assigned consultations
CREATE POLICY "Vets can update assigned consultations"
  ON consultations FOR UPDATE
  USING (vet_id = auth.uid());

-- Admins can manage all consultations
CREATE POLICY "Admins can manage consultations"
  ON consultations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SOAP_NOTES
-- ============================================
-- Vets can CRUD their own SOAP notes
CREATE POLICY "Vets can manage own SOAP notes"
  ON soap_notes FOR ALL
  USING (vet_id = auth.uid());

-- Customers can read SOAP notes for their consultations
CREATE POLICY "Customers can read own consultation SOAP notes"
  ON soap_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = soap_notes.consultation_id
        AND c.customer_id = auth.uid()
    )
  );

-- Admins can read all SOAP notes
CREATE POLICY "Admins can read all SOAP notes"
  ON soap_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PRESCRIPTIONS
-- ============================================
-- Same pattern as SOAP notes
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
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PAYMENTS
-- ============================================
-- Customers can read their own payments
CREATE POLICY "Customers can read own payments"
  ON payments FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can manage all payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE POLICY "Customers can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SACHETS
-- ============================================
-- Anyone can read active sachets
CREATE POLICY "Anyone can read active sachets"
  ON sachets FOR SELECT
  USING (is_active = true);

-- Admins can manage sachets
CREATE POLICY "Admins can manage sachets"
  ON sachets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SACHET_CODES
-- ============================================
-- Users can read and redeem unredeemed codes
CREATE POLICY "Users can read unredeemed codes"
  ON sachet_codes FOR SELECT
  USING (is_redeemed = false);

-- Admins can manage sachet codes
CREATE POLICY "Admins can manage sachet codes"
  ON sachet_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- NOTIFICATIONS
-- ============================================
-- Users can read and update their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- CONSULTATION_RATINGS
-- ============================================
CREATE POLICY "Customers can create ratings for own consultations"
  ON consultation_ratings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can read ratings"
  ON consultation_ratings FOR SELECT
  USING (true);

-- ============================================
-- CONSULTATION_FLAGS
-- ============================================
CREATE POLICY "Vets can create flags for assigned consultations"
  ON consultation_flags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_flags.consultation_id
        AND c.vet_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage flags"
  ON consultation_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- VACCINATION_SCHEDULES
-- ============================================
CREATE POLICY "Pet owners can read own pet vaccinations"
  ON vaccination_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pets p
      WHERE p.id = vaccination_schedules.pet_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Vets can manage vaccination schedules"
  ON vaccination_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'vet'
    )
  );

-- ============================================
-- FOLLOW_UP_THREADS & MESSAGES
-- ============================================
CREATE POLICY "Participants can read follow-up threads"
  ON follow_up_threads FOR SELECT
  USING (customer_id = auth.uid() OR vet_id = auth.uid());

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
      WHERE t.id = follow_up_messages.thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
        AND t.is_active = true
    )
  );

-- ============================================
-- INCIDENTS
-- ============================================
CREATE POLICY "Admins can manage incidents"
  ON incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- AI_QUALITY_ASSESSMENTS
-- ============================================
CREATE POLICY "Vets can read own AI assessments"
  ON ai_quality_assessments FOR SELECT
  USING (vet_id = auth.uid());

CREATE POLICY "Admins can manage AI assessments"
  ON ai_quality_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
