-- ============================================================================
-- FURRIE DATABASE MIGRATION - Customer Access to Vet Profiles
-- Version: 1.0
-- Date: 2026-02-11
--
-- ISSUE: Customer portal consultation detail page returns 404 because
--        customers cannot read the vet's profile (name, avatar) via RLS.
--
-- SOLUTION: Add RLS policy allowing customers to read the profile of vets
--           assigned to their consultations.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add RLS Policy for Customer -> Vet Profile Access
-- ============================================================================

-- Allow customers to read the basic profile info of vets assigned to their consultations.
-- This mirrors the existing "Vets can read customer profiles for consultations" policy.
--
-- Without this policy, the customer portal's consultation detail query fails
-- when trying to join profiles via the vet_id foreign key, causing a 404.
CREATE POLICY "Customers can read vet profiles for consultations"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.vet_id = profiles.id AND c.customer_id = auth.uid()
    )
  );

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- This policy allows customers to read the profile row of a vet (id, full_name,
-- avatar_url, etc.) ONLY when:
--   1. The vet is assigned to one of the customer's consultations (c.vet_id = profiles.id)
--   2. The customer is the authenticated user (c.customer_id = auth.uid())
--
-- This is the mirror of the existing policy from 000_complete_schema.sql:
--   "Vets can read customer profiles for consultations"
-- Which allows vets to see customer details for their assigned consultations.
--
-- SECURITY NOTE: This only exposes vet profiles to customers who already have
-- a legitimate consultation relationship with that vet. No arbitrary profile
-- access is granted.
-- ============================================================================

-- ============================================================================
-- AFFECTED QUERIES
-- ============================================================================
-- Customer Portal - src/app/customer-portal/consultations/[id]/page.tsx:
--
--   .select(`
--     *,
--     profiles!consultations_vet_id_fkey (  <-- This join was blocked
--       id, full_name, avatar_url
--     ),
--     vet_profiles!consultations_vet_id_fkey (
--       qualifications, years_of_experience
--     ),
--     ...
--   `)
--
-- After this migration, the profiles join will succeed for customers viewing
-- their own consultations.
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE - NO EXISTING DATA MODIFIED
-- ============================================================================
