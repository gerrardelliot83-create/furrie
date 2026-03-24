-- ============================================================================
-- FURRIE DATABASE MIGRATION - Audit Logs
-- Version: 13.0
-- Date: 2026-03-24
--
-- PURPOSE: Append-only audit log for admin actions. Tracks who did what,
-- when, and to whom. No FKs to avoid coupling/blocking deletions.
--
-- SCHEMA HARMONY:
--   - audit_logs is a NEW table (no conflict with existing tables)
--   - admin_id stored as UUID but NOT FK'd to profiles (avoids cascade issues)
--   - target_id stored as TEXT (can reference any table's PK)
--   - Append-only: no UPDATE/DELETE policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (no INSERT policy — inserts via service role)
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Documentation
COMMENT ON TABLE audit_logs IS
  'Append-only admin audit log. No FKs to avoid coupling. Inserts via service role only.';

COMMENT ON COLUMN audit_logs.admin_id IS
  'UUID of the admin who performed the action. Not FK to avoid blocking admin deletion.';

COMMENT ON COLUMN audit_logs.target_type IS
  'Entity type: vet, user, subscription, consultation, etc.';

COMMENT ON COLUMN audit_logs.target_id IS
  'Primary key of the target entity (as text). Not FK to avoid coupling to any single table.';

COMMENT ON COLUMN audit_logs.action IS
  'Action performed: create_vet, deactivate_user, cancel_subscription, reset_password, etc.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
