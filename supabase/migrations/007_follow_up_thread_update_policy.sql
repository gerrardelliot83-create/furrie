-- Migration: Add UPDATE policies for follow_up_threads table
-- This allows vets and customers to update their own threads (e.g., extend expiry, deactivate)

-- Allow vets to update their own threads
CREATE POLICY "Vets can update own follow-up threads"
  ON follow_up_threads FOR UPDATE
  USING (vet_id = auth.uid())
  WITH CHECK (vet_id = auth.uid());

-- Allow customers to update threads they're part of (limited use case)
-- This could be useful for marking threads as read, etc.
CREATE POLICY "Customers can update own follow-up threads"
  ON follow_up_threads FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());
