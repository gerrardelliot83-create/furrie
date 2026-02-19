-- Migration 009: Add consultation media support
CREATE TABLE consultation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (required per project standards)
ALTER TABLE consultation_media ENABLE ROW LEVEL SECURITY;

-- Customers can upload to their own consultations
CREATE POLICY "customers_upload_media" ON consultation_media
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND consultation_id IN (
      SELECT id FROM consultations WHERE customer_id = auth.uid()
    )
  );

-- Customers can delete their own uploads
CREATE POLICY "customers_delete_own_media" ON consultation_media
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Both vet and customer can view media for their consultations
CREATE POLICY "participants_view_media" ON consultation_media
  FOR SELECT TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations
      WHERE customer_id = auth.uid() OR vet_id = auth.uid()
    )
  );

-- Admins can manage all media
CREATE POLICY "admins_manage_media" ON consultation_media
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Performance indexes
CREATE INDEX idx_consultation_media_consultation ON consultation_media(consultation_id);
CREATE INDEX idx_consultation_media_uploaded_by ON consultation_media(uploaded_by);
CREATE INDEX idx_consultation_media_type ON consultation_media(media_type);
