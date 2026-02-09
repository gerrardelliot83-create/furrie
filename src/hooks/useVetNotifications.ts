'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface IncomingConsultationNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
  data: {
    consultationId: string;
    petName: string;
    petSpecies: string;
    petBreed: string;
    symptoms: string[];
    roomUrl: string;
    customerName?: string;
  };
}

interface UseVetNotificationsReturn {
  incomingNotification: IncomingConsultationNotification | null;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  dismissNotification: () => void;
}

/**
 * Hook for vet to receive real-time incoming consultation notifications.
 * Uses Supabase Broadcast for instant delivery (no Realtime publication config needed).
 * Also checks for existing unread notifications on mount.
 * Returns the most recent unread incoming notification.
 */
export function useVetNotifications(vetId: string | null): UseVetNotificationsReturn {
  const [incomingNotification, setIncomingNotification] = useState<IncomingConsultationNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // Fetch any existing unread incoming consultation notifications
  useEffect(() => {
    if (!vetId) {
      setIsLoading(false);
      return;
    }

    const fetchExistingNotifications = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = supabaseRef.current;

      try {
        // Get the most recent unread incoming_consultation notification
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', vetId)
          .eq('type', 'incoming_consultation')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching notifications:', fetchError);
          setError('Failed to fetch notifications');
          setIsLoading(false);
          return;
        }

        if (data) {
          // Check if notification is recent (within last 2 minutes)
          const createdAt = new Date(data.created_at);
          const now = new Date();
          const ageMs = now.getTime() - createdAt.getTime();
          const twoMinutesMs = 2 * 60 * 1000;

          if (ageMs < twoMinutesMs) {
            setIncomingNotification({
              id: data.id,
              userId: data.user_id,
              type: data.type,
              title: data.title,
              body: data.body,
              channel: data.channel,
              isRead: data.is_read,
              createdAt: data.created_at,
              data: data.data as IncomingConsultationNotification['data'],
            });
          } else {
            // Mark old notifications as read
            await supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('id', data.id);
          }
        }
      } catch (err) {
        console.error('Error in fetchExistingNotifications:', err);
        setError('Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingNotifications();
  }, [vetId]);

  // Subscribe to broadcast channel for real-time notifications
  // This uses Supabase Broadcast which doesn't require Realtime publication setup
  useEffect(() => {
    if (!vetId) return;

    const supabase = supabaseRef.current;

    // Subscribe to the vet's incoming consultation broadcast channel
    const channel = supabase
      .channel(`vet:${vetId}:incoming`)
      .on(
        'broadcast',
        { event: 'incoming_consultation' },
        (payload) => {
          console.log('Received broadcast notification:', payload);

          const notificationData = payload.payload as {
            id: string;
            type: string;
            title: string;
            body: string;
            data: IncomingConsultationNotification['data'];
            createdAt: string;
          };

          const notification: IncomingConsultationNotification = {
            id: notificationData.id,
            userId: vetId,
            type: notificationData.type,
            title: notificationData.title,
            body: notificationData.body,
            channel: 'in_app',
            isRead: false,
            createdAt: notificationData.createdAt,
            data: notificationData.data,
          };

          setIncomingNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log(`Vet broadcast subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vetId]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const supabase = supabaseRef.current;

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) {
        console.error('Error marking notification as read:', updateError);
      }

      // Clear the notification from state
      setIncomingNotification(null);
    },
    []
  );

  // Dismiss notification without marking as read (for timeout scenarios)
  const dismissNotification = useCallback(() => {
    setIncomingNotification(null);
  }, []);

  return {
    incomingNotification,
    isLoading,
    error,
    markAsRead,
    dismissNotification,
  };
}
