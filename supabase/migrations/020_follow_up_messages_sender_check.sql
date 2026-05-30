-- Migration 020: harden follow_up_messages INSERT policy
--
-- Context: Phase E-5 mobile audit. The existing INSERT policy
-- ("Participants can send follow-up messages", migration 005) authorizes any
-- thread participant (customer OR vet) to insert into an active, non-expired
-- thread, but does NOT pin the row's sender_id to the authenticated user. A
-- participant could therefore spoof sender_id to the other party.
--
-- This migration recreates the policy adding `AND sender_id = auth.uid()`.
-- It is SAFE: both the web and mobile clients already set sender_id = user.id
-- (see useFollowUpChat.ts), and server-side routes use the service-role client
-- which bypasses RLS. No legitimate writer is affected.
--
-- NOTE: the vet/customer SEND already works without this change (the policy
-- evaluates auth.uid() from the bearer JWT). This is integrity hardening, not
-- a functional blocker.

DROP POLICY IF EXISTS "Participants can send follow-up messages" ON follow_up_messages;

CREATE POLICY "Participants can send follow-up messages"
  ON follow_up_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM follow_up_threads t
      WHERE t.id = thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
        AND t.is_active = true
        AND (t.expires_at IS NULL OR t.expires_at > NOW())
    )
  );
