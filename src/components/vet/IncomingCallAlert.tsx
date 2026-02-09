'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import styles from './IncomingCallAlert.module.css';

interface IncomingCallAlertProps {
  consultationId: string;
  customerName: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  concern: string;
  symptoms?: string[];
  onAccept: () => void;
  onTimeout?: () => void;
  timeoutSeconds?: number;
  className?: string;
  /** External loading state from parent (e.g., during API call) */
  isAccepting?: boolean;
}

export function IncomingCallAlert({
  consultationId,
  customerName,
  petName,
  petSpecies,
  petBreed,
  concern,
  symptoms = [],
  onAccept,
  onTimeout,
  timeoutSeconds = 30,
  className,
  isAccepting: externalIsAccepting,
}: IncomingCallAlertProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(timeoutSeconds);
  const [internalIsAccepting, setInternalIsAccepting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use external state if provided, otherwise use internal state
  const isAccepting = externalIsAccepting ?? internalIsAccepting;

  // Play ringtone using pre-unlocked AudioContext if available
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;
    let ownsAudioContext = false;

    const playRingtone = async () => {
      try {
        // Try to use pre-unlocked AudioContext from VetLayout
        if (typeof window !== 'undefined' && window.__furrie_audio_context && window.__furrie_audio_unlocked) {
          audioContext = window.__furrie_audio_context;
        } else {
          // Fallback: create new AudioContext (may be suspended)
          const AudioContextClass = window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContext = new AudioContextClass();
          ownsAudioContext = true;

          if (audioContext.state === 'suspended') {
            try {
              await audioContext.resume();
            } catch {
              console.warn('AudioContext could not be resumed - ringtone silent until user interaction');
              return;
            }
          }
        }

        if (isCleanedUp || !audioContext || audioContext.state !== 'running') return;

        const playTone = () => {
          if (isCleanedUp || !audioContext || audioContext.state !== 'running') return;

          try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 440; // A4 note
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (error) {
            console.warn('Failed to play tone:', error);
          }
        };

        playTone();
        intervalId = setInterval(playTone, 2000);
      } catch (error) {
        console.warn('Failed to initialize ringtone:', error);
      }
    };

    playRingtone();

    return () => {
      isCleanedUp = true;
      if (intervalId) clearInterval(intervalId);
      // Only close AudioContext if we created it (not the shared one)
      if (ownsAudioContext && audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTimeout]);

  // Request notification permission and show browser notification
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Incoming Consultation', {
        body: `${customerName} needs help with ${petName} (${petSpecies})`,
        icon: '/favicon.ico',
        tag: `consultation-${consultationId}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return () => notification.close();
    }
  }, [consultationId, customerName, petName, petSpecies]);

  const handleAccept = useCallback(() => {
    setInternalIsAccepting(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onAccept();
  }, [onAccept]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className={cn(styles.overlay, className)}>
      <div className={styles.container}>
        {/* Pulsing ring animation */}
        <div className={styles.ringContainer}>
          <div className={styles.ring} />
          <div className={styles.ring} style={{ animationDelay: '0.5s' }} />
          <div className={styles.ring} style={{ animationDelay: '1s' }} />
          <div className={styles.iconWrapper}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>

        <h1 className={styles.title}>Incoming Consultation</h1>

        {/* Patient info */}
        <div className={styles.patientInfo}>
          <div className={styles.patientHeader}>
            <div className={styles.petIcon}>
              {petSpecies === 'dog' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.344-2.5" />
                  <path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75z" />
                  <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5c-1.5-2-4.5-2-6 0-1.667 2.222-1.667 5.778 0 8l6 8 6-8c1.667-2.222 1.667-5.778 0-8-1.5-2-4.5-2-6 0z" />
                  <circle cx="9" cy="10" r="1" />
                  <circle cx="15" cy="10" r="1" />
                  <path d="M10 14h4" />
                </svg>
              )}
            </div>
            <div className={styles.petDetails}>
              <h2 className={styles.petName}>{petName}</h2>
              <p className={styles.petBreed}>{petBreed} ({petSpecies})</p>
            </div>
          </div>

          <div className={styles.customerName}>
            <span className={styles.label}>Pet Parent:</span>
            <span className={styles.value}>{customerName}</span>
          </div>

          <div className={styles.concern}>
            <span className={styles.label}>Concern:</span>
            <p className={styles.concernText}>{concern || 'General consultation'}</p>
          </div>

          {symptoms.length > 0 && (
            <div className={styles.symptoms}>
              <span className={styles.label}>Symptoms:</span>
              <div className={styles.symptomTags}>
                {symptoms.map((symptom) => (
                  <span key={symptom} className={styles.symptomTag}>
                    {symptom.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className={styles.timer}>
          <span className={styles.timerLabel}>Auto-reassign in:</span>
          <span className={styles.timerValue}>{remainingSeconds}s</span>
        </div>

        {/* Accept button */}
        <div className={styles.actions}>
          <Button
            variant="accent"
            size="lg"
            fullWidth
            onClick={handleAccept}
            loading={isAccepting}
            disabled={isAccepting}
          >
            {isAccepting ? 'Connecting...' : 'Accept Consultation'}
          </Button>
        </div>

        <p className={styles.note}>
          You cannot decline. If you don&apos;t accept, the consultation will be reassigned to another vet.
        </p>
      </div>
    </div>
  );
}
