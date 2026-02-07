'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from '@/components/customer/OTPInput';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import styles from './VetLoginForm.module.css';

type Step = 'email' | 'otp';

const RESEND_COOLDOWN = 60; // seconds

export function VetLoginForm() {
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
    if (code.length !== 6) return;

    setIsSubmitting(true);
    setOtpError('');

    const { error } = await verifyOtp(email, code);

    if (error) {
      setIsSubmitting(false);
      setOtpError(t('invalidOtp'));
      setOtp(''); // Clear OTP on error
      return;
    }

    // Verify the user has vet role
    const supabase = createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', email)
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
          disabled={otp.length !== 6}
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
        <h1 className={styles.title}>{t('login')}</h1>
        <p className={styles.subtitle}>
          Enter your registered email to receive a verification code
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
          {t('sendOtp')}
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
