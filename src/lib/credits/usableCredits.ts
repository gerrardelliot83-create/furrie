import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Credits the booking route may spend right now: active packs with credits
 * left that are not past their expiry date. Throws on a query error so the
 * caller answers 500 rather than wrongly telling a customer they have none.
 */
export async function countUsableCredits(
  adminClient: SupabaseClient,
  customerId: string
): Promise<number> {
  const { data, error } = await adminClient
    .from('consultation_packs')
    .select('remaining_count')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .gt('remaining_count', 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) {
    throw new Error(`countUsableCredits: ${error.message}`);
  }
  return (data ?? []).reduce((sum, p) => sum + (p.remaining_count ?? 0), 0);
}

/**
 * Take one credit and move the consultation pending → scheduled in a single
 * database transaction (l1_schedule_with_credit, service role only).
 * Returns the pack id, or null when the customer has no usable credit.
 * Throws on any database error (nothing is changed in that case).
 */
export async function scheduleConsultationWithCredit(
  adminClient: SupabaseClient,
  customerId: string,
  consultationId: string
): Promise<string | null> {
  const { data, error } = await adminClient.rpc('l1_schedule_with_credit', {
    p_customer_id: customerId,
    p_consultation_id: consultationId,
  });
  if (error) {
    throw new Error(`l1_schedule_with_credit: ${error.message}`);
  }
  return (data as string | null) ?? null;
}
