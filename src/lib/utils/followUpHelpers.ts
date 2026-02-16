import { createClient } from '@/lib/supabase/server';

/**
 * Check if SOAP notes exist for a consultation
 */
export async function checkSoapExists(consultationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('soap_notes')
    .select('id')
    .eq('consultation_id', consultationId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Check if a customer has an active Plus subscription for a specific pet
 */
export async function checkPlusSubscription(
  customerId: string,
  petId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, plan_type, expires_at')
    .eq('customer_id', customerId)
    .eq('pet_id', petId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return false;
  }

  // Must be a Plus plan
  if (data.plan_type !== 'plus') {
    return false;
  }

  // Check if subscription is still valid (not expired)
  // NULL expires_at means indefinite
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate thread expiry based on subscription status
 * @param isPlusUser - Whether the user has Plus subscription
 * @returns ISO date string for expiry, or null for indefinite
 */
export function calculateThreadExpiry(isPlusUser: boolean): string | null {
  if (isPlusUser) {
    // Plus users get indefinite follow-up
    return null;
  }

  // Free users get 7 days
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  return expiryDate.toISOString();
}

/**
 * Get follow-up thread for a consultation
 */
export async function getFollowUpThread(consultationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('follow_up_threads')
    .select('*')
    .eq('consultation_id', consultationId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
