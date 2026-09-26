-- ============================================================================
-- L1 founding-member cut-over, FILE 1 of 2 (prepare) — run ONLY on the day furrie.in switches to open
-- sign-up, after the CTO's go. Needs 20260925100100_l1_founding_members.sql.
--
-- The furrie.in waitlist lives in a DIFFERENT Supabase project, so it comes
-- in as a CSV file. Three steps, in this order, in the Supabase SQL Editor of
-- THIS project (nfwpunllsrjlgcezjojv):
--
--   STEP 1  Run l1_founding_cutover_1_prepare.sql. It creates an empty holding table.
--   STEP 2  Table Editor → founding_import → "Insert" → "Import data from CSV"
--           → choose the waitlist export (columns: email, created_at) → Import.
--           (How to export it from the marketing project is in Agent W's
--           plan.)
--   STEP 3  Run l1_founding_cutover_2_apply.sql. It copies the emails into founding_members,
--           gives every EXISTING customer on the list their 1 free credit
--           (60 days), and removes the holding table.
--
-- New sign-ups after this get their credit automatically on their first
-- dashboard visit (l1_claim_founding_credit). Running file 2 again stops with a message and changes nothing.
-- ============================================================================


CREATE TABLE IF NOT EXISTS public.founding_import (
  email text,
  created_at text
);
ALTER TABLE public.founding_import ENABLE ROW LEVEL SECURITY;
-- Verification: SELECT count(*) FROM public.founding_import;  -- expect 0 before the import


