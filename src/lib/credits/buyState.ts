import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PAYMENT_REQUEST_COLUMNS,
  buildPaymentRequestView,
  isPricedRequest,
  type PaymentRequestRow,
  type PaymentRequestView,
} from './paymentView';

export interface BuyState {
  /** The customer's open UPI order, if any (pay details or "checking"). */
  initialRequest: PaymentRequestView | null;
  /** Quantity of an open request made before L1 (no price), if any. */
  legacyQuantity: number | null;
}

/** What the buy panel should start with for this customer. */
export async function loadBuyState(
  supabase: SupabaseClient,
  customerId: string,
  customer: { name?: string | null; email?: string | null }
): Promise<BuyState> {
  const { data, error } = await supabase
    .from('consultation_credit_requests')
    .select(`${PAYMENT_REQUEST_COLUMNS}, requested_quantity`)
    .eq('customer_id', customerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<PaymentRequestRow & { requested_quantity?: number }>();

  if (error || !data) {
    return { initialRequest: null, legacyQuantity: null };
  }
  if (isPricedRequest(data)) {
    return { initialRequest: buildPaymentRequestView(data, customer), legacyQuantity: null };
  }
  return { initialRequest: null, legacyQuantity: data.requested_quantity ?? null };
}
