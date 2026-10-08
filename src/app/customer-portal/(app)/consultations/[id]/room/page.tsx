'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { CallProblemPanel } from '@/components/consultation/CallProblemPanel';
import { InAppBrowserNotice } from '@/components/consultation/InAppBrowserNotice';
import { useConsultationRoom } from '@/components/consultation/useConsultationRoom';
import { formatVetName } from '@/lib/utils';
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

/** Recording consent is remembered for this consultation, so a retry or a reload doesn't ask again (VC-1). */
function consentKey(consultationId: string) {
  return `furrie:recording-consent:${consultationId}`;
}

function readConsent(consultationId: string): boolean {
  try {
    return window.localStorage.getItem(consentKey(consultationId)) === 'yes';
  } catch {
    return false;
  }
}

function writeConsent(consultationId: string, value: boolean) {
  try {
    if (value) window.localStorage.setItem(consentKey(consultationId), 'yes');
    else window.localStorage.removeItem(consentKey(consultationId));
  } catch {
    // Private browsing: the box just has to be ticked again next time.
  }
}

export default function CustomerVideoRoomPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const { phase, problem, join, callObject, enterCall, retry, fail, markLeft } = useConsultationRoom(
    consultationId,
    'customer'
  );
  const [recordingConsent, setRecordingConsent] = useState(false);

  useEffect(() => {
    if (readConsent(consultationId)) setRecordingConsent(true); // eslint-disable-line react-hooks/set-state-in-effect -- restore once from storage
  }, [consultationId]);

  const onConsentChange = useCallback(
    (checked: boolean) => {
      setRecordingConsent(checked);
      writeConsent(consultationId, checked);
    },
    [consultationId]
  );

  const backToConsultation = useCallback(() => {
    router.push(`/consultations/${consultationId}`);
  }, [router, consultationId]);

  const handleLeave = useCallback(() => {
    markLeft();
    // Navigate back to consultation details
    router.push(`/consultations/${consultationId}`);
  }, [markLeft, router, consultationId]);

  // Loading state
  if (phase === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Setting up your consultation...</p>
        </div>
      </div>
    );
  }

  // Problem: what happened, Try again
  if (phase === 'problem') {
    return (
      <div className={styles.container}>
        <CallProblemPanel problem={problem} onRetry={retry} onBack={backToConsultation}>
          <InAppBrowserNotice />
        </CallProblemPanel>
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
          <p>Redirecting you back...</p>
        </div>
      </div>
    );
  }

  // Ready state - simple screen without video preview
  if (phase === 'ready' && join) {
    const vetName = join.consultation.vet?.name;
    return (
      <div className={styles.container}>
        <div className={styles.readyScreen}>
          <h1 className={styles.readyTitle}>Ready to Join</h1>

          <InAppBrowserNotice />

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
                {vetName ? formatVetName(vetName) : 'Your vet'}
              </h2>
              <p className={styles.vetStatus}>will join you in this video call</p>
            </div>
          </div>

          <div className={styles.notice}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>This consultation will be recorded. Both audio and video are captured for quality assurance and your medical records.</span>
          </div>

          <label className={styles.consentLabel}>
            <input
              type="checkbox"
              checked={recordingConsent}
              onChange={(e) => onConsentChange(e.target.checked)}
              className={styles.consentCheckbox}
            />
            <span className={styles.consentText}>
              I understand and agree that this consultation will be recorded for quality assurance and medical record purposes.
            </span>
          </label>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={backToConsultation}>
              Cancel
            </Button>
            <Button variant="primary" onClick={enterCall} disabled={!recordingConsent}>
              Join Consultation
            </Button>
          </div>
          {!recordingConsent && (
            <p className={styles.consentHint}>Tick the box above to join.</p>
          )}
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
          isVet={false}
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
