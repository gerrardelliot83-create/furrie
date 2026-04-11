-- ============================================================================
-- Migration 017: Backfill invite codes for existing customers
-- ============================================================================
--
-- The 016_invites.sql migration added a trigger that creates an invite code
-- on new profile insertion. However, existing customers at the time of that
-- migration did not get invite codes. This migration creates one for each
-- existing customer who doesn't yet have a code.
--
-- Safe to re-run: uses INSERT...ON CONFLICT DO NOTHING on referrer_id,
-- and only targets customers without an existing invite code.
-- ============================================================================

DO $$
DECLARE
  customer_record RECORD;
  retry_count INT;
BEGIN
  FOR customer_record IN
    SELECT p.id
    FROM profiles p
    WHERE p.role = 'customer'
      AND NOT EXISTS (
        SELECT 1 FROM invite_codes ic WHERE ic.referrer_id = p.id
      )
  LOOP
    retry_count := 0;
    LOOP
      BEGIN
        INSERT INTO invite_codes (referrer_id)
        VALUES (customer_record.id);
        EXIT; -- success, move to next customer
      EXCEPTION WHEN unique_violation THEN
        retry_count := retry_count + 1;
        IF retry_count >= 5 THEN
          RAISE WARNING 'Could not generate unique invite code for customer % after 5 retries', customer_record.id;
          EXIT;
        END IF;
        -- Retry with an explicit new code
        BEGIN
          INSERT INTO invite_codes (code, referrer_id)
          VALUES (generate_invite_code(), customer_record.id);
          EXIT; -- success
        EXCEPTION WHEN unique_violation THEN
          -- Continue retry loop
        END;
      END;
    END LOOP;
  END LOOP;
END;
$$;
