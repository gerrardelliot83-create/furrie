/**
 * @deprecated This component is DEPRECATED as of Feb 2026.
 * The instant matching flow has been replaced with a scheduling-based system.
 * Use TimeSlotSelector for time selection and BookingConfirmation for success screen.
 * This file is kept for backwards compatibility during transition.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import styles from './MatchingScreen.module.css';

type MatchStatus = 'initiating' | 'matching' | 'matched' | 'no_vet' | 'error';

interface MatchingScreenProps {
  petName: string;
  onCancel: () => void;
  consultationId?: string;
  className?: string;
}

interface MatchResponse {
  matched: boolean;
  reason?: string;
  message?: string;
  vet?: {
    id: string;
    name: string;
    rating: number | null;
  };
  room?: {
    url: string;
    name: string;
  };
  error?: string;
  details?: string;
  code?: string;
}

const MATCHING_TIMEOUT_SECONDS = 120; // 2 minutes

export function MatchingScreen({
  petName,
  onCancel,
  consultationId,
  className,
}: MatchingScreenProps) {
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('initiating');
  const [vetName, setVetName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasInitiated = useRef(false);

  // Timer countdown with timeout handling
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newValue = prev + 1;
        // Check timeout inside the state updater to avoid separate effect
        if (newValue >= MATCHING_TIMEOUT_SECONDS && matchStatus === 'matching') {
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            setMatchStatus('no_vet');
            setErrorMessage('No veterinarians available at this time. Please try again later.');
          }, 0);
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchStatus]);

  // Call match API on mount
  useEffect(() => {
    if (!consultationId || hasInitiated.current) return;
    hasInitiated.current = true;

    const initiateMatch = async () => {
      setMatchStatus('matching');

      try {
        const response = await fetch('/api/consultations/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId }),
        });

        const data: MatchResponse = await response.json();

        if (!response.ok) {
          // Log detailed error for debugging
          console.error('Match API error:', {
            status: response.status,
            code: data.code,
            error: data.error,
            details: data.details,
          });

          // Handle API errors
          if (data.code === 'INVALID_STATUS') {
            // Consultation might already be matched or in different state
            // Try to fetch current status
            const statusResponse = await fetch(`/api/consultations/${consultationId}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.consultation?.status === 'matched') {
                setMatchStatus('matched');
                setVetName(statusData.consultation.vet?.fullName || 'a veterinarian');
                setTimeout(() => {
                  router.push(`/consultations/${consultationId}/room`);
                }, 1500);
                return;
              }
            }
          }

          // Show detailed error if available
          const errorMsg = data.details
            ? `${data.error}: ${data.details}`
            : data.error || 'Failed to find a veterinarian';

          setMatchStatus('error');
          setErrorMessage(errorMsg);
          return;
        }

        if (data.matched && data.vet) {
          setMatchStatus('matched');
          setVetName(data.vet.name);
          // Redirect to video room after showing success message
          setTimeout(() => {
            router.push(`/consultations/${consultationId}/room`);
          }, 2000);
        } else if (data.reason === 'no_vet_available') {
          setMatchStatus('no_vet');
          setErrorMessage(data.message || 'No veterinarians are currently available.');
        } else {
          setMatchStatus('error');
          setErrorMessage('Unexpected response from server');
        }
      } catch (error) {
        console.error('Match error:', error);
        setMatchStatus('error');
        setErrorMessage('Network error. Please check your connection and try again.');
      }
    };

    initiateMatch();
  }, [consultationId, router]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Matched state - show success and redirect
  if (matchStatus === 'matched') {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.content}>
          <div className={styles.animation}>
            <div className={styles.successIcon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>

          <h2 className={styles.title}>Vet Found!</h2>
          <p className={styles.subtitle}>
            {vetName ? `${vetName} will join your consultation shortly.` : 'A veterinarian will join shortly.'}
          </p>
          <p className={styles.connectingText}>Connecting to video call...</p>
        </div>
      </div>
    );
  }

  // No vet available state
  if (matchStatus === 'no_vet') {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.content}>
          <div className={styles.animation}>
            <div className={styles.errorIcon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          <h2 className={styles.title}>No Vets Available</h2>
          <p className={styles.subtitle}>
            {errorMessage || 'All veterinarians are currently busy. Please try again in a few minutes.'}
          </p>

          <div className={styles.actions}>
            <Button variant="primary" onClick={onCancel} fullWidth>
              Try Again Later
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (matchStatus === 'error') {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.content}>
          <div className={styles.animation}>
            <div className={styles.errorIcon}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          </div>

          <h2 className={styles.title}>Something Went Wrong</h2>
          <p className={styles.subtitle}>
            {errorMessage || 'We encountered an error while finding a veterinarian.'}
          </p>

          <div className={styles.actions}>
            <Button variant="primary" onClick={onCancel} fullWidth>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: matching/initiating state - show timer
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
