'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface UseVetDashboardRealtimeOptions {
  vetId: string;
  onConsultationChange: () => void;
}

interface NewConsultationPayload {
  consultationId: string;
  petName?: string;
  scheduledAt?: string;
}

/**
 * Hook for real-time updates on the vet dashboard.
 * Uses Supabase broadcast channel for notifications (avoids RLS issues with postgres_changes).
 * Also subscribes to postgres_changes for UPDATE events on already-visible consultations.
 */
export function useVetDashboardRealtime({
  vetId,
  onConsultationChange,
}: UseVetDashboardRealtimeOptions) {
  const { toast } = useToast();
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    type Channel = ReturnType<typeof supabase.channel>;
    let broadcastChannel: Channel | null = null;
    let changesChannel: Channel | null = null;

    // Subscribe to broadcast channel for consultation notifications
    // This bypasses RLS issues since broadcasts don't go through postgres.
    // Wrapped in try/catch so that environments where WebSockets are blocked
    // (e.g. Safari with a stale CSP, corporate proxies) degrade gracefully
    // instead of crashing the whole dashboard via the error boundary.
    try {
      broadcastChannel = supabase
        .channel(`vet:${vetId}:notifications`)
        .on('broadcast', { event: 'new_consultation' }, (payload) => {
          const data = payload.payload as NewConsultationPayload;
          // Prevent duplicate notifications for the same consultation
          if (data.consultationId && !seenIdsRef.current.has(data.consultationId)) {
            seenIdsRef.current.add(data.consultationId);
            const message = data.petName
              ? `New consultation for ${data.petName}`
              : 'New consultation assigned to you';
            toast(message, 'info');
          }
          onConsultationChange();
        })
        .on('broadcast', { event: 'consultation_updated' }, () => {
          // Trigger refresh when consultation status changes (e.g., payment completed)
          onConsultationChange();
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[vet-dashboard-realtime] broadcast channel ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('[vet-dashboard-realtime] failed to subscribe to broadcast channel', err);
    }

    // Also subscribe to postgres_changes for UPDATE events
    // These work because the vet already has SELECT access to their assigned consultations
    try {
      changesChannel = supabase
        .channel(`vet:${vetId}:dashboard-updates`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'consultations',
            filter: `vet_id=eq.${vetId}`,
          },
          () => {
            onConsultationChange();
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[vet-dashboard-realtime] postgres_changes channel ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('[vet-dashboard-realtime] failed to subscribe to postgres_changes channel', err);
    }

    return () => {
      try {
        if (broadcastChannel) supabase.removeChannel(broadcastChannel);
        if (changesChannel) supabase.removeChannel(changesChannel);
      } catch (err) {
        console.warn('[vet-dashboard-realtime] error during cleanup', err);
      }
    };
  }, [vetId, onConsultationChange, toast]);
}
