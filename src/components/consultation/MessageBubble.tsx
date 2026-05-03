'use client';

import type { ChatMessage } from '@/hooks/useFollowUpChat';
import { PetImage } from '@/components/ui/PetImage';
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

  // Render image message - only if messageType is 'image' AND attachmentUrl is a valid URL
  const isImageMessage =
    message.messageType === 'image' &&
    message.attachmentUrl &&
    typeof message.attachmentUrl === 'string' &&
    message.attachmentUrl.trim() !== '' &&
    (message.attachmentUrl.startsWith('http://') || message.attachmentUrl.startsWith('https://'));

  if (isImageMessage) {
    return (
      <div className={`${styles.messageRow} ${isOwn ? styles.own : ''}`}>
        <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : ''}`}>
          <a
            href={message.attachmentUrl!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open image in new tab"
          >
            <PetImage
              src={message.attachmentUrl!}
              alt="Shared image"
              width={240}
              height={240}
              className={styles.messageImage}
            />
          </a>
          {message.content && message.content !== 'Image' && (
            <p className={styles.messageText}>{message.content}</p>
          )}
        </div>
        <span className={styles.time} suppressHydrationWarning>
          {formatTime(message.createdAt)}
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
      <span className={styles.time} suppressHydrationWarning>
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}
