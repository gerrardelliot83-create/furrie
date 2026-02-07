'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import styles from './MatchingScreen.module.css';

interface MatchingScreenProps {
  petName: string;
  onCancel: () => void;
  consultationId?: string;
  className?: string;
}

export function MatchingScreen({
  petName,
  onCancel,
  className,
}: MatchingScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.content}>
        {/* Animated dots */}
        <div className={styles.animation}>
          <div className={styles.dots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        </div>

        <h2 className={styles.title}>Finding a vet for {petName}...</h2>
        <p className={styles.subtitle}>
          We&apos;re connecting you with an available veterinarian. This usually
          takes less than 2 minutes.
        </p>

        <div className={styles.timer}>
          <span className={styles.timerLabel}>Waiting:</span>
          <span className={styles.timerValue}>{formatTime(elapsedSeconds)}</span>
        </div>

        <div className={styles.tips}>
          <p className={styles.tipTitle}>While you wait:</p>
          <ul className={styles.tipList}>
            <li>Make sure you&apos;re in a quiet area with good lighting</li>
            <li>Have your pet nearby and ready to show on camera</li>
            <li>Check that your device&apos;s camera and microphone are working</li>
          </ul>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel Request
        </Button>
      </div>
    </div>
  );
}
