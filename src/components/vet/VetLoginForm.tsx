'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import styles from './VetLoginForm.module.css';

export function VetLoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signInWithPassword, loading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for error param (e.g., wrong account type)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'wrong_account') {
      toast(t('wrongAccount'), 'error');
    } else if (errorParam) {
      toast(errorParam, 'error');
    }
  }, [searchParams, toast, t]);

  // Clear auth error when inputs change
  useEffect(() => {
    if (authError) {
      clearError();
    }
  }, [email, password, authError, clearError]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('required') || 'This field is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value.trim()) {
      setPasswordError(t('required') || 'This field is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    setIsSubmitting(true);
    const { error } = await signInWithPassword(email, password);

    if (error) {
      setIsSubmitting(false);
      toast('Invalid email or password', 'error');
      return;
    }

    // Verify the user has vet role
    const supabase = createClient();

    // Get the authenticated user's ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      toast('Authentication failed. Please try again.', 'error');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsSubmitting(false);

    if (profileError || !profile) {
      toast('Account not found. Please contact support.', 'error');
      await supabase.auth.signOut();
      return;
    }

    if (profile.role !== 'vet') {
      toast(t('wrongAccount'), 'error');
      await supabase.auth.signOut();
      router.push('/login?error=wrong_account');
      return;
    }

    // Successful vet login
    toast('Welcome!', 'success');
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('login')}</h1>
        <p className={styles.subtitle}>
          Enter your credentials to access the vet portal
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          name="email"
          type="email"
          label={t('email')}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          autoComplete="email"
          autoFocus
          disabled={isSubmitting || loading}
        />

        <Input
          name="password"
          type="password"
          label={t('password') || 'Password'}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          autoComplete="current-password"
          disabled={isSubmitting || loading}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting || loading}
          fullWidth
        >
          {t('login')}
        </Button>
      </form>

      <div className={styles.notice}>
        <p className={styles.noticeText}>
          Vet accounts are provisioned by administrators.
          <br />
          Contact support if you need access.
        </p>
      </div>
    </div>
  );
}
