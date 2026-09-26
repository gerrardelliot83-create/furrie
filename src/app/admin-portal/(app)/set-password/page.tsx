import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { SetPasswordForm } from '@/components/vet/SetPasswordForm';

export const metadata: Metadata = {
  title: 'Set your password - Admin',
};

/**
 * Where an admin's set-password link lands (A-12): the link signs them in
 * with a recovery session, and this page sets a new password without the old
 * one (supabase.auth.updateUser). Settings' "change password" needs the
 * current password; this page is for when it has been forgotten.
 */
export default async function AdminSetPasswordPage() {
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=wrong_account');
  }

  return (
    <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>Set your password</h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-1)',
          }}
        >
          You will use it with {user.email ?? 'your email address'} to sign in at admin.furrie.in.
        </p>
      </div>
      <div style={{ padding: 'var(--space-6)', background: 'var(--color-bg-primary, #fff)', borderRadius: 'var(--radius-lg, 12px)' }}>
        <SetPasswordForm />
      </div>
    </div>
  );
}
