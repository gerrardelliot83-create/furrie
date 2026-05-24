/**
 * Request-scoped auth helper that accepts either a cookie session OR a
 * Bearer access token.
 *
 * - Cookies: existing web app behaviour (used by Server Components +
 *   Server Actions on app.furrie.in). Falls through to `createClient`
 *   from `@/lib/supabase/server`, unchanged.
 * - Bearer: used by the Furrie mobile apps, which store the Supabase
 *   session in expo-secure-store and inject the access token into the
 *   Authorization header for every /api/* call.
 *
 * Cached via React's `cache()` so multiple callers within a single
 * request only hit Supabase Auth once.
 *
 * IMPORTANT — bearer-aware client (Flag 4 resolution, 2026-05-17):
 * In the bearer branch we DO NOT reuse the cookie-bound server client
 * from `@/lib/supabase/server`. That client carries no cookie store for
 * mobile requests, so subsequent RLS-protected queries (e.g.
 * `supabase.from('pets').select(...)`) would see the request as
 * anonymous and return empty arrays.
 *
 * Instead we construct a fresh `createServerClient` with the bearer
 * token attached to every outgoing request via `global.headers`. That
 * makes BOTH `auth.getUser(token)` validation AND downstream RLS reads
 * see the authenticated user.
 *
 * Security: both branches validate identity server-side via
 * `supabase.auth.getUser(token?)` — no local JWT-decode shortcuts.
 * Forged tokens are rejected.
 *
 * Migration plan: API routes that mobile needs (consultations, pets,
 * care-plans, treatment-plans, profile, packs, invites, prescriptions,
 * notifications, daily, pricing, follow-up) switch from `getCurrentUser`
 * to `getRequestUser`. Admin-only and internal cron routes stay on
 * `getCurrentUser` (cookie-only). The 38 existing call-sites do NOT
 * change in this PR — that's a separate mobile-driven follow-up PR.
 */
import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Same env-var fallback chain as `src/lib/supabase/server.ts` so we
// honour both the new publishable-key naming and the legacy anon-key
// fallback. Non-null assertion is safe: the cookie-bound server.ts
// already uses these and the app cannot start without them.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mobile-bearer diagnostic (2026-05-25): mobile real-device testing reports
// AUTH_REQUIRED on every bearer-token request. Log effective config once per
// cold-start instance so we can verify the deployed env vars without grepping
// per-request logs. Remove after the underlying bug is fixed and verified.
console.info('[withAuth] config:', {
  urlSuffix: SUPABASE_URL?.slice(-30),
  keyPrefix: SUPABASE_PUBLISHABLE_KEY?.slice(0, 8),
  keyFormat: SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_') ? 'sb_publishable_*' : 'legacy_jwt',
});

export const getRequestUser = cache(async () => {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      // Empty bearer string after the prefix — treat as unauthenticated.
      // Return a cookie-bound client so callers don't crash on `supabase`
      // method access; the caller's null-user check fires first.
      const fallback = await createClient();
      return { user: null, error: { message: 'Empty bearer token' }, supabase: fallback };
    }

    // Bearer-aware server client: no cookie store (mobile has none), and
    // the access token is attached to every outgoing Supabase request
    // as `Authorization: Bearer <token>`. RLS sees auth.uid() correctly.
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => [],
        setAll: () => {
          /* no-op — mobile requests are stateless; cookies are irrelevant */
        },
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const { data, error } = await supabase.auth.getUser(token);
    // Mobile-bearer diagnostic (2026-05-25): every mobile API call returns
    // AUTH_REQUIRED; route handlers swallow the underlying error. Log just
    // enough to identify the failure mode (JWT expired / invalid signature /
    // audience mismatch / session-missing). Token prefix only — first 20 chars
    // of an ES256 JWT are the public base64url header, not credential data.
    // Remove this block once mobile bearer auth is confirmed working.
    if (!data.user || error) {
      console.error('[withAuth] bearer getUser failed:', {
        hasUser: Boolean(data.user),
        error: error
          ? {
              name: error.name,
              message: error.message,
              status: (error as { status?: number }).status,
            }
          : null,
        tokenPrefix: token.slice(0, 20),
        tokenLength: token.length,
        urlSuffix: SUPABASE_URL?.slice(-30),
        keyPrefix: SUPABASE_PUBLISHABLE_KEY?.slice(0, 8),
      });
    }
    return { user: data.user, error, supabase };
  }

  // Fall back to cookie-based auth (existing web behaviour). Unchanged.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error, supabase };
});
