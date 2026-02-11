'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import styles from './CancelConsultationButton.module.css';

interface CancelConsultationButtonProps {
  consultationId: string;
}

export function CancelConsultationButton({
  consultationId,
}: CancelConsultationButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel consultation');
      }

      // Refresh the page to show updated status
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
        onClick={() => setShowConfirm(true)}
        fullWidth
      >
        Cancel Consultation
      </Button>
    </div>
  );
}
