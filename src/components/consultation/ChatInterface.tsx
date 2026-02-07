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
    markAsRead,
    threadExpiresAt,
    isExpired,
  } = useFollowUpChat(consultationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

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
