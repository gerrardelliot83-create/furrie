-- Add 'document' to consultation_media media_type CHECK constraint
ALTER TABLE consultation_media
  DROP CONSTRAINT IF EXISTS consultation_media_media_type_check;

ALTER TABLE consultation_media
  ADD CONSTRAINT consultation_media_media_type_check
    CHECK (media_type IN ('photo', 'video', 'document'));
