import { createClient } from '@supabase/supabase-js';

// Support both new (secret) and legacy (service_role) key names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for server-only admin operations
// WARNING: Never expose this client to the browser
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
