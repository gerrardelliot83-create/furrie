'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DailyProvider } from '@daily-co/daily-react';
import Daily from '@daily-co/daily-js';
import { PreJoinScreen, VideoRoom } from '@/components/consultation';
import styles from './page.module.css';

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

type RoomState = 'loading' | 'error' | 'prejoin' | 'joining' | 'in-call' | 'left';

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
  const [callObject, setCallObject] = useState<ReturnType<typeof Daily.createCallObject> | null>(null);

  // Fetch room token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // First, ensure room exists
        const createRoomResponse = await fetch('/api/daily/create-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId }),
        });

        if (!createRoomResponse.ok) {
          const data = await createRoomResponse.json();
          throw new Error(data.error || 'Failed to create room');
        }

        // Then fetch token
        const tokenResponse = await fetch('/api/daily/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId }),
        });

        if (!tokenResponse.ok) {
          const data = await tokenResponse.json();
          throw new Error(data.error || 'Failed to get meeting token');
        }

        const data: TokenResponse = await tokenResponse.json();
        setTokenData(data);

        // Fetch consultation details for vet info with retry logic
        const consultationResponse = await fetchWithRetry(`/api/consultations/${consultationId}`);
        if (consultationResponse.ok) {
          const consultationData = await consultationResponse.json();
          if (consultationData.consultation?.vet) {
            setVetInfo({ name: consultationData.consultation.vet.fullName });
          }
        }

        setRoomState('prejoin');
      } catch (err) {
        console.error('Failed to setup video room:', err);
        setError(err instanceof Error ? err.message : 'Failed to setup video room');
        setRoomState('error');
      }
    };

    fetchToken();
  }, [consultationId]);

  // Create Daily call object
  useEffect(() => {
    if (tokenData && !callObject) {
      const daily = Daily.createCallObject({
        showLeaveButton: false,
        showFullscreenButton: false,
        iframeStyle: {
          width: '100%',
          height: '100%',
        },
      });
      setCallObject(daily);
    }

    // Cleanup on unmount
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [tokenData, callObject]);

  const handleJoin = useCallback(() => {
    setRoomState('joining');
    // The VideoRoom component will handle the actual join
    setTimeout(() => setRoomState('in-call'), 100);
  }, []);

  const handleLeave = useCallback(() => {
    setRoomState('left');
    // Navigate back to consultation details
    router.push(`/customer-portal/consultations/${consultationId}`);
  }, [router, consultationId]);

  const handleCancel = useCallback(() => {
    router.push(`/customer-portal/consultations/${consultationId}`);
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
          <button onClick={() => router.push(`/customer-portal/consultations/${consultationId}`)}>
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

  // PreJoin state
  if (roomState === 'prejoin' && tokenData) {
    return (
      <div className={styles.container}>
        <PreJoinScreen
          onJoin={handleJoin}
          onCancel={handleCancel}
          vetName={vetInfo?.name}
        />
      </div>
    );
  }

  // In-call state
  if ((roomState === 'joining' || roomState === 'in-call') && tokenData && callObject) {
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
