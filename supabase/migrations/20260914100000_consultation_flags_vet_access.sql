-- ============================================================================
-- BRK-3: consultation_flags — vet read access and the withdraw path
-- Phase 0, 2026-09-14. Idempotent; safe to re-run.
--
-- Before: vets could INSERT a flag but had no SELECT policy, so the vet
-- consultation page (which selects consultation_flags) always saw none, and
-- the withdraw route had no UPDATE policy and no valid status to write
-- (admin_status only allowed pending/investigating/resolved).
--
-- After: vets read their own flags; a vet can move their own *pending* flag
-- to 'withdrawn' and nothing else. Admin policy is unchanged.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.consultation_flags') IS NULL THEN
    RAISE EXCEPTION 'consultation_flags does not exist in this database; stop and check DB-1';
  END IF;
END $$;

-- 1. Allow 'withdrawn' as an admin_status. The original CHECK was declared
--    inline in 000_complete_schema.sql, so its name is whatever Postgres
--    generated; find it by definition rather than by name.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.consultation_flags'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%admin_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.consultation_flags DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.consultation_flags
  ADD CONSTRAINT consultation_flags_admin_status_check
  CHECK (admin_status IN ('pending', 'investigating', 'resolved', 'withdrawn'));

-- 2. Vets read their own flags.
DROP POLICY IF EXISTS "Vets can read own flags" ON public.consultation_flags;
CREATE POLICY "Vets can read own flags"
  ON public.consultation_flags
  FOR SELECT
  TO authenticated
  USING (flagged_by = (SELECT auth.uid()));

-- 3. Vets withdraw their own pending flags (and can produce no other state).
DROP POLICY IF EXISTS "Vets can withdraw own pending flags" ON public.consultation_flags;
CREATE POLICY "Vets can withdraw own pending flags"
  ON public.consultation_flags
  FOR UPDATE
  TO authenticated
  USING (flagged_by = (SELECT auth.uid()) AND admin_status = 'pending')
  WITH CHECK (flagged_by = (SELECT auth.uid()) AND admin_status = 'withdrawn');

-- Verification (run after):
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'consultation_flags' ORDER BY 1;
--   -- expect 4 rows: Admins can manage flags (ALL), Vets can create flags... (INSERT),
--   --                Vets can read own flags (SELECT), Vets can withdraw own pending flags (UPDATE)
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'consultation_flags_admin_status_check';
--   -- expect the four values including 'withdrawn'
