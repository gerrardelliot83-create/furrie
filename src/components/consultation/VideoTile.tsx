'use client';

import { cn } from '@/lib/utils';
import styles from './VideoTile.module.css';

interface VideoTileProps {
  videoTrack?: MediaStreamTrack | null;
  audioTrack?: MediaStreamTrack | null;
  participantName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isActiveSpeaker?: boolean;
  size?: 'small' | 'large';
  className?: string;
}

export function VideoTile({
  videoTrack,
  participantName,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  isActiveSpeaker = false,
  size = 'large',
  className,
}: VideoTileProps) {
  // Get initials for avatar placeholder
  const initials = participantName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        styles.container,
        styles[size],
        isLocal && styles.local,
        isActiveSpeaker && styles.activeSpeaker,
        className
      )}
    >
      {/* Video element - will be managed by Daily.co */}
      <div className={styles.videoContainer} data-video-track={videoTrack?.id}>
        {isCameraOff ? (
          <div className={styles.cameraOff}>
            <div className={styles.avatar}>
              <span className={styles.initials}>{initials}</span>
            </div>
          </div>
        ) : (
          <div className={styles.videoPlaceholder}>
            {/* Video will be injected by Daily.co DailyVideo component */}
          </div>
        )}
      </div>

      {/* Overlay info */}
      <div className={styles.overlay}>
        <div className={styles.nameTag}>
          {isMuted && (
            <span className={styles.mutedIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              </svg>
            </span>
          )}
          <span className={styles.name}>
            {isLocal ? 'You' : participantName}
          </span>
        </div>
      </div>

      {/* Active speaker indicator */}
      {isActiveSpeaker && <div className={styles.speakerBorder} />}
    </div>
  );
}
