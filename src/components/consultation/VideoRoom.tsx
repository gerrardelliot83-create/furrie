'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useRecording,
  useMeetingState,
  DailyVideo,
} from '@daily-co/daily-react';
import { CallControls } from './CallControls';
import { RecordingNotice } from './RecordingNotice';
import { cn } from '@/lib/utils';
import styles from './VideoRoom.module.css';

interface VideoRoomProps {
  roomUrl: string;
  token: string;
  userName: string;
  isVet?: boolean;
  onLeave: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function VideoRoom({
  roomUrl,
  token,
  userName,
  isVet = false,
  onLeave,
  onError,
  className,
}: VideoRoomProps) {
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const { isRecording } = useRecording();
  const meetingState = useMeetingState();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Join the call on mount
  useEffect(() => {
    if (!daily || !roomUrl || !token) return;

    const joinCall = async () => {
      try {
        await daily.join({
          url: roomUrl,
          token,
          userName,
          startVideoOff: false,
          startAudioOff: false,
        });
      } catch (error) {
        console.error('Failed to join call:', error);
        setJoinError('Failed to join the consultation. Please try again.');
        onError?.(error instanceof Error ? error : new Error('Failed to join'));
      }
    };

    if (meetingState === 'new') {
      joinCall();
    }
  }, [daily, roomUrl, token, userName, meetingState, onError]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    if (daily) {
      await daily.leave();
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

  // Toggle chat (placeholder for future implementation)
  const toggleChat = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  // Error state
  if (joinError) {
    return (
      <div className={cn(styles.container, styles.error, className)}>
        <div className={styles.errorContent}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Connection Error</h3>
          <p>{joinError}</p>
          <button onClick={onLeave} className={styles.errorButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

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

  // Get remote participant for display
  const remoteParticipantId = remoteParticipantIds[0];

  return (
    <div className={cn(styles.container, className)}>
      {/* Recording notice */}
      <RecordingNotice isRecording={isRecording} />

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
              {isVet ? 'Customer' : 'Dr. Veterinarian'}
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
              <p>Waiting for {isVet ? 'customer' : 'veterinarian'} to join...</p>
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
        onToggleChat={toggleChat}
        showChatButton={false}
      />

      {/* Chat panel (placeholder) */}
      {showChat && (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <span>Chat</span>
            <button onClick={toggleChat} className={styles.closeChat}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className={styles.chatMessages}>
            <p className={styles.chatPlaceholder}>Chat coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
