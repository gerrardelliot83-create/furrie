import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

/**
 * Shared handler for the browser-facing `/auth/callback` endpoint.
 *
 * Why this exists: the customer portal's primary sign-in path is the
 * emailed OTP code, typed into the form. But the same Supabase email also
 * carries a magic link (mobile needs `{{ .ConfirmationURL }}`, and both
 * clients share one template). Before this route existed, tapping that
 * link on the web landed on a path with no handler — middleware bounced
 * the user to `/login` and the `?code=` was silently discarded.
 *
 * `https://app.furrie.in/auth/callback` and `https://vet.furrie.in/auth/callback`
 * are already allow-listed in Supabase → Authentication → URL Configuration
 * (see furrie-mobile/web-pr/SUPABASE_AUTH_CONFIG.md); this gives those URLs
 * something to land on.
 *
 * Handles both link shapes:
 *   - `?code=…`       PKCE flow (what `@supabase/ssr` browser clients request)
 *   - `?token_hash=…` `{{ .TokenHash }}` templates, via verifyOtp
 *
 * Note: PKCE stores its code verifier in the requesting browser. A link
 * opened in a *different* browser than the one that requested it cannot be
 * exchanged — that user should type the code instead. The error surfaced
 * below tells them so rather than failing blankly.
 *
 * Distinct from `/api/auth/callback`, which stays as-is for any existing
 * integration pointing at it.
 */
export async function handleAuthCallback(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const failure = (message: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url.origin)
    );

  // Supabase reports refusals (expired link, redirect not allow-listed) as
  // query params on the redirect rather than as a non-2xx response.
  const providerError = params.get('error_description') || params.get('error');
  if (providerError) {
    console.error('[auth/callback] provider error:', providerError);
    return failure(providerError);
  }

  const code = params.get('code');
  const tokenHash = params.get('token_hash');

  if (!code && !tokenHash) {
    return failure('That sign-in link is incomplete. Please request a new one.');
  }

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: (params.get('type') as EmailOtpType | null) ?? 'email',
      });

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message);
    return failure(
      'That sign-in link could not be used. Open it in the browser you requested it from, or enter the code from the email instead.'
    );
  }

  // Only ever redirect to a path on this origin — never to a caller-supplied
  // absolute URL, and never to a protocol-relative `//host` path.
  const requested = params.get('next');
  const destination =
    requested && requested.startsWith('/') && !requested.startsWith('//')
      ? requested
      : '/dashboard';

  return NextResponse.redirect(new URL(destination, url.origin));
}
