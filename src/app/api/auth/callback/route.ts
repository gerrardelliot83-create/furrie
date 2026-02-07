import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine the redirect based on the host
      const host = requestUrl.host;
      let redirectPath = next;

      // Ensure we redirect to the correct portal
      if (host.startsWith('app.') || host.includes('app.furrie')) {
        redirectPath = next.startsWith('/') ? next : `/${next}`;
      } else if (host.startsWith('vet.') || host.includes('vet.furrie')) {
        redirectPath = next.startsWith('/') ? next : `/${next}`;
      } else if (host.startsWith('admin.') || host.includes('admin.furrie')) {
        redirectPath = next.startsWith('/') ? next : `/${next}`;
      }

      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }

    // Auth error - redirect to login with error
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
