'use client';

import { ChatInterface } from '@/components/consultation/ChatInterface';
import styles from './ConsultationChatContent.module.css';

interface ConsultationChatContentProps {
  consultationId: string;
  currentUserId: string;
  onBack?: () => void;
}

export function ConsultationChatContent({
  consultationId,
  currentUserId,
  onBack,
}: ConsultationChatContentProps) {
  return (
    <div className={styles.container}>
      {onBack && (
        <button type="button" className={styles.backButton} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Details
        </button>
      )}
      <div className={styles.chatWrapper}>
        <ChatInterface
          consultationId={consultationId}
          currentUserId={currentUserId}
          currentUserRole="customer"
        />
      </div>
    </div>
  );
}
