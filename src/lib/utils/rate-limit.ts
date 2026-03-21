/**
 * Simple in-memory rate limiter for serverless functions.
 *
 * Limits are per-function-instance (Vercel Functions are ephemeral),
 * so this provides burst protection within a single instance lifetime.
 * Supabase Auth provides additional rate limiting at the database level.
 *
 * For production-grade distributed rate limiting, upgrade to @upstash/ratelimit
 * with Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (typically IP address).
 * Returns { success: true } if under limit, { success: false } if exceeded.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — allow and start new window
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window — check count
  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment and allow
  entry.count += 1;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for; falls back to x-real-ip.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute */
  auth: { maxRequests: 10, windowMs: 60_000 },
  /** OTP send: 5 requests per 5 minutes */
  otp: { maxRequests: 5, windowMs: 300_000 },
  /** Payment creation: 10 requests per minute */
  payment: { maxRequests: 10, windowMs: 60_000 },
  /** General API: 60 requests per minute */
  general: { maxRequests: 60, windowMs: 60_000 },
} as const;

/**
 * Helper to create a 429 Too Many Requests response with appropriate headers.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
