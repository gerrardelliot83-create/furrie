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

    // Subscribe to broadcast channel for new consultation notifications
    // This bypasses RLS issues since broadcasts don't go through postgres
    const broadcastChannel = supabase
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
      .subscribe();

    // Also subscribe to postgres_changes for UPDATE events
    // These work because the vet already has SELECT access to their assigned consultations
    const changesChannel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(changesChannel);
    };
  }, [vetId, onConsultationChange, toast]);
}
