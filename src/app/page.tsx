import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // With subdomain routing, all portals use /dashboard
    // The middleware ensures users are on the correct portal for their role
    redirect('/dashboard');
  }

  // Not logged in, redirect to login
  redirect('/login');
}
