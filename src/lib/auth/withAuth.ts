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
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

// Same env-var fallback chain as `src/lib/supabase/server.ts` so we
// honour both the new publishable-key naming and the legacy anon-key
// fallback. Non-null assertion is safe: the cookie-bound server.ts
// already uses these and the app cannot start without them.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type RequestProfile = Database['public']['Tables']['profiles']['Row'];

type RequestUserResult = {
  user: User | null;
  error: { message: string; code?: string } | null;
  supabase: SupabaseClient;
  /** The caller's own profile row; null whenever `user` is null. */
  profile: RequestProfile | null;
};

/**
 * Loads the signed-in caller's own profile row, once per request, with their
 * own session (RLS: "Users can read own profile"). Routes use `profile.role`
 * instead of querying profiles again.
 *
 * C-03: an account the admin deactivated (`profiles.is_active = false`) or one
 * with no profile row is treated as signed out, so every route that checks
 * `authError || !user` answers 401. A database error throws instead (the route
 * answers 500), so a blip never signs anyone out.
 */
async function withProfile(
  supabase: SupabaseClient,
  user: User | null,
  authError: { message: string } | null
): Promise<RequestUserResult> {
  if (authError || !user) {
    return { user: null, error: authError ?? { message: 'Not signed in' }, supabase, profile: null };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`getRequestUser: could not load the caller's profile (${error.code}): ${error.message}`);
  }
  if (!profile) {
    return { user: null, error: { message: 'No profile for this account', code: 'NO_PROFILE' }, supabase, profile: null };
  }
  if (profile.is_active === false) {
    return { user: null, error: { message: 'This account has been deactivated', code: 'ACCOUNT_DISABLED' }, supabase, profile: null };
  }
  return { user, error: null, supabase, profile: profile as RequestProfile };
}

export const getRequestUser = cache(async (): Promise<RequestUserResult> => {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      // Empty bearer string after the prefix — treat as unauthenticated.
      // Return a cookie-bound client so callers don't crash on `supabase`
      // method access; the caller's null-user check fires first.
      const fallback = await createClient();
      return { user: null, error: { message: 'Empty bearer token' }, supabase: fallback, profile: null };
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
    return withProfile(supabase, data.user, error);
  }

  // Fall back to cookie-based auth (existing web behaviour).
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return withProfile(supabase, data.user, error);
});
