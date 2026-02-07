'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import styles from './VetStatusToggle.module.css';

interface VetStatusToggleProps {
  vetId: string;
  initialStatus: boolean;
}

export function VetStatusToggle({ vetId, initialStatus }: VetStatusToggleProps) {
  const t = useTranslations('status');
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    const newStatus = !isAvailable;

    const supabase = createClient();
    const { error } = await supabase
      .from('vet_profiles')
      .update({ is_available: newStatus, updated_at: new Date().toISOString() })
      .eq('id', vetId);

    setIsUpdating(false);

    if (error) {
      console.error('Error updating availability:', error);
      toast('Failed to update availability', 'error');
      return;
    }

    setIsAvailable(newStatus);
    toast(newStatus ? 'You are now available' : 'You are now unavailable', 'success');
  }, [vetId, isAvailable, isUpdating, toast]);

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
