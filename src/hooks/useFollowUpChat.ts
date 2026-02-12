'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: 'customer' | 'vet';
  messageType: 'text' | 'image';
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}

interface UseFollowUpChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, messageType?: 'text' | 'image', attachmentUrl?: string) => Promise<void>;
  threadId: string | null;
  threadExpiresAt: string | null;
  isExpired: boolean;
  threadNotFound: boolean;
}

export function useFollowUpChat(consultationId: string): UseFollowUpChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadExpiresAt, setThreadExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadNotFound, setThreadNotFound] = useState(false);
  const supabaseRef = useRef(createClient());

  // Check if thread is expired
  const isExpired = threadExpiresAt ? new Date(threadExpiresAt) < new Date() : false;

  // Fetch existing thread and messages (no auto-create)
  useEffect(() => {
    const fetchChat = async () => {
      setIsLoading(true);
      setError(null);
      setThreadNotFound(false);

      const supabase = supabaseRef.current;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        // Check for existing thread (DO NOT create if not found)
        const { data: thread, error: threadError } = await supabase
          .from('follow_up_threads')
          .select('*')
          .eq('consultation_id', consultationId)
          .single();

        if (threadError || !thread) {
          // Thread not found - chat not yet available
          setThreadNotFound(true);
          setIsLoading(false);
          return;
        }

        // Verify user is a participant
        if (thread.customer_id !== user.id && thread.vet_id !== user.id) {
          setError('Not authorized to view this chat');
          setIsLoading(false);
          return;
        }

        setThreadId(thread.id);
        setThreadExpiresAt(thread.expires_at);

        // Fetch messages with new column names
        const { data: messagesData, error: messagesError } = await supabase
          .from('follow_up_messages')
          .select('*')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          setError('Failed to load messages');
        } else {
          setMessages(
            (messagesData || []).map((msg) => ({
              id: msg.id,
              threadId: msg.thread_id,
              senderId: msg.sender_id,
              senderRole: msg.sender_role || 'customer',
              messageType: msg.message_type || 'text',
              content: msg.content,
              attachmentUrl: msg.attachment_url,
              createdAt: msg.created_at,
            }))
          );
        }
      } catch (err) {
        console.error('Error in fetchChat:', err);
        setError('Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChat();
  }, [consultationId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!threadId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`follow_up:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follow_up_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage: ChatMessage = {
            id: payload.new.id,
            threadId: payload.new.thread_id,
            senderId: payload.new.sender_id,
            senderRole: payload.new.sender_role || 'customer',
            messageType: payload.new.message_type || 'text',
            content: payload.new.content,
            attachmentUrl: payload.new.attachment_url,
            createdAt: payload.new.created_at,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, messageType: 'text' | 'image' = 'text', attachmentUrl?: string) => {
      if (!threadId) {
        throw new Error('Chat not initialized');
      }

      if (isExpired) {
        throw new Error('This follow-up chat has expired. Please schedule a new consultation if needed.');
      }

      const supabase = supabaseRef.current;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get user role from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const senderRole = profile?.role === 'vet' ? 'vet' : 'customer';

      const { error: insertError } = await supabase.from('follow_up_messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_role: senderRole,
        message_type: messageType,
        content,
        attachment_url: attachmentUrl || null,
      });

      if (insertError) {
        console.error('Error sending message:', insertError);
        // Check for common RLS failures (PostgreSQL permission denied error)
        if (insertError.code === '42501') {
          throw new Error('Unable to send message. The chat may have expired or is no longer active.');
        }
        throw new Error('Failed to send message. Please try again.');
      }
    },
    [threadId, isExpired]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    threadId,
    threadExpiresAt,
    isExpired,
    threadNotFound,
  };
}
