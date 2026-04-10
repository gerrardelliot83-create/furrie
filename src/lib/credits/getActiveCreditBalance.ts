/**
 * Server-side utility to get the total credit balance for a customer
 * across all active consultation packs, plus any pending credit request.
 *
 * Used by the dashboard and the booking flow to show / gate credits.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreditBalance {
  totalCredits: number;
  activePacks: number;
  hasPendingRequest: boolean;
  pendingRequestId: string | null;
  pendingRequestQuantity: number | null;
}

export async function getActiveCreditBalance(
  supabase: SupabaseClient,
  customerId: string
): Promise<CreditBalance> {
  const [packsResult, requestResult] = await Promise.all([
    supabase
      .from('consultation_packs')
      .select('id, remaining_count')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gt('remaining_count', 0),
    supabase
      .from('consultation_credit_requests')
      .select('id, requested_quantity')
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle(),
  ]);

  const packs = packsResult.data ?? [];
  const totalCredits = packs.reduce(
    (sum, p) => sum + (p.remaining_count ?? 0),
    0
  );

  const pendingRequest = requestResult.data;

  return {
    totalCredits,
    activePacks: packs.length,
    hasPendingRequest: !!pendingRequest,
    pendingRequestId: pendingRequest?.id ?? null,
    pendingRequestQuantity: pendingRequest?.requested_quantity ?? null,
  };
}
