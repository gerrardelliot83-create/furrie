/**
 * Server-side utility to get the total credit balance for a customer
 * across all active consultation packs, plus their open credit request.
 *
 * Used by the dashboard, /connect and /buy to show and gate credits. Packs past
 * their expiry date are not counted even before the hourly expiry cron marks
 * them expired, matching l1_schedule_with_credit.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface OpenCreditRequest {
  id: string;
  /** Pack size for UPI requests; null on requests made before L1. */
  packSize: number | null;
  quantity: number;
  /** Total to pay (incl. GST); null on legacy requests. */
  amount: number | null;
  reference: string | null;
  claimedAt: string | null;
  createdAt: string;
  isLegacy: boolean;
}

export interface CreditBalance {
  totalCredits: number;
  activePacks: number;
  /** Earliest expiry among usable packs that expire, if any. */
  soonestExpiry: string | null;
  hasPendingRequest: boolean;
  pendingRequestId: string | null;
  pendingRequestQuantity: number | null;
  openRequest: OpenCreditRequest | null;
}

export const EMPTY_CREDIT_BALANCE: CreditBalance = {
  totalCredits: 0,
  activePacks: 0,
  soonestExpiry: null,
  hasPendingRequest: false,
  pendingRequestId: null,
  pendingRequestQuantity: null,
  openRequest: null,
};

export async function getActiveCreditBalance(
  supabase: SupabaseClient,
  customerId: string
): Promise<CreditBalance> {
  const nowIso = new Date().toISOString();
  const [packsResult, requestResult] = await Promise.all([
    supabase
      .from('consultation_packs')
      .select('id, remaining_count, expires_at')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .gt('remaining_count', 0)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase
      .from('consultation_credit_requests')
      .select('id, requested_quantity, pack_size, amount_inr, reference_code, payment_claimed_at, created_at')
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (packsResult.error) {
    console.error('[credits] balance query failed:', packsResult.error.message);
  }

  const packs = packsResult.data ?? [];
  const totalCredits = packs.reduce((sum, p) => sum + (p.remaining_count ?? 0), 0);
  const expiries = packs
    .map((p) => p.expires_at as string | null)
    .filter((e): e is string => !!e)
    .sort();

  const r = requestResult.data;
  const openRequest: OpenCreditRequest | null = r
    ? {
        id: r.id,
        packSize: r.pack_size ?? null,
        quantity: r.requested_quantity,
        amount: r.amount_inr === null || r.amount_inr === undefined ? null : Number(r.amount_inr),
        reference: r.reference_code ?? null,
        claimedAt: r.payment_claimed_at ?? null,
        createdAt: r.created_at,
        isLegacy: !r.reference_code,
      }
    : null;

  return {
    totalCredits,
    activePacks: packs.length,
    soonestExpiry: expiries[0] ?? null,
    hasPendingRequest: !!openRequest,
    pendingRequestId: openRequest?.id ?? null,
    pendingRequestQuantity: openRequest?.quantity ?? null,
    openRequest,
  };
}
