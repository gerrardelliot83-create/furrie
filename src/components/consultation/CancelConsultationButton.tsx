'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cancelCreditNotice, cancelReturnsCredit, cancelledMessage } from '@/lib/credits/cancelCredit';
import styles from './CancelConsultationButton.module.css';

interface CancelConsultationButtonProps {
  consultationId: string;
  /** Start time, for the credit-back rule (more than 5 minutes ahead). */
  scheduledAt: string | null;
  /** True when this booking took a consultation credit (see bookingUsesCredit). */
  usesCredit: boolean;
}

export function CancelConsultationButton({
  consultationId,
  scheduledAt,
  usesCredit,
}: CancelConsultationButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read when the dialog opens, so the line doesn't change under the reader.
  const [creditNotice, setCreditNotice] = useState<string | null>(null);

  const openConfirm = () => {
    setCreditNotice(cancelCreditNotice({ usesCredit, scheduledAt }));
    setShowConfirm(true);
  };

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    const returnExpected = cancelReturnsCredit(scheduledAt);

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel consultation');
      }

      // Say whether the credit came back (CX-1: the answer was ignored).
      toast(
        cancelledMessage({ creditReturned: data.creditReturned === true, usesCredit, returnExpected }),
        data.creditReturned === true || !usesCredit || !returnExpected ? 'success' : 'warning',
        7000
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className={styles.container}>
        <p className={styles.confirmText}>
          Are you sure you want to cancel this consultation?
        </p>
        {creditNotice && <p className={styles.confirmText}>{creditNotice}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            No, keep it
          </Button>
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? 'Cancelling...' : 'Yes, cancel'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Button
        variant="ghost"
        onClick={openConfirm}
        fullWidth
      >
        Cancel Consultation
      </Button>
    </div>
  );
}
