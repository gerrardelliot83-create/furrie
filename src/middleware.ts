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
    // Fetch user profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

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

      // Delete Supabase auth cookies to force re-login
      // Cookie names based on Supabase SSR patterns
      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
      ];

      cookiesToClear.forEach(cookieName => {
        response.cookies.delete(cookieName);
      });

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
