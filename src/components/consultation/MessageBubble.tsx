'use client';

import type { ChatMessage } from '@/hooks/useFollowUpChat';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  // Render prescription message
  if (message.messageType === 'prescription') {
    return (
      <div className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
        <div className={`${styles.bubble} ${styles.prescription}`}>
          <div className={styles.prescriptionIcon}>Rx</div>
          <div className={styles.prescriptionContent}>
            <p className={styles.prescriptionTitle}>Prescription</p>
            <p className={styles.prescriptionText}>{message.content}</p>
            {message.attachmentUrl && (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.downloadLink}
              >
                Download PDF
              </a>
            )}
          </div>
        </div>
        <span className={styles.time}>
          {formatDate(message.createdAt)} {formatTime(message.createdAt)}
        </span>
      </div>
    );
  }

  // Render system message
  if (message.messageType === 'system') {
    return (
      <div className={styles.systemMessage}>
        <span>{message.content}</span>
        <span className={styles.systemTime}>{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  // Render image message
  if (message.messageType === 'image' && message.attachmentUrl) {
    return (
      <div className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
        <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.attachmentUrl}
            alt="Shared image"
            className={styles.messageImage}
            onClick={() => window.open(message.attachmentUrl!, '_blank')}
          />
          {message.content && (
            <p className={styles.messageText}>{message.content}</p>
          )}
        </div>
        <span className={styles.time}>
          {formatTime(message.createdAt)}
          {isOwn && (
            <span className={styles.readStatus}>
              {message.isRead ? ' Read' : ''}
            </span>
          )}
        </span>
      </div>
    );
  }

  // Render text message
  return (
    <div className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
      <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : ''}`}>
        <p className={styles.messageText}>{message.content}</p>
      </div>
      <span className={styles.time}>
        {formatTime(message.createdAt)}
        {isOwn && (
          <span className={styles.readStatus}>
            {message.isRead ? ' Read' : ''}
          </span>
        )}
      </span>
    </div>
  );
}
