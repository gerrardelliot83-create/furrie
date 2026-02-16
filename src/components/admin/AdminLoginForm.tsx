'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import styles from './AdminLoginForm.module.css';

export function AdminLoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signIn, loading, error: authError, clearError } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for error param
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

  const validateForm = (): boolean => {
    let isValid = true;

    if (!email.trim()) {
      setEmailError(t('required'));
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError(t('invalidEmail'));
        isValid = false;
      } else {
        setEmailError('');
      }
    }

    if (!password) {
      setPasswordError(t('required'));
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      toast(error, 'error');
      return;
    }

    // Successful login - redirect to admin dashboard
    toast(t('welcomeBack'), 'success');
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.portalBadge}>
        <span className={styles.portalText}>{t('adminLoginTitle')}</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>{t('login')}</h1>
        <p className={styles.subtitle}>{t('adminLoginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          name="email"
          type="email"
          label={t('email')}
          placeholder={t('adminEmailPlaceholder')}
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

      <div className={styles.infoBox}>
        <p className={styles.infoText}>
          {t('adminAccountsProvisioned')}
        </p>
      </div>
    </div>
  );
}
