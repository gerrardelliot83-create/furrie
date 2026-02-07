-- Migration: Additional performance indexes
-- Note: Most indexes are created in individual table migrations
-- This file adds composite and specialized indexes for common query patterns

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Consultations: Find active consultations for a vet
CREATE INDEX idx_consultations_vet_active
  ON consultations(vet_id, status)
  WHERE status IN ('matching', 'matched', 'in_progress');

-- Consultations: Find scheduled appointments
CREATE INDEX idx_consultations_scheduled_pending
  ON consultations(scheduled_at, status)
  WHERE type = 'scheduled' AND status = 'pending';

-- Subscriptions: Find active subscriptions for a customer
CREATE INDEX idx_subscriptions_customer_active
  ON subscriptions(customer_id, status)
  WHERE status = 'active';

-- Notifications: Unread notifications for a user
CREATE INDEX idx_notifications_user_unread_type
  ON notifications(user_id, type, created_at DESC)
  WHERE is_read = false;

-- Follow-up threads: Active threads for a user
CREATE INDEX idx_follow_up_threads_customer_active
  ON follow_up_threads(customer_id, is_active, expires_at)
  WHERE is_active = true;

CREATE INDEX idx_follow_up_threads_vet_active
  ON follow_up_threads(vet_id, is_active)
  WHERE is_active = true;

-- ============================================
-- TEXT SEARCH INDEXES (for future search functionality)
-- ============================================

-- Pets: Search by name
CREATE INDEX idx_pets_name_trgm ON pets USING gin(name gin_trgm_ops);

-- Note: Requires pg_trgm extension
-- Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- TIMESTAMP INDEXES FOR REPORTING
-- ============================================

-- Consultations by date (for reporting)
CREATE INDEX idx_consultations_date
  ON consultations(DATE(created_at));

-- Payments by date (for reporting)
CREATE INDEX idx_payments_date
  ON payments(DATE(created_at));

-- ============================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
