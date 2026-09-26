'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import styles from './SetPasswordForm.module.css';

const MIN_LENGTH = 8;

/**
 * Set or change the signed-in vet's password (C-04, P0-2). Reached from the
 * welcome / reset email link (via /auth/callback?…&next=/set-password) or
 * from Profile → Change password.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      const code = (updateError as { code?: string }).code ?? '';
      if (code === 'same_password') {
        setError('Choose a password different from your current one.');
      } else if (code === 'reauthentication_needed' || /reauth/i.test(updateError.message)) {
        setError(
          'For your security, sign out, choose “Forgot your password?” on the login page, and set your password from the link we email you.'
        );
      } else if (code === 'weak_password') {
        setError(updateError.message || 'That password is too weak. Try a longer one.');
      } else {
        setError('Your password could not be saved. Please try again.');
      }
      return;
    }

    toast('Password saved', 'success');
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <Input
        name="new-password"
        type="password"
        label="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        helperText={`At least ${MIN_LENGTH} characters.`}
        disabled={saving}
        autoFocus
      />
      <Input
        name="confirm-password"
        type="password"
        label="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        disabled={saving}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" loading={saving} fullWidth>
        Save password
      </Button>
    </form>
  );
}
