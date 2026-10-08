'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { CallProblemPanel } from '@/components/consultation/CallProblemPanel';
import { useConsultationRoom } from '@/components/consultation/useConsultationRoom';
import { createClient } from '@/lib/supabase/client';
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

interface ConsultationDetails {
  customerName: string | null;
  concern: string | null;
  symptoms: string[];
}

export default function VetVideoRoomPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const { phase, problem, join, callObject, enterCall, retry, fail, markLeft } = useConsultationRoom(
    consultationId,
    'vet'
  );
  const [details, setDetails] = useState<ConsultationDetails | null>(null);
  const [recordingConsent, setRecordingConsent] = useState(false);

  // The join response has no concern or pet-parent name, so read them with
  // the vet's own session (assigned consultations only). If they can't be
  // read, the lines are hidden rather than filled with made-up text.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: row } = await supabase
          .from('consultations')
          .select('concern_text, symptom_categories, profiles!consultations_customer_id_fkey (full_name)')
          .eq('id', consultationId)
          .maybeSingle();
        if (cancelled || !row) return;
        const customer = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        setDetails({
          concern: row.concern_text?.trim() || null,
          symptoms: row.symptom_categories ?? [],
          customerName: customer?.full_name?.trim() || null,
        });
      } catch (detailsError) {
        console.warn('Could not load consultation details for the room:', detailsError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consultationId]);

  const backToConsultations = useCallback(() => {
    router.push('/consultations');
  }, [router]);

  const handleLeave = useCallback(() => {
    markLeft();
    // Navigate to SOAP notes page
    router.push(`/consultations/${consultationId}/soap`);
  }, [markLeft, router, consultationId]);

  // Loading state
  if (phase === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Setting up consultation room...</p>
        </div>
      </div>
    );
  }

  // Problem: what happened, Try again
  if (phase === 'problem') {
    return (
      <div className={styles.container}>
        <CallProblemPanel
          problem={problem}
          onRetry={retry}
          onBack={backToConsultations}
          backLabel="Back to Consultations"
        />
      </div>
    );
  }

  // Left state
  if (phase === 'left') {
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
  if (phase === 'ready' && join) {
    const pet = join.consultation.pet;
    const petName = pet?.name || 'Pet';
    const petSpecies = pet?.species || 'Unknown';
    const petBreed = pet?.breed || 'Unknown';
    return (
      <div className={styles.container}>
        <div className={styles.readyScreen}>
          <h1 className={styles.readyTitle}>Ready to Start</h1>

          <div className={styles.patientCard}>
            <div className={styles.patientHeader}>
              <div className={styles.petAvatar}>
                <Image
                  src={petSpecies === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                  alt={petSpecies === 'dog' ? 'Dog' : 'Cat'}
                  width={48}
                  height={48}
                  className={styles.petAvatarImg}
                />
              </div>
              <div>
                <h2 className={styles.petName}>{petName}</h2>
                <p className={styles.petBreed}>
                  {petBreed} ({petSpecies})
                </p>
              </div>
            </div>

            <div className={styles.patientDetails}>
              {details?.customerName && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Pet Parent:</span>
                  <span className={styles.detailValue}>{details.customerName}</span>
                </div>
              )}
              {details?.concern && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Concern:</span>
                  <span className={styles.detailValue}>{details.concern}</span>
                </div>
              )}
              {details && details.symptoms.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Symptoms:</span>
                  <div className={styles.symptomTags}>
                    {details.symptoms.map((symptom) => (
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
            <span>This consultation will be recorded. Ensure the pet parent is aware that recording begins automatically when you join.</span>
          </div>

          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={recordingConsent}
              onChange={(e) => setRecordingConsent(e.target.checked)}
              className={styles.consentCheckbox}
            />
            <span className={styles.consentText}>
              I acknowledge that this consultation will be recorded and the pet parent has been informed.
            </span>
          </label>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={backToConsultations}>
              Cancel
            </Button>
            <Button variant="primary" onClick={enterCall} disabled={!recordingConsent}>
              Join Consultation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // In-call state
  if (phase === 'in-call' && join && callObject) {
    return (
      <DailyProvider callObject={callObject}>
        <VideoRoom
          roomUrl={join.roomUrl}
          token={join.token}
          userName={join.participant.name}
          consultationId={consultationId}
          isVet={true}
          onLeave={handleLeave}
          onFatal={fail}
          onRetry={retry}
        />
      </DailyProvider>
    );
  }

  // Between a fresh ticket and its call object
  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Connecting...</p>
      </div>
    </div>
  );
}
