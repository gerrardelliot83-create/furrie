-- ============================================================================
-- ROLLBACK for supabase/ops/l1_founding_cutover_{1_prepare,2_apply}.sql (L1)
--
-- Withdraws founding credits that have NOT been used yet (used ones stay —
-- the consultation happened) and empties the founding list so no new sign-up
-- claims one. Only on the CTO's instruction.
-- ============================================================================
UPDATE public.consultation_packs
   SET status = 'cancelled'
 WHERE admin_note = 'founding_member'
   AND status = 'active'
   AND used_count = 0;

DELETE FROM public.founding_members WHERE granted_at IS NULL;

DROP TABLE IF EXISTS public.founding_import;

-- Verification:
-- SELECT count(*) FROM public.consultation_packs WHERE admin_note = 'founding_member' AND status = 'active';
--   -- expect 0 (except packs already partly used — founding packs hold 1 credit, so 0)
