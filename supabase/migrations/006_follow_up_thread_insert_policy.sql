-- Migration: Add INSERT policies for follow_up_threads table
-- This allows vets and customers to create follow-up threads for their consultations

-- Add INSERT policy for vets to create follow-up threads
-- WITH CHECK ensures vet can only insert rows where they are the vet_id
CREATE POLICY "Vets can create follow-up threads"
  ON follow_up_threads FOR INSERT
  WITH CHECK (vet_id = auth.uid());

-- Also allow customers to create threads (for potential on-demand creation)
CREATE POLICY "Customers can create follow-up threads"
  ON follow_up_threads FOR INSERT
  WITH CHECK (customer_id = auth.uid());
