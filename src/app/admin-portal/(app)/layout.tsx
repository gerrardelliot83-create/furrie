import { redirect } from 'next/navigation';

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { getCurrentUser } from '@/lib/supabase/getCurrentUser';

/**
 * Server-side guard for every admin page (D-05). The middleware already checks
 * the role per host, but a host without the portal rewrites (the deployment's
 * *.vercel.app address) reaches /admin-portal/* paths directly; this check
 * holds there too. Admin data itself is protected by RLS and verifyAdmin().
 */
export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  // A database error shows the portal's error page ("Try again"), not a wrong
  // reason on the login page.
  if (error) throw new Error(`Admin layout: could not read the profile (${error.code})`);
  if (!profile) redirect('/login?error=no_profile');
  if (profile.is_active === false) redirect('/login?error=account_disabled');
  if (profile.role !== 'admin') redirect('/login?error=wrong_account');

  return <AdminLayout>{children}</AdminLayout>;
}
