/**
 * Feature flags for Furrie platform.
 * Flip flags here to enable/disable features across the entire app.
 * Backend routes are NOT gated by these flags -- only UI rendering.
 */
export const FEATURES = {
  /** Show Furrie Plus subscription UI (upgrade buttons, Plus badges, subscription status) */
  ENABLE_SUBSCRIPTIONS: false,
} as const;
