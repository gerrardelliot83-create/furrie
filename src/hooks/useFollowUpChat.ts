'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if thread is expired
  const isExpired = threadExpiresAt ? new Date(threadExpiresAt) < new Date() : false;

  // Fetch existing thread and messages (no auto-create)
  const fetchChat = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      setIsLoading(true);
      setError(null);
      setThreadNotFound(false);
    }

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

      // Thread found - stop polling if running
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Verify user is a participant
      if (thread.customer_id !== user.id && thread.vet_id !== user.id) {
        setError('Not authorized to view this chat');
        setIsLoading(false);
        return;
      }

      setThreadNotFound(false);
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
      if (!isPolling) {
        setError('Failed to load chat');
      }
    } finally {
      setIsLoading(false);
    }
  }, [consultationId]);

  // Initial fetch
  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  // Poll for thread when not found (auto-refresh every 5 seconds)
  useEffect(() => {
    if (threadNotFound && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        fetchChat(true);
      }, 5000);
    }

    if (!threadNotFound && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [threadNotFound, fetchChat]);

  // Subscribe to real-time messages using Broadcast (no database replication setup required)
  useEffect(() => {
    if (!threadId) return;

    const supabase = supabaseRef.current;

    // Create and store channel reference for both subscribing and sending
    const channel = supabase.channel(`follow_up:${threadId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'new_message' }, (payload) => {
        const newMessage = payload.payload as ChatMessage;

        setMessages((prev) => {
          // Avoid duplicates (message might already be there from optimistic update)
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [threadId]);

  // Send message with optimistic updates and broadcast
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

      // Create optimistic message for immediate UI update
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        threadId,
        senderId: user.id,
        senderRole,
        messageType,
        content,
        attachmentUrl: attachmentUrl || null,
        createdAt: new Date().toISOString(),
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      const { data: insertedMessage, error: insertError } = await supabase
        .from('follow_up_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          sender_role: senderRole,
          message_type: messageType,
          content,
          attachment_url: attachmentUrl || null,
        })
        .select()
        .single();

      if (insertError) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error('Error sending message:', insertError);
        // Check for common RLS failures (PostgreSQL permission denied error)
        if (insertError.code === '42501') {
          throw new Error('Unable to send message. The chat may have expired or is no longer active.');
        }
        throw new Error('Failed to send message. Please try again.');
      }

      // Replace optimistic message with real one and broadcast to other clients
      if (insertedMessage) {
        const realMessage: ChatMessage = {
          id: insertedMessage.id,
          threadId: insertedMessage.thread_id,
          senderId: insertedMessage.sender_id,
          senderRole: insertedMessage.sender_role || 'customer',
          messageType: insertedMessage.message_type || 'text',
          content: insertedMessage.content,
          attachmentUrl: insertedMessage.attachment_url,
          createdAt: insertedMessage.created_at,
        };

        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? realMessage : m))
        );

        // Broadcast to other clients (e.g., when customer sends, vet receives)
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: realMessage,
          });
        }
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
