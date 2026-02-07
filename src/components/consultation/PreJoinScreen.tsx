'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import styles from './PreJoinScreen.module.css';

interface PreJoinScreenProps {
  onJoin: () => void;
  onCancel: () => void;
  vetName?: string;
  className?: string;
}

export function PreJoinScreen({
  onJoin,
  onCancel,
  vetName,
  className,
}: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const setupMedia = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setHasCamera(true);
      setHasMic(true);
      setPermissionError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Media access error:', error);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setPermissionError(
            'Camera and microphone access was denied. Please allow access in your browser settings.'
          );
        } else if (error.name === 'NotFoundError') {
          setPermissionError(
            'No camera or microphone found. Please connect a device and try again.'
          );
        } else {
          setPermissionError(
            'Could not access camera or microphone. Please check your device settings.'
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid async initialization pattern
    setupMedia();

    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [setupMedia, stream]);

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const handleJoin = () => {
    // Stop preview stream before joining
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onJoin();
  };

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.content}>
        <h2 className={styles.title}>Ready to join?</h2>
        {vetName && (
          <p className={styles.subtitle}>Dr. {vetName} is waiting for you</p>
        )}

        {/* Video Preview */}
        <div className={styles.previewContainer}>
          <div className={styles.videoWrapper}>
            {permissionError ? (
              <div className={styles.errorOverlay}>
                <div className={styles.errorIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </div>
                <p className={styles.errorText}>{permissionError}</p>
                <Button variant="secondary" size="sm" onClick={setupMedia}>
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(styles.video, !cameraEnabled && styles.videoOff)}
                />
                {!cameraEnabled && (
                  <div className={styles.cameraOffOverlay}>
                    <div className={styles.avatarPlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p>Camera is off</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Media Controls */}
          <div className={styles.controls}>
            <button
              type="button"
              className={cn(styles.controlBtn, !micEnabled && styles.controlBtnOff)}
              onClick={toggleMic}
              disabled={!hasMic}
              aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micEnabled ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className={cn(styles.controlBtn, !cameraEnabled && styles.controlBtnOff)}
              onClick={toggleCamera}
              disabled={!hasCamera}
              aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraEnabled ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Recording Notice */}
        <div className={styles.notice}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>This consultation will be recorded for quality and medical records.</span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleJoin}
            disabled={!!permissionError}
          >
            Join Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}
