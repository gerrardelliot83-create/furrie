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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Check for error param (e.g., wrong account type)
  // Delay toast slightly to ensure the Toast portal is mounted after Suspense hydration
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const timer = setTimeout(() => {
        if (errorParam === 'wrong_account') {
          toast(t('wrongAccount'), 'error');
        } else {
          toast(errorParam, 'error');
        }
      }, 150);
      return () => clearTimeout(timer);
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
      setEmailError(t('invalidEmail'));
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
      setPasswordError(t('passwordTooShort'));
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
      toast(t('invalidCredentials'), 'error');
      return;
    }

    // Client-side role check is a UX optimization to show an immediate error message.
    // The middleware is the authoritative gate — it verifies the role server-side
    // and redirects with cookie clearing if the user is on the wrong portal.
    const supabase = createClient();

    // Get the authenticated user's ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      toast(t('authFailed'), 'error');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsSubmitting(false);

    if (profileError || !profile) {
      toast(t('accountNotFound'), 'error');
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
    toast(t('welcome'), 'success');
    router.push('/dashboard');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError('Enter your email address first');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(t('invalidEmail'));
      return;
    }

    setForgotLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setForgotLoading(false);

    if (resetError) {
      toast('Failed to send reset email. Please try again.', 'error');
    } else {
      toast('Password reset email sent. Check your inbox.', 'success');
      setShowForgotPassword(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('login')}</h1>
        <p className={styles.subtitle}>
          {t('vetLoginSubtitle')}
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
          label={t('password')}
          placeholder={t('passwordPlaceholder')}
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

      <div className={styles.forgotPassword}>
        {showForgotPassword ? (
          <div className={styles.forgotPasswordForm}>
            <p className={styles.forgotPasswordText}>
              Enter your email above, then click the button below to receive a password reset link.
            </p>
            <Button
              type="button"
              variant="secondary"
              loading={forgotLoading}
              onClick={handleForgotPassword}
              fullWidth
            >
              Send Reset Link
            </Button>
            <button
              type="button"
              className={styles.forgotPasswordLink}
              onClick={() => setShowForgotPassword(false)}
            >
              Back to login
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.forgotPasswordLink}
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot your password?
          </button>
        )}
      </div>

      <div className={styles.notice}>
        <p className={styles.noticeText}>
          {t('vetAccountsProvisioned')}
          <br />
          {t('contactSupport')}
        </p>
      </div>
    </div>
  );
}
