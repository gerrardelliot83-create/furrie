-- Migration: Create payments table

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  consultation_id UUID REFERENCES consultations(id),
  subscription_id UUID, -- Will reference subscriptions table created later
  cashfree_order_id TEXT UNIQUE NOT NULL,
  cashfree_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded'
  )),
  payment_method TEXT,
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_consultation_id ON payments(consultation_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_cashfree_order_id ON payments(cashfree_order_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
