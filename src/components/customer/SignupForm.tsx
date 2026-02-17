'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from './OTPInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import styles from './LoginForm.module.css';

type Step = 'email' | 'otp';

const RESEND_COOLDOWN = 60; // seconds

export function SignupForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signInWithOtp, verifyOtp, loading, error: authError, clearError } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for error param
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      toast(errorParam, 'error');
    }
  }, [searchParams, toast]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Clear auth error when inputs change
  useEffect(() => {
    if (authError) {
      clearError();
    }
  }, [email, otp, authError, clearError]);

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    const { error } = await signInWithOtp(email);
    setIsSubmitting(false);

    if (error) {
      toast(error, 'error');
      return;
    }

    setStep('otp');
    setResendTimer(RESEND_COOLDOWN);
    toast(t('otpSent'), 'success');
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 8) return;

    setIsSubmitting(true);
    setOtpError('');

    const { error } = await verifyOtp(email, code);
    setIsSubmitting(false);

    if (error) {
      setOtpError(t('invalidOtp'));
      setOtp(''); // Clear OTP on error
      return;
    }

    // Successful signup - redirect to dashboard (profile will be created by trigger)
    toast('Welcome to Furrie!', 'success');

    // Send welcome email — must await so router.push doesn't cancel the request
    try {
      await fetch('/api/email/welcome', { method: 'POST' });
    } catch {
      // Silent — welcome email is non-critical
    }

    router.push('/dashboard');
  }, [email, verifyOtp, router, toast, t]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setIsSubmitting(true);
    const { error } = await signInWithOtp(email);
    setIsSubmitting(false);

    if (error) {
      toast(error, 'error');
      return;
    }

    setResendTimer(RESEND_COOLDOWN);
    setOtp(''); // Clear any existing OTP
    setOtpError('');
    toast(t('otpSent'), 'success');
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setOtpError('');
  };

  if (step === 'otp') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('verifyOtp')}</h1>
          <p className={styles.subtitle}>
            {t('otpSent')}
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        <div className={styles.otpContainer}>
          <OTPInput
            length={8}
            value={otp}
            onChange={setOtp}
            onComplete={handleVerifyOtp}
            error={!!otpError}
            disabled={isSubmitting || loading}
          />
          {otpError && <p className={styles.errorText}>{otpError}</p>}
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => handleVerifyOtp(otp)}
          loading={isSubmitting || loading}
          disabled={otp.length !== 8}
          fullWidth
        >
          {t('verifyOtp')}
        </Button>

        <div className={styles.resendContainer}>
          {resendTimer > 0 ? (
            <p className={styles.resendTimer}>
              {t('resendIn', { seconds: resendTimer })}
            </p>
          ) : (
            <button
              type="button"
              className={styles.resendButton}
              onClick={handleResendOtp}
              disabled={isSubmitting || loading}
            >
              {t('resendOtp')}
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.backButton}
          onClick={handleBackToEmail}
        >
          Use different email
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('createAccount')}</h1>
        <p className={styles.subtitle}>
          Enter your email to get started
        </p>
      </div>

      <form onSubmit={handleSendOtp} className={styles.form}>
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

        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting || loading}
          fullWidth
        >
          {t('signup')}
        </Button>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          {t('haveAccount')}{' '}
          <Link href="/login" className={styles.footerLink}>
            {t('login')}
          </Link>
        </p>
      </div>

      <p className={styles.terms}>
        {t('termsAgree')}{' '}
        <Link href="/terms" className={styles.termsLink}>
          {t('termsOfService')}
        </Link>{' '}
        &{' '}
        <Link href="/privacy" className={styles.termsLink}>
          {t('privacyPolicy')}
        </Link>
      </p>
    </div>
  );
}
