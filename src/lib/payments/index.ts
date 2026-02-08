// Payment Service
// Gateway-agnostic payment service with stubs for future integration

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentStatusRequest,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
  PaymentGateway,
} from './types';

// Environment check for skipping payments in dev mode
export const SKIP_PAYMENTS = process.env.NEXT_PUBLIC_SKIP_PAYMENTS === 'true';

// Current gateway (can be changed when integrating actual gateway)
export const PAYMENT_GATEWAY: PaymentGateway = 'none';

/**
 * Generate a mock order ID for development
 */
function generateMockOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DEV_${timestamp}_${random}`.toUpperCase();
}

/**
 * Create a payment order
 * In dev mode with SKIP_PAYMENTS=true, returns a mock successful order
 */
export async function createOrder(
  _request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  // Dev bypass mode
  if (SKIP_PAYMENTS) {
    const mockOrderId = generateMockOrderId();
    return {
      success: true,
      orderId: mockOrderId,
      gatewayOrderId: mockOrderId,
      status: 'ready',
    };
  }

  // Production mode - gateway not yet integrated
  console.warn('Payment gateway not yet integrated. Set NEXT_PUBLIC_SKIP_PAYMENTS=true for development.');
  return {
    success: false,
    orderId: '',
    status: 'error',
    error: 'Payment gateway not yet configured. Please try again later.',
  };
}

/**
 * Check payment status
 * In dev mode with SKIP_PAYMENTS=true, returns mock completed status
 */
export async function getPaymentStatus(
  request: PaymentStatusRequest
): Promise<PaymentStatusResponse> {
  // Dev bypass mode
  if (SKIP_PAYMENTS) {
    return {
      success: true,
      orderId: request.orderId,
      status: 'completed',
      amount: 0,
      currency: 'INR',
      paidAt: new Date().toISOString(),
    };
  }

  // Production mode - gateway not yet integrated
  return {
    success: false,
    orderId: request.orderId,
    status: 'pending',
    amount: 0,
    currency: 'INR',
    error: 'Payment gateway not yet configured',
  };
}

/**
 * Process a refund
 * In dev mode with SKIP_PAYMENTS=true, returns mock successful refund
 */
export async function processRefund(
  request: RefundRequest
): Promise<RefundResponse> {
  // Dev bypass mode
  if (SKIP_PAYMENTS) {
    return {
      success: true,
      refundId: `REFUND_${request.orderId}`,
      status: 'processed',
    };
  }

  // Production mode - gateway not yet integrated
  return {
    success: false,
    status: 'failed',
    error: 'Payment gateway not yet configured',
  };
}

/**
 * Verify webhook signature from payment gateway
 * Returns true in dev mode, needs implementation for each gateway
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  _gateway: PaymentGateway
): boolean {
  if (SKIP_PAYMENTS) {
    return true;
  }

  // TODO: Implement signature verification for each gateway
  // PhonePe: SHA256 of (base64(payload) + "/pg/v1/status/" + merchantId + saltKey) == X-VERIFY header
  // Cashfree: Use cashfree-pg SDK's verify method
  console.warn('Webhook signature verification not implemented for gateway:', _gateway);
  return false;
}

// Re-export types
export * from './types';
