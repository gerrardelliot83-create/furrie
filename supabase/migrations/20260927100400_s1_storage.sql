-- ============================================================================
-- S-1 · file 5 of 6 · S-12, S-13: consultation media is no longer public, and
-- nobody can list storage anonymously.
-- Launch sprint S, 2026-09-27. Idempotent: safe to run twice.
--
-- Before: bucket `consultation-media` was public AND had the policy
-- consultation_media_select_public (SELECT to anon, authenticated), so anyone
-- with the public key could list and download every consultation photo, video
-- and document. `pet-photos` had "Anyone can view pet photos" (SELECT to anon),
-- so anyone could list every object name - the first folder is the user's id.
--
-- After:
--   - consultation-media is private; a signed-in user can read only files in
--     their own folders (the upload path formats the mobile app uses:
--     <uid>/..., consultations/<uid>/..., follow-ups/<uid>/...); admins can read all.
--   - pet-photos stays a public bucket, so every existing pet photo URL keeps
--     working (public URLs don't use policies); only anonymous LISTING stops.
--     Owners keep "Owners can view their pet photos".
--
-- The web app never uses Supabase Storage (all web uploads go to UploadThing;
-- the 5 consultation_media rows in production point to UploadThing). The parked
-- mobile app uses public URLs for this bucket; it will need signed URLs when it
-- is revived.
--
-- No BEGIN/COMMIT: the Supabase SQL Editor runs each "Run" on its own pooled
-- connection, and every statement below is safe on its own.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'S1: storage schema missing; stop and check the snapshot';
  END IF;
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'S1: public.is_admin() is missing; run files 1 and 2 first';
  END IF;
END $$;

-- S-12: make the bucket private. If Supabase refuses the update from SQL, the
-- rest of the file still runs; the WARNING says what to do.
DO $$
BEGIN
  UPDATE storage.buckets SET public = false WHERE id = 'consultation-media' AND public;
EXCEPTION WHEN others THEN
  RAISE WARNING 'S1: could not make the consultation-media bucket private from SQL (%). Tell the CTO: Storage > consultation-media > Edit bucket > Public bucket off > Save.', SQLERRM;
END $$;

DROP POLICY IF EXISTS consultation_media_select_public ON storage.objects;

DROP POLICY IF EXISTS consultation_media_select_own ON storage.objects;
CREATE POLICY consultation_media_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consultation-media'
    AND (
      (SELECT auth.uid())::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] IN ('consultations', 'follow-ups')
        AND (SELECT auth.uid())::text = (storage.foldername(name))[2]
      )
      OR (SELECT public.is_admin())
    )
  );

-- S-13: no anonymous listing of pet-photos.
DROP POLICY IF EXISTS "Anyone can view pet photos" ON storage.objects;

-- ============================================================================
-- Verification (the CTO runs these through the read-only connection).
--
-- SELECT count(*) FROM storage.buckets WHERE id = 'consultation-media' AND public;
--   -- expect 0   (if 1: the WARNING fired; do the dashboard step above)
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'storage' AND 'anon' = ANY (roles);
--   -- expect 0
--
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname = 'storage' AND policyname = 'consultation_media_select_own'
--    AND roles = '{authenticated}';
--   -- expect 1
-- ============================================================================
