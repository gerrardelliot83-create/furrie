-- ============================================================================
-- BRK-5: increment_prescribing_use_count — the RPC the app has called since
-- migration 008 but which never existed anywhere, so vet prescribing
-- patterns never accumulated a use count.
-- Phase 0, 2026-09-14. Idempotent (CREATE OR REPLACE).
--
-- One atomic insert-or-increment. The previous two-step (client upsert, then
-- a separate increment) would have started every new row at 2 because the
-- column defaults to 1 on insert. SECURITY INVOKER: the caller's own RLS on
-- vet_prescribing_patterns applies, and vet_id is always auth.uid(), so a
-- vet can only ever count their own prescriptions.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.vet_prescribing_patterns') IS NULL THEN
    RAISE EXCEPTION 'vet_prescribing_patterns does not exist in this database; stop and check DB-1';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.increment_prescribing_use_count(
  p_species    TEXT,
  p_diagnosis  TEXT,
  p_medication TEXT,
  p_dosage     TEXT DEFAULT NULL,
  p_route      TEXT DEFAULT NULL,
  p_frequency  TEXT DEFAULT NULL,
  p_duration   TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO public.vet_prescribing_patterns
    (vet_id, pet_species, diagnosis, medication_name, dosage, route, frequency, duration, use_count, last_used_at)
  VALUES
    ((SELECT auth.uid()), p_species, p_diagnosis, p_medication, p_dosage, p_route, p_frequency, p_duration, 1, now())
  ON CONFLICT (vet_id, pet_species, diagnosis, medication_name) DO UPDATE
    SET use_count    = public.vet_prescribing_patterns.use_count + 1,
        last_used_at = now(),
        dosage       = COALESCE(EXCLUDED.dosage,    public.vet_prescribing_patterns.dosage),
        route        = COALESCE(EXCLUDED.route,     public.vet_prescribing_patterns.route),
        frequency    = COALESCE(EXCLUDED.frequency, public.vet_prescribing_patterns.frequency),
        duration     = COALESCE(EXCLUDED.duration,  public.vet_prescribing_patterns.duration)
  RETURNING use_count;
$$;

REVOKE ALL ON FUNCTION public.increment_prescribing_use_count(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_prescribing_use_count(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.increment_prescribing_use_count IS
  'Insert-or-increment a vet prescribing pattern for the calling vet (auth.uid()). Returns the new use_count.';

-- Verification (run after):
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'increment_prescribing_use_count';
--   -- expect 1 row, prosecdef = false (SECURITY INVOKER)
