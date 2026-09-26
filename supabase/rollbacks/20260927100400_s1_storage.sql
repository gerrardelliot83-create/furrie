-- ============================================================================
-- ROLLBACK for 20260927100400_s1_storage.sql (S-1, 2026-09-27)
--
-- WARNING: this makes every consultation photo, video and document readable
-- and listable by ANYONE again. Use only if file 5 broke something, and tell
-- the CTO first. Restores production's settings of 2026-09-27.
-- ============================================================================

UPDATE storage.buckets SET public = true WHERE id = 'consultation-media' AND NOT public;

DROP POLICY IF EXISTS consultation_media_select_own ON storage.objects;

DROP POLICY IF EXISTS consultation_media_select_public ON storage.objects;
CREATE POLICY consultation_media_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'consultation-media');

DROP POLICY IF EXISTS "Anyone can view pet photos" ON storage.objects;
CREATE POLICY "Anyone can view pet photos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'pet-photos');

-- Verification:
-- SELECT count(*) FROM storage.buckets WHERE id = 'consultation-media' AND public;   -- expect 1
-- SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND 'anon' = ANY (roles);  -- expect 2
