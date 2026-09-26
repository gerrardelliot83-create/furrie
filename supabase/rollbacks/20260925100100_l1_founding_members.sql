-- ============================================================================
-- ROLLBACK for 20260925100100_l1_founding_members.sql (L1, 2026-09-25)
--
-- BEFORE the founding-member cut-over: safe, the table is empty.
-- AFTER the cut-over: do NOT drop the table — it is the record of who was
-- promised and granted a founding credit. Drop only the function in that case
-- (comment out the DROP TABLE line).
-- ============================================================================
DROP FUNCTION IF EXISTS public.l1_claim_founding_credit(uuid);

DO $$
BEGIN
  IF to_regclass('public.founding_members') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.founding_members) THEN
      RAISE EXCEPTION 'founding_members is not empty (cut-over has happened); not dropping it';
    END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS public.founding_members;

-- Verification:
-- SELECT to_regclass('public.founding_members');  -- expect NULL
