-- Migration: Create follow_up_threads and follow_up_messages tables

-- Follow-up threads (one per consultation)
CREATE TABLE follow_up_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  vet_id UUID NOT NULL REFERENCES profiles(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- NULL for Plus (indefinite)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE follow_up_threads ENABLE ROW LEVEL SECURITY;

-- Follow-up messages (chat within thread)
CREATE TABLE follow_up_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES follow_up_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE follow_up_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_follow_up_threads_consultation_id ON follow_up_threads(consultation_id);
CREATE INDEX idx_follow_up_threads_customer_id ON follow_up_threads(customer_id);
CREATE INDEX idx_follow_up_threads_vet_id ON follow_up_threads(vet_id);
CREATE INDEX idx_follow_up_threads_is_active ON follow_up_threads(is_active);
CREATE INDEX idx_follow_up_threads_expires_at ON follow_up_threads(expires_at);

CREATE INDEX idx_follow_up_messages_thread_id ON follow_up_messages(thread_id);
CREATE INDEX idx_follow_up_messages_sender_id ON follow_up_messages(sender_id);
CREATE INDEX idx_follow_up_messages_created_at ON follow_up_messages(created_at DESC);
