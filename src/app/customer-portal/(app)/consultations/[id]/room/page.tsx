'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

// Lazy-load Daily SDK and VideoRoom — only fetched when user clicks "Join"
const DailyProvider = dynamic(
  () => import('@daily-co/daily-react').then(mod => ({ default: mod.DailyProvider })),
  { ssr: false }
);
const VideoRoom = dynamic(
  () => import('@/components/consultation').then(mod => ({ default: mod.VideoRoom })),
  { ssr: false }
);

// Retry helper for handling race conditions in consultation fetch
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  initialDelay = 500
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status !== 404 && response.status !== 500)) {
        return response;
      }
      if (attempt < maxRetries - 1) {
        console.log(`Request returned ${response.status}, retrying...`);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries - 1) throw lastError;
    }
  }

  throw lastError || new Error('Request failed after retries');
}

type RoomState = 'loading' | 'error' | 'ready' | 'in-call' | 'left';

interface TokenResponse {
  token: string;
  roomUrl: string;
  roomName: string;
  isOwner: boolean;
  userName: string;
}

interface VetInfo {
  name: string;
}

export default function CustomerVideoRoomPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [roomState, setRoomState] = useState<RoomState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [vetInfo, setVetInfo] = useState<VetInfo | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [callObject, setCallObject] = useState<any>(null);

  // Join consultation - single call that handles room creation, token, and validation
  useEffect(() => {
    const joinConsultation = async () => {
      try {
        // Single call to join endpoint - handles room creation, token, and validation
        const joinResponse = await fetchWithRetry(`/api/consultations/${consultationId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!joinResponse.ok) {
          const data = await joinResponse.json();
          throw new Error(data.error || 'Failed to join consultation');
        }

        const data = await joinResponse.json();

        // Set token data from join response
        setTokenData({
          token: data.token,
          roomUrl: data.roomUrl,
          roomName: data.roomName,
          isOwner: data.participant.isOwner,
          userName: data.participant.name,
        });

        // Set vet info from join response
        if (data.consultation?.vet) {
          setVetInfo({ name: data.consultation.vet.name });
        }

        setRoomState('ready');
      } catch (err) {
        console.error('Failed to setup video room:', err);
        setError(err instanceof Error ? err.message : 'Failed to setup video room');
        setRoomState('error');
      }
    };

    joinConsultation();
  }, [consultationId]);

  // Create Daily call object — SDK loaded dynamically only when needed
  useEffect(() => {
    if (tokenData && !callObject) {
      import('@daily-co/daily-js').then((DailyModule) => {
        const daily = DailyModule.default.createCallObject({
          showLeaveButton: false,
          showFullscreenButton: false,
          iframeStyle: {
            width: '100%',
            height: '100%',
          },
        });
        setCallObject(daily);
      });
    }

    // Cleanup on unmount
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [tokenData, callObject]);

  const handleJoin = useCallback(() => {
    setRoomState('in-call'); // Direct transition, no intermediate state
  }, []);

  const handleLeave = useCallback(() => {
    setRoomState('left');
    // Navigate back to consultation details
    router.push(`/consultations/${consultationId}`);
  }, [router, consultationId]);

  const handleCancel = useCallback(() => {
    router.push(`/consultations/${consultationId}`);
  }, [router, consultationId]);

  const handleError = useCallback((err: Error) => {
    console.error('Video room error:', err);
    setError(err.message);
    setRoomState('error');
  }, []);

  // Loading state
  if (roomState === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Setting up your consultation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (roomState === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Unable to Join</h2>
          <p>{error || 'Something went wrong. Please try again.'}</p>
          <button onClick={() => router.push(`/consultations/${consultationId}`)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Left state
  if (roomState === 'left') {
    return (
      <div className={styles.container}>
        <div className={styles.left}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2>Consultation Ended</h2>
          <p>Redirecting you back...</p>
        </div>
      </div>
    );
  }

  // Ready state - simple screen without video preview
  if (roomState === 'ready' && tokenData) {
    return (
      <div className={styles.container}>
        <div className={styles.readyScreen}>
          <h1 className={styles.readyTitle}>Ready to Join</h1>

          <div className={styles.vetCard}>
            <div className={styles.vetAvatar}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className={styles.vetInfo}>
              <p className={styles.vetLabel}>Your Veterinarian</p>
              <h2 className={styles.vetName}>
                {vetInfo?.name ? `Dr. ${vetInfo.name}` : 'Your vet'}
              </h2>
              <p className={styles.vetStatus}>is waiting for you</p>
            </div>
          </div>

          <div className={styles.notice}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>This consultation may be recorded for quality and training purposes.</span>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleJoin}>
              Join Consultation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // In-call state
  if (roomState === 'in-call' && tokenData && callObject) {
    return (
      <DailyProvider callObject={callObject}>
        <VideoRoom
          roomUrl={tokenData.roomUrl}
          token={tokenData.token}
          userName={tokenData.userName}
          isVet={false}
          onLeave={handleLeave}
          onError={handleError}
        />
      </DailyProvider>
    );
  }

  return null;
}
