import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/supabase/getCurrentUser';
import { Card, CardContent } from '@/components/ui/Card';
import { SetPasswordForm } from '@/components/vet/SetPasswordForm';

export const metadata: Metadata = {
  title: 'Set your password - Vet Portal',
};

export default async function VetSetPasswordPage() {
  const { user, error: authError, supabase } = await getCurrentUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'vet') {
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
          You will use it with {user.email ?? 'your email address'} to sign in at vet.furrie.in.
        </p>
      </div>
      <Card>
        <CardContent>
          <SetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
