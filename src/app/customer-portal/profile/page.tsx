import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';
import { ProfileContent } from './ProfileContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');
  return {
    title: t('myProfile'),
  };
}

export default async function ProfilePage() {
  const t = await getTranslations('profile');
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    redirect('/login');
  }

  // Map to User type
  const profile: User = {
    id: profileData.id,
    role: profileData.role as User['role'],
    fullName: profileData.full_name,
    email: profileData.email,
    phone: profileData.phone,
    avatarUrl: profileData.avatar_url,
    isActive: profileData.is_active ?? true,
    createdAt: profileData.created_at ?? '',
    updatedAt: profileData.updated_at ?? '',
  };

  // Check for active subscription (any pet with active Plus subscription)
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('customer_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const hasActiveSubscription = (subscriptionData?.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{
        margin: 0,
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 600,
        color: 'var(--color-text-primary)'
      }}>
        {t('myProfile')}
      </h1>

      <ProfileContent
        profile={profile}
        hasActiveSubscription={hasActiveSubscription}
      />
    </div>
  );
}
