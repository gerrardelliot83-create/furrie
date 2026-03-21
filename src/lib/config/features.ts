/**
 * Feature flags for Furrie platform.
 * Flip flags here to enable/disable features across the entire app.
 * Backend routes are NOT gated by these flags -- only UI rendering.
 */
export const FEATURES = {
  /** Show Furrie Plus subscription UI (upgrade buttons, Plus badges, subscription status) */
  ENABLE_SUBSCRIPTIONS: false,
  /** Show payment UI (pricing cards, fee breakdowns, pack purchases, "Pay" step labels).
   *  When false, booking flow skips payment display — backend SKIP_PAYMENTS handles auto-completion.
   *  Flip to true when payment gateway (Cashfree/Razorpay) is integrated. */
  ENABLE_PAYMENTS: false,
} as const;
