'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { emitVetAvailabilityChanged } from '@/components/layouts/VetLayout/vetEvents';
import styles from './VetStatusToggle.module.css';

interface VetStatusToggleProps {
  initialStatus: boolean;
}

export function VetStatusToggle({ initialStatus }: VetStatusToggleProps) {
  const t = useTranslations('status');
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    const newStatus = !isAvailable;

    // Server route: role check, then a service-role write (C-06).
    let ok = false;
    try {
      const response = await fetch('/api/vet/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      });
      ok = response.ok;
    } catch (error) {
      console.error('Error updating availability:', error);
    }

    setIsUpdating(false);

    if (!ok) {
      toast('Failed to update availability', 'error');
      return;
    }

    setIsAvailable(newStatus);
    emitVetAvailabilityChanged(newStatus);
    toast(newStatus ? 'You are now available' : 'You are now unavailable', 'success');
  }, [isAvailable, isUpdating, toast]);

  return (
    <div className={styles.container}>
      <span className={styles.label}>
        {isAvailable ? t('available') : t('unavailable')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        onClick={handleToggle}
        disabled={isUpdating}
        className={`${styles.toggle} ${isAvailable ? styles.active : ''}`}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}
