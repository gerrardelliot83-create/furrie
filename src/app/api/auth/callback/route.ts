import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/safeRedirect';
import { withRoute } from '@/server/handler';

export const GET = withRoute(async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Only ever a path on this origin (P0R-2); same check as handleAuthCallback.ts.
  const next = safeNextPath(requestUrl.searchParams.get('next'), requestUrl.origin);

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
