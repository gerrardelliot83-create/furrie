import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Find the oldest active pack with remaining credits for a customer.
 * Uses FIFO ordering (oldest pack first) to consume credits.
 *
 * @returns The pack record if found, null otherwise
 */
export async function findActivePackWithCredits(
  supabase: SupabaseClient,
  customerId: string
): Promise<{
  id: string;
  used_count: number;
  total_consultations: number;
  remaining_count: number;
} | null> {
  const { data: pack, error } = await supabase
    .from('consultation_packs')
    .select('id, used_count, total_consultations, remaining_count')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .gt('remaining_count', 0)
    .order('purchased_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to check pack balance:', error);
    return null;
  }

  return pack;
}

/**
 * Atomically deduct one credit from the customer's oldest active pack
 * and record which consultation used it.
 *
 * Uses the database RPC `consume_pack_credit` which runs
 * SELECT ... FOR UPDATE SKIP LOCKED to prevent race conditions when
 * two bookings happen concurrently.
 *
 * @returns The pack_id that was debited, or null if no credits available.
 */
export async function deductPackCredit(
  supabase: SupabaseClient,
  customerId: string,
  consultationId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('consume_pack_credit', {
    p_customer_id: customerId,
    p_consultation_id: consultationId,
  });

  if (error) {
    console.error('consume_pack_credit RPC error:', error);
    return null;
  }

  // The RPC returns the pack_id (UUID) on success, NULL when no credits.
  return (data as string | null) ?? null;
}
