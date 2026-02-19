'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from './OTPInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import styles from './AuthForm.module.css';

type Step = 'email' | 'otp';

const RESEND_COOLDOWN = 60; // seconds
const RATE_LIMIT_COOLDOWN = 300; // 5 minutes when rate limited
const COOLDOWN_STORAGE_KEY = 'furrie_otp_cooldown_until';

export function AuthForm() {
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
  // Initialize cooldown from localStorage (persists across refresh)
  const [resendTimer, setResendTimer] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const storedCooldownUntil = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (storedCooldownUntil) {
      const cooldownUntil = parseInt(storedCooldownUntil, 10);
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        return remainingSeconds;
      }
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    }
    return 0;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifiedRef = useRef(false);

  // Check for error param (e.g., wrong account type)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'wrong_account') {
      toast(t('wrongAccount'), 'error');
    } else if (errorParam) {
      toast(errorParam, 'error');
    }
  }, [searchParams, toast, t]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Clear storage when cooldown expires
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    }
  }, [resendTimer]);

  // Clear auth error when inputs change
  useEffect(() => {
    if (authError) {
      clearError();
    }
  }, [email, otp, authError, clearError]);

  // Helper to set cooldown with localStorage persistence
  const setCooldown = (seconds: number) => {
    setResendTimer(seconds);
    const cooldownUntil = Date.now() + seconds * 1000;
    localStorage.setItem(COOLDOWN_STORAGE_KEY, cooldownUntil.toString());
  };

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
    const { error, isRateLimited } = await signInWithOtp(email);
    setIsSubmitting(false);

    if (error) {
      // Apply extended cooldown when rate limited
      if (isRateLimited) {
        setCooldown(RATE_LIMIT_COOLDOWN);
        toast(t('rateLimited'), 'error');
      } else {
        toast(error, 'error');
      }
      return;
    }

    setStep('otp');
    setCooldown(RESEND_COOLDOWN);
    toast(t('otpSent'), 'success');
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 8 || verifiedRef.current) return;

    setIsSubmitting(true);
    setOtpError('');

    const { error } = await verifyOtp(email, code);

    if (error) {
      setIsSubmitting(false);
      setOtpError(t('invalidOtp'));
      setOtp(''); // Clear OTP on error
      return;
    }

    // Mark as verified to prevent double submission.
    // Keep isSubmitting=true so the button stays disabled until navigation completes.
    verifiedRef.current = true;
    toast(t('welcomeBack'), 'success');

    // Send welcome email for new signups (non-blocking, endpoint is idempotent)
    fetch('/api/email/welcome', { method: 'POST' }).catch(() => {});

    // Refresh server state so middleware sees the freshly-set auth cookies,
    // then navigate smoothly without a full page reload.
    router.refresh();
    router.push('/dashboard');
  }, [email, verifyOtp, router, toast, t]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setIsSubmitting(true);
    const { error, isRateLimited } = await signInWithOtp(email);
    setIsSubmitting(false);

    if (error) {
      // Apply extended cooldown when rate limited
      if (isRateLimited) {
        setCooldown(RATE_LIMIT_COOLDOWN);
        toast(t('rateLimited'), 'error');
      } else {
        toast(error, 'error');
      }
      return;
    }

    setCooldown(RESEND_COOLDOWN);
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
          {t('useDifferentEmail')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('welcomeToFurrie')}</h1>
        <p className={styles.subtitle}>
          {t('enterEmailToContinue')}
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
          {t('continueWithEmail')}
        </Button>
      </form>

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
