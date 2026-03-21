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
 * Deduct one credit from a pack and record the usage.
 * Updates used_count and auto-exhausts the pack if all credits used.
 *
 * @returns true if successful, false on error
 */
export async function deductPackCredit(
  supabase: SupabaseClient,
  packId: string,
  consultationId: string,
  currentUsedCount: number,
  totalConsultations: number
): Promise<boolean> {
  const newUsedCount = currentUsedCount + 1;
  const isExhausted = newUsedCount >= totalConsultations;

  // Update pack: increment used_count, set exhausted if done
  const updateData: Record<string, unknown> = {
    used_count: newUsedCount,
  };
  if (isExhausted) {
    updateData.status = 'exhausted';
  }

  const { error: updateError } = await supabase
    .from('consultation_packs')
    .update(updateData)
    .eq('id', packId)
    .eq('status', 'active'); // Optimistic lock

  if (updateError) {
    console.error('Failed to deduct pack credit:', updateError);
    return false;
  }

  // Record the usage
  const { error: useError } = await supabase
    .from('consultation_pack_uses')
    .insert({
      pack_id: packId,
      consultation_id: consultationId,
    });

  if (useError) {
    console.error('Failed to record pack use:', useError);
    // Don't rollback the pack update - the credit was consumed
    return false;
  }

  return true;
}
