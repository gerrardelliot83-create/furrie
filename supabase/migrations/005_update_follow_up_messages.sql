-- Migration: Update follow_up_messages schema for chat feature
-- Adds sender_role, message_type columns; renames 'message' to 'content'

-- Add sender_role column to track customer/vet distinction
ALTER TABLE follow_up_messages
ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('customer', 'vet'));

-- Add message_type column to support text and image messages
ALTER TABLE follow_up_messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image'));

-- Rename 'message' column to 'content' for consistency with hook
-- First check if 'message' column exists and 'content' doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_messages' AND column_name = 'message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE follow_up_messages RENAME COLUMN message TO content;
  END IF;
END $$;

-- Add attachment_url column (single URL instead of array)
ALTER TABLE follow_up_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Migrate existing attachments array to attachment_url (use first element if exists)
UPDATE follow_up_messages
SET attachment_url = attachments[1]
WHERE attachments IS NOT NULL
  AND array_length(attachments, 1) > 0
  AND attachment_url IS NULL;

-- Drop the old attachments array column after migration
ALTER TABLE follow_up_messages
DROP COLUMN IF EXISTS attachments;

-- Index for efficient queries by message_type
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_message_type
  ON follow_up_messages(message_type);

-- Update RLS policy to check thread expiry
DROP POLICY IF EXISTS "Participants can send follow-up messages" ON follow_up_messages;
CREATE POLICY "Participants can send follow-up messages"
  ON follow_up_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM follow_up_threads t
      WHERE t.id = thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
        AND t.is_active = true
        AND (t.expires_at IS NULL OR t.expires_at > NOW())
    )
  );

-- Ensure read policy allows participants to see messages
DROP POLICY IF EXISTS "Participants can read follow-up messages" ON follow_up_messages;
CREATE POLICY "Participants can read follow-up messages"
  ON follow_up_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM follow_up_threads t
      WHERE t.id = follow_up_messages.thread_id
        AND (t.customer_id = auth.uid() OR t.vet_id = auth.uid())
    )
  );
