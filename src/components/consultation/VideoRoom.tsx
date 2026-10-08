'use client';

import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import type { DailyEventObject } from '@daily-co/daily-js';
import {
  useDaily,
  useDailyEvent,
  useLocalSessionId,
  useParticipantIds,
  useParticipantProperty,
  useRecording,
  useMeetingState,
  DailyAudio,
  DailyVideo,
} from '@daily-co/daily-react';
import { describeCameraError, describeFatalError, DISCONNECTED, type CallProblem } from '@/lib/daily/callErrors';
import { reportCallProblem } from '@/lib/daily/reportCallProblem';
import { CallControls } from './CallControls';
import { RecordingNotice } from './RecordingNotice';
import { cn } from '@/lib/utils';
import styles from './VideoRoom.module.css';

/** DailyAudio's ref handle (the type itself isn't exported). */
type AudioPlayers = ComponentRef<typeof DailyAudio>;

interface VideoRoomProps {
  roomUrl: string;
  token: string;
  userName: string;
  consultationId: string;
  isVet?: boolean;
  /** The person pressed End call. */
  onLeave: () => void;
  /**
   * The call stopped and can't continue on its own (Daily's 'error' event, a
   * failed join, or the call ending without End being pressed). The page
   * shows the problem with Try again, or retries by itself for a full room.
   */
  onFatal: (problem: CallProblem) => void;
  /** Fetch a fresh ticket and rejoin (used by the camera banner). */
  onRetry: () => void;
  className?: string;
}

export function VideoRoom({
  roomUrl,
  token,
  userName,
  consultationId,
  isVet = false,
  onLeave,
  onFatal,
  onRetry,
  className,
}: VideoRoomProps) {
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  // Newest first-joined last: if an older session of the other person is still
  // around, show the newest one rather than a frozen picture (VC-1, L6).
  const remoteParticipantIds = useParticipantIds({ filter: 'remote', sort: 'joined_at' });
  const remoteParticipantId = remoteParticipantIds[remoteParticipantIds.length - 1];
  const remoteName = useParticipantProperty(remoteParticipantId ?? '', 'user_name');
  const { isRecording } = useRecording();
  const meetingState = useMeetingState();
  const role = isVet ? 'vet' : 'customer';

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaProblem, setMediaProblem] = useState<CallProblem | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<AudioPlayers>(null);

  // Set when the person presses End, or a fatal error was already reported,
  // so the 'left-meeting' that follows isn't treated as a dropped call.
  const endingRef = useRef(false);

  const fail = useCallback(
    (problem: CallProblem) => {
      if (endingRef.current) return;
      endingRef.current = true;
      onFatal(problem);
    },
    [onFatal]
  );

  // Join the call on mount
  useEffect(() => {
    if (!daily || !roomUrl || !token || meetingState !== 'new') return;
    daily
      .join({ url: roomUrl, token, userName, startVideoOff: false, startAudioOff: false })
      .catch((error: unknown) => {
        // A fatal join failure also raises the 'error' event; whichever
        // arrives first is shown.
        const type = (error as { type?: string } | null)?.type ?? null;
        fail(describeFatalError(type));
      });
  }, [daily, roomUrl, token, userName, meetingState, fail]);

  // Daily's fatal errors: room full, expired, removed, connection lost…
  useDailyEvent(
    'error',
    useCallback(
      (ev: DailyEventObject<'error'>) => {
        fail(describeFatalError(ev.error?.type ?? null));
      },
      [fail]
    )
  );

  // The call ended without End being pressed and without an error.
  useDailyEvent(
    'left-meeting',
    useCallback(() => {
      fail(DISCONNECTED);
    }, [fail])
  );

  // Camera or microphone blocked / busy / missing. The call may still be
  // connected, so this is a banner with Try again.
  useDailyEvent(
    'camera-error',
    useCallback(
      (ev: DailyEventObject<'camera-error'>) => {
        const problem = describeCameraError(ev.error?.type ?? null);
        setMediaProblem(problem);
        reportCallProblem(problem.kind, { consultationId, role, level: 'warning', detail: ev.errorMsg?.errorMsg ?? null });
      },
      [consultationId, role]
    )
  );

  // Network drop: Daily reconnects by itself; say so instead of freezing.
  useDailyEvent(
    'network-connection',
    useCallback((ev: DailyEventObject<'network-connection'>) => {
      if (ev.event === 'interrupted') setReconnecting(true);
      if (ev.event === 'connected') setReconnecting(false);
    }, [])
  );

  // Handle leave
  const handleLeave = useCallback(async () => {
    endingRef.current = true;
    if (daily) {
      await daily.leave().catch(() => undefined);
    }
    onLeave();
  }, [daily, onLeave]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (daily) {
      const newMutedState = !isMuted;
      daily.setLocalAudio(!newMutedState);
      setIsMuted(newMutedState);
    }
  }, [daily, isMuted]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (daily) {
      const newCameraOffState = !isCameraOff;
      daily.setLocalVideo(!newCameraOffState);
      setIsCameraOff(newCameraOffState);
    }
  }, [daily, isCameraOff]);

  // Browsers can refuse to start sound without a tap (mostly iPhones).
  const handleAudioPlayFailed = useCallback(() => {
    setAudioBlocked(true);
  }, []);

  const enableSound = useCallback(() => {
    const players = audioRef.current?.getAllAudio() ?? [];
    Promise.all(players.map((audio) => audio.play().catch(() => undefined))).finally(() => setAudioBlocked(false));
  }, []);

  const retryMedia = useCallback(() => {
    endingRef.current = true;
    onRetry();
  }, [onRetry]);

  // Loading state
  if (meetingState === 'new' || meetingState === 'loading' || meetingState === 'joining-meeting') {
    return (
      <div className={cn(styles.container, styles.loading, className)}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <p>Connecting to consultation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.container, className)}>
      {/* Plays the other person's voice. Without it calls had no sound (VC-1). */}
      <DailyAudio ref={audioRef} onPlayFailed={handleAudioPlayFailed} />

      {/* Recording notice */}
      <RecordingNotice isRecording={isRecording} />

      {(reconnecting || mediaProblem || audioBlocked) && (
        <div className={styles.banners} role="status" aria-live="polite">
          {reconnecting && (
            <div className={styles.banner}>
              <span>Connection lost. Reconnecting…</span>
            </div>
          )}
          {audioBlocked && (
            <div className={styles.banner}>
              <span>Sound is off.</span>
              <button type="button" className={styles.bannerButton} onClick={enableSound}>
                Turn on sound
              </button>
            </div>
          )}
          {mediaProblem && (
            <div className={cn(styles.banner, styles.bannerWarning)}>
              <span>{mediaProblem.message}</span>
              <button type="button" className={styles.bannerButton} onClick={retryMedia}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main video area */}
      <div className={styles.videoGrid}>
        {/* Remote participant (full screen on mobile, main view on desktop) */}
        {remoteParticipantId ? (
          <div className={styles.mainVideo}>
            <DailyVideo
              sessionId={remoteParticipantId}
              type="video"
              automirror
              className={styles.video}
            />
            <div className={styles.participantName}>
              {remoteName || (isVet ? 'Pet parent' : 'Your vet')}
            </div>
          </div>
        ) : (
          <div className={styles.waitingScreen}>
            <div className={styles.waitingContent}>
              <div className={styles.waitingDots}>
                <span />
                <span />
                <span />
              </div>
              <p>Waiting for {isVet ? 'the pet parent' : 'your vet'} to join...</p>
              <p className={styles.waitingHint}>Keep this screen open. You don&apos;t need to reload.</p>
            </div>
          </div>
        )}

        {/* Local video (PiP) */}
        {localSessionId && (
          <div className={cn(styles.localVideo, isCameraOff && styles.cameraOff)}>
            {isCameraOff ? (
              <div className={styles.cameraOffPlaceholder}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </div>
            ) : (
              <DailyVideo
                sessionId={localSessionId}
                type="video"
                mirror
                className={styles.video}
              />
            )}
            <div className={styles.localLabel}>You</div>
          </div>
        )}
      </div>

      {/* Call controls */}
      <CallControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isRecording={isRecording}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEndCall={handleLeave}
        showChatButton={false}
      />
    </div>
  );
}
