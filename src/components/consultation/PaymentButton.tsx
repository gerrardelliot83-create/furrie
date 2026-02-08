'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import styles from './PaymentButton.module.css';

interface PaymentButtonProps {
  consultationId: string;
  amount: number;
  currency?: string;
  onPaymentComplete?: (orderId: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

const DEV_MODE = process.env.NEXT_PUBLIC_SKIP_PAYMENTS === 'true';

export function PaymentButton({
  consultationId,
  amount,
  currency = 'INR',
  onPaymentComplete,
  onSkip,
  disabled = false,
}: PaymentButtonProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId,
          amount,
          currency,
          description: `Consultation payment - ${consultationId}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // In dev mode with payment bypass, go directly to next step
      if (data.devMode) {
        toast('Payment bypassed (dev mode)', 'success');
        onPaymentComplete?.(data.orderId);
        return;
      }

      // In production, redirect to payment gateway
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // No redirect URL - payment gateway not configured
        toast('Payment gateway not configured', 'error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast(error instanceof Error ? error.message : 'Payment failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <div className={styles.container}>
      <div className={styles.priceDisplay}>
        <span className={styles.priceLabel}>Consultation Fee</span>
        <span className={styles.priceAmount}>{formatAmount(amount)}</span>
      </div>

      <Button
        variant="primary"
        onClick={handlePayment}
        loading={isProcessing}
        disabled={disabled || isProcessing}
        fullWidth
      >
        {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount)}`}
      </Button>

      {DEV_MODE && (
        <button
          type="button"
          className={styles.skipButton}
          onClick={handleSkip}
          disabled={isProcessing}
        >
          Skip Payment (Dev Only)
        </button>
      )}

      <p className={styles.secureNote}>
        Secure payment powered by Furrie
      </p>
    </div>
  );
}
