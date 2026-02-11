'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DailyProvider } from '@daily-co/daily-react';
import Daily from '@daily-co/daily-js';
import { VideoRoom } from '@/components/consultation';
import { Button } from '@/components/ui/Button';
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

type RoomState = 'loading' | 'error' | 'ready' | 'in-call' | 'left';

interface TokenResponse {
  token: string;
  roomUrl: string;
  roomName: string;
  isOwner: boolean;
  userName: string;
}

interface ConsultationInfo {
  id: string;
  customerName: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  concern: string;
  symptoms: string[];
}

export default function VetVideoRoomPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [roomState, setRoomState] = useState<RoomState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [consultationInfo, setConsultationInfo] = useState<ConsultationInfo | null>(null);
  const [callObject, setCallObject] = useState<ReturnType<typeof Daily.createCallObject> | null>(null);

  // Fetch room token and consultation info
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch consultation details with retry logic for race conditions
        const consultationResponse = await fetchWithRetry(`/api/consultations/${consultationId}`);
        if (!consultationResponse.ok) {
          const errorData = await consultationResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Consultation not found');
        }
        const consultationData = await consultationResponse.json();
        const consultation = consultationData.consultation;

        // Validate status - only scheduled and active consultations can be joined
        const status = consultation.status;
        if (status && !['scheduled', 'active'].includes(status)) {
          throw new Error('This consultation is no longer active');
        }

        setConsultationInfo({
          id: consultation.id,
          customerName: consultation.customer?.fullName || 'Customer',
          petName: consultation.pet?.name || 'Pet',
          petSpecies: consultation.pet?.species || 'Unknown',
          petBreed: consultation.pet?.breed || 'Unknown',
          concern: consultation.concernText || 'General consultation',
          symptoms: consultation.symptomCategories || [],
        });

        // Ensure room exists
        const createRoomResponse = await fetch('/api/daily/create-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId }),
        });

        if (!createRoomResponse.ok) {
          const data = await createRoomResponse.json();
          throw new Error(data.error || 'Failed to create room');
        }

        // Fetch token
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
        setRoomState('ready');
      } catch (err) {
        console.error('Failed to setup video room:', err);
        setError(err instanceof Error ? err.message : 'Failed to setup video room');
        setRoomState('error');
      }
    };

    fetchData();
  }, [consultationId]);

  // Create Daily call object
  useEffect(() => {
    if (tokenData && !callObject) {
      const daily = Daily.createCallObject({
        showLeaveButton: false,
        showFullscreenButton: false,
      });
      setCallObject(daily);
    }

    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [tokenData, callObject]);

  const handleJoin = useCallback(() => {
    setRoomState('in-call');
  }, []);

  const handleLeave = useCallback(async () => {
    setRoomState('left');
    // Navigate to SOAP notes page
    router.push(`/consultations/${consultationId}/soap`);
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
          <p>Setting up consultation room...</p>
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
          <button onClick={() => router.push('/consultations')}>
            Back to Consultations
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
          <p>Redirecting to SOAP notes...</p>
        </div>
      </div>
    );
  }

  // Ready state - show patient info before joining
  if (roomState === 'ready' && tokenData && consultationInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.readyScreen}>
          <h1 className={styles.readyTitle}>Ready to Start</h1>

          <div className={styles.patientCard}>
            <div className={styles.patientHeader}>
              <div className={styles.petAvatar}>
                {consultationInfo.petSpecies === 'dog' ? 'D' : 'C'}
              </div>
              <div>
                <h2 className={styles.petName}>{consultationInfo.petName}</h2>
                <p className={styles.petBreed}>
                  {consultationInfo.petBreed} ({consultationInfo.petSpecies})
                </p>
              </div>
            </div>

            <div className={styles.patientDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Pet Parent:</span>
                <span className={styles.detailValue}>{consultationInfo.customerName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Concern:</span>
                <span className={styles.detailValue}>{consultationInfo.concern}</span>
              </div>
              {consultationInfo.symptoms.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Symptoms:</span>
                  <div className={styles.symptomTags}>
                    {consultationInfo.symptoms.map((symptom) => (
                      <span key={symptom} className={styles.symptomTag}>
                        {symptom.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.notice}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Remember to start recording once the consultation begins.</span>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => router.push('/consultations')}>
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
          isVet={true}
          onLeave={handleLeave}
          onError={handleError}
        />
      </DailyProvider>
    );
  }

  return null;
}
