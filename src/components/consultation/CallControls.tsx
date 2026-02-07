'use client';

import { cn } from '@/lib/utils';
import styles from './CallControls.module.css';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isRecording?: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onToggleChat?: () => void;
  showChatButton?: boolean;
  className?: string;
}

export function CallControls({
  isMuted,
  isCameraOff,
  isRecording = false,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onToggleChat,
  showChatButton = true,
  className,
}: CallControlsProps) {
  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.controls}>
        {/* Recording indicator */}
        {isRecording && (
          <div className={styles.recordingIndicator}>
            <span className={styles.recordingDot} />
            <span className={styles.recordingText}>REC</span>
          </div>
        )}

        <div className={styles.mainControls}>
          {/* Mute Button */}
          <button
            type="button"
            className={cn(styles.controlBtn, isMuted && styles.controlBtnOff)}
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            className={cn(styles.controlBtn, isCameraOff && styles.controlBtnOff)}
            onClick={onToggleCamera}
            aria-label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            )}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            className={cn(styles.controlBtn, styles.endCallBtn)}
            onClick={onEndCall}
            aria-label="End call"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>

          {/* Chat Button (optional) */}
          {showChatButton && onToggleChat && (
            <button
              type="button"
              className={styles.controlBtn}
              onClick={onToggleChat}
              aria-label="Toggle chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
