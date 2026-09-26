import { NextResponse } from 'next/server';

/**
 * Payments are dark (audit decision D4). Customers buy consultations by UPI
 * through /api/consultation-requests and an admin verifies the payment, so
 * the gateway routes answer 404. Their previous implementations (which,
 * with NEXT_PUBLIC_SKIP_PAYMENTS=true, scheduled consultations and minted
 * packs for free — audit SEC-2) are in git history before L1; they are
 * removed for good, with a reference table, in audit Phase 7 (decision D6).
 */
export function paymentsDisabledResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Not found', code: 'PAYMENTS_DISABLED' },
    { status: 404 }
  );
}
