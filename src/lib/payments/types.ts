// Payment Types (Gateway-Agnostic)
// Designed to work with any payment gateway (PhonePe, Cashfree, Razorpay, etc.)

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentType = 'consultation' | 'subscription' | 'sachet';

export type PaymentGateway = 'none' | 'phonepe' | 'cashfree' | 'razorpay';

export interface CreateOrderRequest {
  consultationId?: string;
  subscriptionId?: string;
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  gatewayOrderId?: string;
  redirectUrl?: string;
  status: 'pending' | 'ready' | 'error';
  error?: string;
}

export interface PaymentStatusRequest {
  orderId: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  orderId: string;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  amount: number;
  currency: string;
  paidAt?: string;
  error?: string;
}

export interface WebhookPayload {
  gateway: PaymentGateway;
  event: string;
  orderId: string;
  transactionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  timestamp: string;
  signature?: string;
  rawPayload: unknown;
}

export interface RefundRequest {
  orderId: string;
  amount?: number; // Partial refund if specified
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

// Database payment record
export interface PaymentRecord {
  id: string;
  customerId: string;
  consultationId: string | null;
  subscriptionId: string | null;
  gatewayOrderId: string;
  gatewayTransactionId: string | null;
  gatewayProvider: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string | null;
  refundedAmount: number | null;
  gatewayMetadata: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Price computation result (from pricing engine)
export interface ComputedPrice {
  basePrice: number;
  finalPrice: number;
  currency: string;
  appliedMultipliers: {
    species?: number;
    breed?: number;
    age?: number;
  };
  discounts: {
    type: string;
    amount: number;
  }[];
  breakdown: {
    label: string;
    value: number;
  }[];
}
