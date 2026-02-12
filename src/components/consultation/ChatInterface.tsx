'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { useFollowUpChat } from '@/hooks/useFollowUpChat';
import styles from './ChatInterface.module.css';

interface ChatInterfaceProps {
  consultationId: string;
  currentUserId: string;
  currentUserRole: 'customer' | 'vet';
}

export function ChatInterface({
  consultationId,
  currentUserId,
  currentUserRole,
}: ChatInterfaceProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    threadExpiresAt,
    isExpired,
    threadNotFound,
  } = useFollowUpChat(consultationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string, attachmentUrl?: string) => {
    const messageType = attachmentUrl ? 'image' : 'text';
    await sendMessage(content, messageType, attachmentUrl);
  };

  // Calculate time remaining for thread
  const getTimeRemaining = () => {
    if (!threadExpiresAt) return null;
    const expiresAt = new Date(threadExpiresAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    }
    return 'Expiring soon';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (threadNotFound) {
    return (
      <div className={styles.container}>
        <div className={styles.notAvailable}>
          <div className={styles.notAvailableIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
            </svg>
          </div>
          <h3 className={styles.notAvailableTitle}>Chat Not Yet Available</h3>
          <p className={styles.notAvailableText}>
            Follow-up chat will be available once the veterinarian completes the consultation notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with expiry info */}
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Follow-up Chat</h3>
        {threadExpiresAt && !isExpired && (
          <span className={styles.expiryBadge}>{getTimeRemaining()}</span>
        )}
        {isExpired && (
          <span className={styles.expiredBadge}>Chat expired</span>
        )}
      </div>

      {/* Messages area */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No messages yet.</p>
            <p className={styles.hint}>
              {currentUserRole === 'vet'
                ? 'Send a message to start the follow-up conversation.'
                : 'Your vet may send you follow-up messages here.'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      {!isExpired ? (
        <div className={styles.composerContainer}>
          <MessageComposer onSend={handleSendMessage} />
        </div>
      ) : (
        <div className={styles.expiredMessage}>
          This follow-up chat has expired. Please schedule a new consultation if needed.
        </div>
      )}
    </div>
  );
}
