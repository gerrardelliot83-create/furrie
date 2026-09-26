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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || profile.is_active === false) {
    redirect('/login?error=wrong_account');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
