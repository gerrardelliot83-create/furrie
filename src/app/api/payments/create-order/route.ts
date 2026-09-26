import { paymentsDisabledResponse } from '@/lib/payments/disabled';
import { withRoute } from '@/server/handler';

// Payments are dark (D4); see src/lib/payments/disabled.ts.
export const dynamic = 'force-dynamic';

export const POST = withRoute(async function POST() {
  return paymentsDisabledResponse();
});
