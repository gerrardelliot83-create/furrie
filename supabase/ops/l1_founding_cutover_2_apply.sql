-- ============================================================================
-- L1 founding-member cut-over, FILE 2 of 2 (apply) — run ONLY on the day furrie.in switches to open
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


DO $$
BEGIN
  IF to_regclass('public.founding_import') IS NULL THEN
    RAISE EXCEPTION 'founding_import does not exist: run PART 1 and import the CSV first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.founding_import) THEN
    RAISE EXCEPTION 'founding_import is empty: import the CSV (STEP 2) first';
  END IF;
END $$;

INSERT INTO public.founding_members (email, source, listed_at)
SELECT lower(btrim(i.email)),
       'waitlist',
       min(CASE WHEN btrim(coalesce(i.created_at, '')) ~ '^\d{4}-\d{2}-\d{2}'
                THEN btrim(i.created_at)::timestamptz END)
FROM public.founding_import i
WHERE i.email IS NOT NULL
  AND btrim(i.email) LIKE '%_@_%'
GROUP BY lower(btrim(i.email))
ON CONFLICT (email) DO NOTHING;

-- Existing customers on the list get their credit now.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    JOIN public.founding_members f ON f.email = lower(btrim(p.email))
    WHERE p.role = 'customer' AND f.granted_at IS NULL
  LOOP
    PERFORM public.l1_claim_founding_credit(r.id);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.founding_import;

-- ============================================================================
-- Verification (the CTO checks these through the read-only connection):
--
-- SELECT count(*) FROM public.founding_members;
--   -- expect = number of distinct emails in the CSV
-- SELECT count(*) FROM public.founding_members WHERE granted_at IS NOT NULL;
--   -- expect = number of those emails that already had a customer account
-- SELECT count(*) FROM public.consultation_packs WHERE admin_note = 'founding_member';
--   -- expect = the previous number (one pack per granted email)
-- SELECT to_regclass('public.founding_import');
--   -- expect NULL
-- ============================================================================
