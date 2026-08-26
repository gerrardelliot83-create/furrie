import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

type Portal = 'customer' | 'vet' | 'admin';

/**
 * Detect which portal the request is for based on subdomain
 */
function getPortal(request: NextRequest): Portal {
  const host = request.headers.get('host') || '';

  // Production domains
  if (host.startsWith('vet.')) return 'vet';
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('app.')) return 'customer';

  // Local development domains (.furrie.local)
  if (host.includes('vet.furrie.local')) return 'vet';
  if (host.includes('admin.furrie.local')) return 'admin';
  if (host.includes('app.furrie.local')) return 'customer';

  // Default to customer for localhost and other hosts
  return 'customer';
}

/**
 * Get public routes for each portal
 * Customer: login + signup (self-registration allowed)
 * Vet/Admin: login only (accounts are provisioned)
 */
function getPublicRoutes(portal: Portal): string[] {
  const prefix = getPortalPrefix(portal);
  switch (portal) {
    case 'customer':
      return [`${prefix}/login`, `${prefix}/signup`, `${prefix}/auth/callback`];
    case 'vet':
      return [`${prefix}/login`, `${prefix}/auth/callback`];
    case 'admin':
      return [`${prefix}/login`, `${prefix}/auth/callback`];
    default:
      return [`${prefix}/login`];
  }
}

/**
 * Get the internal URL prefix for each portal
 */
function getPortalPrefix(portal: Portal): string {
  switch (portal) {
    case 'customer':
      return '/customer-portal';
    case 'vet':
      return '/vet-portal';
    case 'admin':
      return '/admin-portal';
    default:
      return '/customer-portal';
  }
}

/**
 * Check if a user role is allowed on a specific portal
 * Each portal only allows its corresponding role (no cross-portal access)
 */
function isRoleAllowedOnPortal(role: string, portal: Portal): boolean {
  switch (portal) {
    case 'customer':
      return role === 'customer';
    case 'vet':
      return role === 'vet';
    case 'admin':
      return role === 'admin';
    default:
      return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public legal content — bypass auth entirely. Per audit F-16.
  // Match both the bare path (e.g. /terms on app.furrie.in) and the
  // rewritten internal path (/customer-portal/terms).
  if (
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/customer-portal/terms' ||
    pathname === '/customer-portal/privacy'
  ) {
    return NextResponse.next();
  }

  // Static manifest files + robots.txt — bypass auth entirely.
  // `.well-known/apple-app-site-association` has no file extension, so
  // the matcher doesn't exclude it; iOS would otherwise get a 307 → /login.
  // `/robots.txt` has the same root cause (matcher excludes .json/.svg/etc
  // but not .txt). Both must be publicly fetchable by external crawlers.
  if (pathname.startsWith('/.well-known/') || pathname === '/robots.txt') {
    return NextResponse.next();
  }

  const portal = getPortal(request);
  const prefix = getPortalPrefix(portal);

  // Update Supabase auth session
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Get public routes for this portal
  const publicRoutes = getPublicRoutes(portal);

  // Check if current route is public (handle both rewritten and original paths)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${prefix}/auth/`)
  ) || pathname === '/login' || pathname === '/signup';

  // Root path handling - redirect to login or dashboard
  if (pathname === '/' || pathname === prefix || pathname === `${prefix}/`) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // User is logged in, redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname.replace(prefix, ''));
    return NextResponse.redirect(url);
  }

  // If user exists, check role-based access
  if (user) {
    // Read the role from profiles, which is the source of truth.
    //
    // This used to prefer a copy cached in app_metadata, written back
    // fire-and-forget on a miss, to avoid a ~400ms cross-region query while
    // functions ran in iad1. In bom1 that query is single-digit milliseconds,
    // so the cache had come to cost more than it saved: every request by a
    // user without the cached value paid an admin API write on top of the
    // query, and in a serverless function un-awaited work can be frozen before
    // it completes — so for a new user it might never land at all.
    //
    // It was also wrong in a way that locked people out. Nothing invalidated
    // the cached value, so promoting a customer to vet left app_metadata
    // saying 'customer' forever: their own portal refused them with
    // wrong_account, and editing profiles.role did not help because the stale
    // copy won. Reading the table every time is less code and always correct.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Middleware: failed to fetch profile for user', user.id, profileError);
      return supabaseResponse;
    }

    const userRole = profile?.role || 'customer';

    // Check if user's role matches the portal they're accessing
    if (!isRoleAllowedOnPortal(userRole, portal)) {
      // User is on wrong portal - clear session by redirecting to login with error
      // The error parameter lets the login page show an appropriate message
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'wrong_account');

      // Create a response that clears the auth cookies
      const response = NextResponse.redirect(url);

      // Delete all Supabase auth cookies to force re-login.
      // Dynamically match sb-* patterns including chunked variants (.0, .1, etc.)
      const allCookies = request.cookies.getAll();
      for (const cookie of allCookies) {
        if (
          cookie.name === 'sb-access-token' ||
          cookie.name === 'sb-refresh-token' ||
          cookie.name.match(/^sb-.*-auth-token/)
        ) {
          response.cookies.delete(cookie.name);
        }
      }

      return response;
    }

    // If authenticated user tries to access login/signup, redirect to dashboard
    if (isPublicRoute && !pathname.includes('/auth/callback')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|woff|ttf|otf|eot|ico|json)$|api).*)',
  ],
};
