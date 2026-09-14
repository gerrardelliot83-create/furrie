import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRoute } from '@/server/handler';

/**
 * Only ever redirect to a path on this origin. Rejects absolute URLs,
 * protocol-relative `//evil.com` and backslash variants that browsers
 * normalise to `//` (SEC-10 open redirect). Mirrors handleAuthCallback.ts.
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard';
  const candidate = raw.startsWith('/') ? raw : `/${raw}`;
  // A single leading slash followed by anything except another slash or a backslash.
  return /^\/(?![\/\\])/.test(candidate) ? candidate : '/dashboard';
}

export const GET = withRoute(async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // `next` is already a same-origin path (see safeNextPath); the host
      // rewrites in vercel.json map it onto the right portal.
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // Auth error - redirect to login with error
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
});
