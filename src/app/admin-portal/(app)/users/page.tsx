import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { UsersManagement } from './UsersManagement';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('users')}`,
  };
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Fetch all customers with pet info
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      is_active,
      created_at,
      pets (id, name)
    `)
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  // Fetch active subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('customer_id, status')
    .eq('status', 'active');

  const activeSubscriptionIds = new Set(
    (subscriptions || []).map((s) => s.customer_id)
  );

  const enrichedUsers = (users || []).map((u) => ({
    ...u,
    petCount: Array.isArray(u.pets) ? u.pets.length : 0,
    hasActiveSubscription: activeSubscriptionIds.has(u.id),
  }));

  return <UsersManagement initialUsers={enrichedUsers} />;
}
