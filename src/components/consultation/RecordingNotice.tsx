'use client';

import { cn } from '@/lib/utils';
import styles from './RecordingNotice.module.css';

interface RecordingNoticeProps {
  isRecording: boolean;
  className?: string;
}

export function RecordingNotice({ isRecording, className }: RecordingNoticeProps) {
  if (!isRecording) return null;

  return (
    <div className={cn(styles.container, className)}>
      <span className={styles.dot} />
      <span className={styles.text}>Recording in progress</span>
    </div>
  );
}
