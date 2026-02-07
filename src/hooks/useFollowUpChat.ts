'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: 'customer' | 'vet';
  messageType: 'text' | 'image' | 'prescription' | 'system';
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface UseFollowUpChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, messageType?: 'text' | 'image', attachmentUrl?: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  threadId: string | null;
  threadExpiresAt: string | null;
  isExpired: boolean;
}

export function useFollowUpChat(consultationId: string): UseFollowUpChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadExpiresAt, setThreadExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // Check if thread is expired
  const isExpired = threadExpiresAt ? new Date(threadExpiresAt) < new Date() : false;

  // Fetch or create thread and messages
  useEffect(() => {
    const fetchChat = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = supabaseRef.current;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        // Check for existing thread
        let { data: thread } = await supabase
          .from('follow_up_threads')
          .select('*')
          .eq('consultation_id', consultationId)
          .single();

        if (!thread) {
          // Create new thread
          const { data: newThread, error: createError } = await supabase
            .from('follow_up_threads')
            .insert({
              consultation_id: consultationId,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating thread:', createError);
            setError('Failed to create chat thread');
            setIsLoading(false);
            return;
          }

          thread = newThread;
        }

        setThreadId(thread.id);
        setThreadExpiresAt(thread.expires_at);

        // Fetch messages
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
              senderRole: msg.sender_role,
              messageType: msg.message_type,
              content: msg.content,
              attachmentUrl: msg.attachment_url,
              isRead: msg.is_read,
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
            senderRole: payload.new.sender_role,
            messageType: payload.new.message_type,
            content: payload.new.content,
            attachmentUrl: payload.new.attachment_url,
            isRead: payload.new.is_read,
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
      if (!threadId || isExpired) return;

      const supabase = supabaseRef.current;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        throw new Error('Failed to send message');
      }
    },
    [threadId, isExpired]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!threadId) return;

    const supabase = supabaseRef.current;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const myRole = profile?.role === 'vet' ? 'vet' : 'customer';
    const otherRole = myRole === 'vet' ? 'customer' : 'vet';

    // Mark messages from the other party as read
    await supabase
      .from('follow_up_messages')
      .update({ is_read: true })
      .eq('thread_id', threadId)
      .eq('sender_role', otherRole)
      .eq('is_read', false);

    // Update local state
    setMessages((prev) =>
      prev.map((msg) =>
        msg.senderRole === otherRole ? { ...msg, isRead: true } : msg
      )
    );
  }, [threadId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    threadId,
    threadExpiresAt,
    isExpired,
  };
}
