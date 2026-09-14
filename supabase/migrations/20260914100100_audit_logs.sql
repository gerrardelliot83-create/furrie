-- ============================================================================
-- BRK-4: audit_logs — recreate migration 013 idempotently
-- Phase 0, 2026-09-14. Safe to re-run.
--
-- 013_audit_logs.sql was never applied to production (verified 2026-09-06 and
-- again on 2026-09-14: the table is absent), so every admin action — vet
-- creation, deactivation, credit grants, refunds, password resets — has been
-- logged into nothing. This file is 013 with IF NOT EXISTS / DROP IF EXISTS
-- guards so it can be applied whether or not any part of it already exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs. No INSERT/UPDATE/DELETE policies: inserts
-- come through the service role from src/lib/admin/auth.ts; the table is
-- append-only for everyone else.
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Append-only admin audit log. No FKs to avoid coupling. Inserts via service role only.';
COMMENT ON COLUMN public.audit_logs.admin_id IS
  'UUID of the admin who performed the action. Not FK to avoid blocking admin deletion.';
COMMENT ON COLUMN public.audit_logs.target_type IS
  'Entity type: vet, user, subscription, consultation, etc.';
COMMENT ON COLUMN public.audit_logs.target_id IS
  'Primary key of the target entity (as text). Not FK to avoid coupling to any single table.';
COMMENT ON COLUMN public.audit_logs.action IS
  'Action performed: create_vet, deactivate_user, cancel_subscription, reset_password, etc.';

-- Verification (run after):
--   SELECT to_regclass('public.audit_logs');            -- expect 'audit_logs', not NULL
--   SELECT count(*) FROM pg_policies WHERE tablename = 'audit_logs';   -- expect 1
--   SELECT count(*) FROM pg_indexes WHERE tablename = 'audit_logs';    -- expect 5 (pkey + 4)
